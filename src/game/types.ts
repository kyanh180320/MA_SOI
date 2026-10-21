export type Role = "wolf" | "wolf_demon" | "wolf_seer" | "villager" | "seer" | "detective" | "witch" | "guard" | "hunter";
export type RoleDistribution = Record<Role, number>;
export type NightRoleStep = Exclude<Role, "villager" | "wolf_demon">;
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
  wolfSeerChecks?: Record<string, WolfSeerCheck>; // Id Sói Tiên Tri -> kết quả soi chức năng
  seerCheck?: { target: string; isWolf: boolean };
  detectiveChecks?: Record<string, DetectiveCheck>; // Id Thám tử -> kết quả soi nhóm trong vòng
  witchSaved?: boolean;                // Cứu nạn nhân (boolean)
  witchSavedTarget?: string;           // Id người cụ thể được cứu nếu có nhiều người bị cắn
  witchPoisonTarget?: string;          // Id người bị đầu độc
  hunterTargets?: Record<string, string>;     // Id Thợ săn -> người đã chọn chết cùng trong vòng
  hunterShotTarget?: string;           // Id người bị thợ săn bắn chết
  hunterShotTargets?: Record<string, string>; // Id Thợ săn -> người thực tế bị bắn (hỗ trợ nhiều Thợ săn)
  skippedDeadRoleSteps?: NightRoleStep[];     // Role đã chết được Quản trò gọi giả và chủ động cho qua
  nightDeaths: string[];               // Id những người chết trong đêm
  vote?: {
    tally: Record<string, number>;     // Id -> số phiếu
    eliminated?: string;               // Id bị loại, undefined nếu hòa
  };
}

export interface DetectiveCheck {
  targets: string[];
  hasWolf: boolean;
  /** Vòng bị khóa vẫn cần một thao tác xác nhận để thanh gọi vai không tự nhảy. */
  locked?: boolean;
}

export interface WolfSeerCheck {
  target: string;
  hasAbility: boolean;
}

export interface GameRoleSettings {
  detective: {
    lockNextRoundAfterClearCheck: boolean;
  };
}

export interface Game {
  id: string;
  createdAt: number;
  /** Thứ tự kế nhiệm cố định của bầy Sói; phần tử cuối còn sống là đầu đàn. */
  wolfLeadershipOrder?: string[];
  /** Optional để ván cũ chưa có cấu hình vẫn dùng thứ tự gọi mặc định. */
  nightRoleOrder?: NightRoleStep[];
  /** Optional để ván cũ tự dùng luật mặc định. */
  roleSettings?: GameRoleSettings;
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
  wolfSeerChecks?: Record<string, WolfSeerCheck>;
  seerCheck?: { target: string; isWolf: boolean };
  detectiveChecks?: Record<string, DetectiveCheck>;
  witchSaved?: boolean;
  witchSavedTarget?: string;
  witchPoisonTarget?: string;
  witchItems?: Game['witchItems'];
  hunterTargets?: Record<string, string>;
  skippedDeadRoleSteps?: NightRoleStep[];
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

/** Cấu hình vai đang chờ Quản trò bắt đầu, tách khỏi dữ liệu của ván đã chạy. */
export interface RoomSetupConfig {
  playerCount: number;
  distribution: RoleDistribution;
  updatedAt: number;
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
  /** Optional để các phòng cũ chưa có cấu hình vẫn tự cân bằng như trước. */
  setupConfig?: RoomSetupConfig;
  liveNightActions?: LiveNightActions;
  /** Trạng thái cục bộ từ Firestore metadata, không được ghi lên server. */
  syncState?: "synced" | "syncing" | "offline";
}
