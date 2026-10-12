import type { Player, Round } from "./types";
import { isWolfTeam } from "./win";

/**
 * Xử lý kết quả trong đêm (ai chết)
 */
export function resolveNight(
  round: Partial<Pick<Round, 'wolfTarget' | 'wolfTargets' | 'witchSaved' | 'witchSavedTarget' | 'witchPoisonTarget' | 'guardProtectTarget'>>,
  players?: Player[]
): string[] {
  const deaths = new Set<string>();

  // Thu thập danh sách người bị sói cắn
  const wolfBites: string[] = [];
  if (round.wolfTargets && round.wolfTargets.length > 0) {
    for (const target of round.wolfTargets) {
      if (target && target !== 'none' && !wolfBites.includes(target)) {
        if (players) {
          const targetPlayer = players.find(p => p.id === target);
          if (targetPlayer && isWolfTeam(targetPlayer.role)) {
            continue;
          }
        }
        wolfBites.push(target);
      }
    }
  } else if (round.wolfTarget && round.wolfTarget !== 'none') {
    let isValid = true;
    if (players) {
      const targetPlayer = players.find(p => p.id === round.wolfTarget);
      if (targetPlayer && isWolfTeam(targetPlayer.role)) {
        isValid = false;
      }
    }
    if (isValid) {
      wolfBites.push(round.wolfTarget);
    }
  }

  // Xét từng người bị cắn
  for (const victimId of wolfBites) {
    const isProtected = round.guardProtectTarget === victimId;
    const isSaved = round.witchSavedTarget ? round.witchSavedTarget === victimId : (round.witchSaved && wolfBites.length <= 1);
    if (!isProtected && !isSaved) {
      deaths.add(victimId);
    }
  }

  // Phù thủy đầu độc
  if (round.witchPoisonTarget && round.witchPoisonTarget !== 'none') {
    let canPoison = true;
    if (players) {
      const poisonVictim = players.find(p => p.id === round.witchPoisonTarget);
      if (poisonVictim && poisonVictim.role === 'witch') {
        canPoison = false;
      }
    }
    if (canPoison) {
      deaths.add(round.witchPoisonTarget);
    }
  }

  return Array.from(deaths);
}
