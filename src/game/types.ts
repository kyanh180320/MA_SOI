export type Role = "wolf" | "villager" | "seer" | "witch" | "guard";
export type Phase = "setup" | "night" | "day" | "vote" | "ended";

export interface Player {
  id: string;
  name: string;
  role: Role;
  alive: boolean;
}

export interface Round {
  number: number;
  guardProtectTarget?: string;
  wolfTarget?: string;
  seerCheck?: { target: string; isWolf: boolean };
  witchSaved?: boolean;
  witchPoisonTarget?: string;
  nightDeaths: string[];                 // id người chết trong đêm
  vote?: {
    tally: Record<string, number>;       // id -> số phiếu
    eliminated?: string;                 // id bị loại, undefined nếu hòa
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
}

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  role: "admin" | "user";
}

export interface PresetName {
  id: string;
  name: string;
}
