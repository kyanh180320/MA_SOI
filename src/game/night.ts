import type { Round } from "./types";

/**
 * Xử lý kết quả trong đêm (ai chết)
 */
export function resolveNight(round: Partial<Pick<Round, 'wolfTarget' | 'wolfTargets' | 'witchSaved' | 'witchSavedTarget' | 'witchPoisonTarget' | 'guardProtectTarget'>>): string[] {
  const deaths = new Set<string>();

  // Thu thập danh sách người bị sói cắn
  const wolfBites: string[] = [];
  if (round.wolfTargets && round.wolfTargets.length > 0) {
    for (const target of round.wolfTargets) {
      if (target && target !== 'none' && !wolfBites.includes(target)) {
        wolfBites.push(target);
      }
    }
  } else if (round.wolfTarget && round.wolfTarget !== 'none') {
    wolfBites.push(round.wolfTarget);
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
    deaths.add(round.witchPoisonTarget);
  }

  return Array.from(deaths);
}
