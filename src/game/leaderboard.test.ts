import { describe, expect, it } from "vitest";
import {
  buildLeaderboard,
  createLeaderboardGameSummary,
  mergeLeaderboardSummaries,
} from "./leaderboard";
import type { Game, LeaderboardGameSummary, Player } from "./types";

function player(id: string, name: string, role: Player["role"], alive = true): Player {
  return { id, name, role, alive };
}

function game(overrides: Partial<Game> = {}): Game {
  return {
    id: "game-1",
    createdAt: 100,
    players: [],
    rounds: [],
    phase: "ended",
    witchItems: { saveLeft: 0, poisonLeft: 0 },
    winner: "villager",
    ...overrides,
  };
}

describe("leaderboard", () => {
  it("tính chiến thắng theo phe, kể cả người đã chết, và bỏ qua bot", () => {
    const summary = createLeaderboardGameSummary(game({
      roomId: "room-1",
      players: [
        player("uid-seer", "Lan", "seer", false),
        player("uid-wolf", "Minh", "wolf"),
        player("bot_1", "Bot", "villager"),
      ],
    }));

    expect(summary?.players).toEqual([
      expect.objectContaining({ playerKey: "uid:uid-seer", won: true, team: "villager" }),
      expect.objectContaining({ playerKey: "uid:uid-wolf", won: false, team: "wolf" }),
    ]);
  });

  it("dùng tên chuẩn hoá cho ván local và không lưu avatar base64", () => {
    const summary = createLeaderboardGameSummary(game({
      players: [{
        ...player("p_1", "  Bảo   An  ", "villager"),
        avatar: "data:image/png;base64,abc",
      }],
    }));
    if (!summary) throw new Error("Expected a leaderboard summary");

    expect(summary.players[0]).toEqual({
      playerKey: "name:bảo an",
      displayName: "Bảo   An",
      team: "villager",
      won: true,
    });
  });

  it("không tạo bản ghi cho ván chưa kết thúc", () => {
    expect(createLeaderboardGameSummary(game({ phase: "night", winner: undefined }))).toBeNull();
  });

  it("không tính trùng một gameId và xếp theo số trận thắng rồi tỷ lệ thắng", () => {
    const summaries: LeaderboardGameSummary[] = [
      {
        gameId: "g1",
        createdAt: 100,
        winner: "villager",
        players: [
          { playerKey: "uid:a", displayName: "An", team: "villager", won: true },
          { playerKey: "uid:b", displayName: "Bình", team: "wolf", won: false },
        ],
      },
      {
        gameId: "g2",
        createdAt: 200,
        winner: "wolf",
        players: [
          { playerKey: "uid:a", displayName: "An mới", team: "villager", won: false },
          { playerKey: "uid:b", displayName: "Bình", team: "wolf", won: true },
        ],
      },
      {
        gameId: "g3",
        createdAt: 300,
        winner: "wolf",
        players: [
          { playerKey: "uid:b", displayName: "Bình", team: "wolf", won: true },
        ],
      },
    ];

    const entries = buildLeaderboard([...summaries, summaries[0]]);

    expect(entries.map(entry => entry.displayName)).toEqual(["Bình", "An mới"]);
    expect(entries[0]).toMatchObject({ wins: 2, gamesPlayed: 3, wolfWins: 2, villagerWins: 0 });
    expect(entries[1]).toMatchObject({ wins: 1, gamesPlayed: 2, wolfWins: 0, villagerWins: 1 });
  });

  it("gộp cloud và local theo gameId", () => {
    const first = createLeaderboardGameSummary(game());
    const second = createLeaderboardGameSummary(game({ id: "game-2", createdAt: 200 }));
    if (!first || !second) throw new Error("Expected leaderboard summaries");

    expect(mergeLeaderboardSummaries([first], [first, second]).map(item => item.gameId))
      .toEqual(["game-2", "game-1"]);
  });
});
