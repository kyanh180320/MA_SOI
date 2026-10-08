import type { Round } from "./types";

/**
 * Xử lý kết quả trong đêm (ai chết)
 */
export function resolveNight(round: Pick<Round, 'wolfTarget' | 'witchSaved' | 'witchPoisonTarget' | 'guardProtectTarget'>): string[] {
  const deaths = new Set<string>();

  if (round.wolfTarget && round.wolfTarget !== 'none') {
    const isProtected = round.guardProtectTarget === round.wolfTarget;
    if (!isProtected && !round.witchSaved) {
      deaths.add(round.wolfTarget);
    }
  }

  if (round.witchPoisonTarget && round.witchPoisonTarget !== 'none') {
    deaths.add(round.witchPoisonTarget); // Nếu bị cả độc cả cắn thì chỉ thêm vào set 1 lần
  }

  return Array.from(deaths);
}
