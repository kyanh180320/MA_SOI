import type { Player, Role } from "./types";

export const isWolfTeam = (role: Role): boolean => role === "wolf" || role === "wolf_demon";

/**
 * Kiểm tra điều kiện thắng
 */
export function checkWinner(players: Player[]): "wolf" | "villager" | undefined {
  const alivePlayers = players.filter(p => p.alive);
  const aliveWolves = alivePlayers.filter(p => isWolfTeam(p.role)).length;
  const aliveOthers = alivePlayers.length - aliveWolves;

  if (aliveWolves === 0) return "villager";
  if (aliveWolves >= aliveOthers) return "wolf";
  
  return undefined; // Chưa ai thắng
}
