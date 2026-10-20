export type Role = "wolf" | "wolf_demon" | "villager" | "seer" | "witch" | "guard" | "hunter";
export type Phase = "setup" | "night" | "day" | "vote" | "ended";
export type WinningTeam = "wolf" | "villager";

export interface Player {
  id: string;
  name: string;
  role: Role;
  alive: boolean;
  avatar?: string;
}

export interface Round {
  number: number;
  guardProtectTarget?: string;
  wolfTarget?: string;                 // Tương thích ngược (1 mục tiêu)
  wolfTargets?: string[];              // Danh sách mục tiêu sói cắn (hỗ trợ sói quỷ cắn 2 người)
  wolfVotes?: Record<string, string[]>; // Id từng con sói -> mục tiêu đang vote cắn
  seerCheck?: { target: string; isWolf: boolean };
  witchSaved?: boolean;                // Cứu nạn nhân (boolean)
  witchSavedTarget?: string;           // Id người cụ thể được cứu nếu có nhiều người bị cắn
  witchPoisonTarget?: string;          // Id người bị đầu độc
  hunterShotTarget?: string;           // Id người bị thợ săn bắn chết
  nightDeaths: string[];               // Id những người chết trong đêm
  vote?: {
    tally: Record<string, number>;     // Id -> số phiếu
    eliminated?: string;               // Id bị loại, undefined nếu hòa
  };
}

export interface Game {
  id: string;
  createdAt: number;
  players: Player[];
  rounds: Round[];
  phase: Phase;
  witchItems: { saveLeft: number; poisonLeft: number };
  winner?: WinningTeam;
  roomId?: string;
}

/** Bản ghi nhỏ, bất biến theo gameId, dùng làm nguồn dữ liệu cho bảng xếp hạng. */
export interface LeaderboardGameSummary {
  gameId: string;
  createdAt: number;
  winner: WinningTeam;
  players: LeaderboardGamePlayer[];
}

export interface LeaderboardGamePlayer {
  playerKey: string;
  displayName: string;
  avatar?: string;
  team: WinningTeam;
  won: boolean;
}

export interface LeaderboardEntry {
  playerKey: string;
  displayName: string;
  avatar?: string;
  wins: number;
  gamesPlayed: number;
  villagerWins: number;
  wolfWins: number;
  lastPlayedAt: number;
}

/**
 * Các thao tác ban đêm đang chờ Quản trò xử lý.
 *
 * Tách khỏi gameData để mỗi lần người chơi bấm trên điện thoại chỉ phải
 * ghi một payload rất nhỏ, thay vì transaction toàn bộ ván chơi.
 */
export interface LiveNightActions {
  gameId: string;
  roundNumber: number;
  guardProtectTarget?: string;
  wolfTarget?: string;
  wolfTargets?: string[];
  wolfVotes?: Record<string, string[]>;
  seerCheck?: { target: string; isWolf: boolean };
  witchSaved?: boolean;
  witchSavedTarget?: string;
  witchPoisonTarget?: string;
  witchItems?: Game['witchItems'];
}

export interface AppUser {
  /** Danh tính ổn định của người chơi, không đổi khi dùng trình duyệt khác. */
  uid: string;
  displayName: string;
  email: string;
  usernameKey?: string;
  role?: "admin" | "user";
  avatar?: string;
  photoURL?: string;
}

export interface PresetName {
  id: string;
  name: string;
}

export interface RoomMember {
  uid: string;
  displayName: string;
  avatar?: string;
  isHost: boolean;
  isBot?: boolean;
  joinedAt: number;
}

export interface GameRoom {
  id: string;
  name: string;
  hostUid: string;
  hostName: string;
  hostAvatar?: string;
  maxPlayers: number;
  status: "waiting" | "setup" | "playing" | "ended";
  members: RoomMember[];
  createdAt: number;
  gameId?: string;
  gameData?: Game;
  liveNightActions?: LiveNightActions;
  /** Trạng thái cục bộ từ Firestore metadata, không được ghi lên server. */
  syncState?: "synced" | "syncing" | "offline";
}
