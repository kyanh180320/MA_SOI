export type Role = "wolf" | "wolf_demon" | "villager" | "seer" | "witch" | "guard" | "hunter";
export type Phase = "setup" | "night" | "day" | "vote" | "ended";

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
  winner?: "wolf" | "villager";
  roomId?: string;
}

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
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
}
