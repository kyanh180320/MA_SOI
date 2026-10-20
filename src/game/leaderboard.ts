import type {
  Game,
  LeaderboardEntry,
  LeaderboardGamePlayer,
  LeaderboardGameSummary,
  Player,
  WinningTeam,
} from "./types";
import { isWolfTeam } from "./win";

const BOT_ID_PREFIX = "bot_";

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi-VN");
}

function getRemoteAvatar(avatar?: string): string | undefined {
  if (!avatar) return undefined;
  return /^https?:\/\//i.test(avatar) ? avatar : undefined;
}

function getPlayerKey(player: Player, isOnlineGame: boolean): string {
  if (isOnlineGame) return `uid:${player.id}`;
  return `name:${normalizeName(player.name)}`;
}

function getPlayerTeam(player: Player): WinningTeam {
  return isWolfTeam(player.role) ? "wolf" : "villager";
}

function createSummaryPlayer(
  player: Player,
  winner: WinningTeam,
  isOnlineGame: boolean,
): LeaderboardGamePlayer {
  const team = getPlayerTeam(player);
  const avatar = getRemoteAvatar(player.avatar);
  return {
    playerKey: getPlayerKey(player, isOnlineGame),
    displayName: player.name.trim(),
    ...(avatar ? { avatar } : {}),
    team,
    won: team === winner,
  };
}

/**
 * Chuyển một ván đã kết thúc thành payload nhỏ cho BXH.
 * Ván online dùng UID; ván tại chỗ dùng tên đã chuẩn hoá vì player id chỉ sống trong một ván.
 */
export function createLeaderboardGameSummary(game: Game): LeaderboardGameSummary | null {
  if (game.phase !== "ended" || !game.winner || !Array.isArray(game.players)) return null;

  const uniquePlayers = new Map<string, LeaderboardGamePlayer>();
  for (const player of game.players) {
    if (player.id.startsWith(BOT_ID_PREFIX) || !player.name.trim()) continue;
    const summaryPlayer = createSummaryPlayer(player, game.winner, Boolean(game.roomId));
    if (!uniquePlayers.has(summaryPlayer.playerKey)) {
      uniquePlayers.set(summaryPlayer.playerKey, summaryPlayer);
    }
  }

  return {
    gameId: game.id,
    createdAt: game.createdAt,
    winner: game.winner,
    players: [...uniquePlayers.values()],
  };
}

/** Gộp dữ liệu cloud và local; một gameId luôn chỉ được tính đúng một lần. */
export function mergeLeaderboardSummaries(
  ...groups: LeaderboardGameSummary[][]
): LeaderboardGameSummary[] {
  const byGameId = new Map<string, LeaderboardGameSummary>();
  for (const group of groups) {
    for (const summary of group) {
      if (!byGameId.has(summary.gameId)) byGameId.set(summary.gameId, summary);
    }
  }
  return [...byGameId.values()].sort((a, b) => b.createdAt - a.createdAt);
}

/** Tổng hợp BXH. Chỉ người từng thắng mới xuất hiện, nhưng số trận gồm mọi ván họ tham gia. */
export function buildLeaderboard(summaries: LeaderboardGameSummary[]): LeaderboardEntry[] {
  const entries = new Map<string, LeaderboardEntry>();

  for (const summary of mergeLeaderboardSummaries(summaries)) {
    const playersSeenInGame = new Set<string>();
    for (const player of summary.players) {
      if (playersSeenInGame.has(player.playerKey)) continue;
      playersSeenInGame.add(player.playerKey);

      const current = entries.get(player.playerKey);
      const wins = (current?.wins ?? 0) + (player.won ? 1 : 0);
      const next: LeaderboardEntry = {
        playerKey: player.playerKey,
        displayName: current && current.lastPlayedAt > summary.createdAt
          ? current.displayName
          : player.displayName,
        avatar: current && current.lastPlayedAt > summary.createdAt
          ? current.avatar
          : (player.avatar ?? current?.avatar),
        wins,
        gamesPlayed: (current?.gamesPlayed ?? 0) + 1,
        villagerWins: (current?.villagerWins ?? 0) + (player.won && player.team === "villager" ? 1 : 0),
        wolfWins: (current?.wolfWins ?? 0) + (player.won && player.team === "wolf" ? 1 : 0),
        lastPlayedAt: Math.max(current?.lastPlayedAt ?? 0, summary.createdAt),
      };
      entries.set(player.playerKey, next);
    }
  }

  return [...entries.values()]
    .filter(entry => entry.wins > 0)
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      const aRate = a.wins / a.gamesPlayed;
      const bRate = b.wins / b.gamesPlayed;
      if (bRate !== aRate) return bRate - aRate;
      if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
      return a.displayName.localeCompare(b.displayName, "vi");
    });
}

export function createLocalLeaderboardSummaries(games: Game[]): LeaderboardGameSummary[] {
  return games
    .map(createLeaderboardGameSummary)
    .filter((summary): summary is LeaderboardGameSummary => summary !== null);
}
