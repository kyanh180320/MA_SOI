import type { Player, Role, WolfSeerCheck } from './types';
import { isWolfAligned } from './win';

/** Dân Làng là vai duy nhất không có chức năng đặc biệt. */
export function hasSpecialAbility(role: Role): boolean {
  return role !== 'villager' && role !== 'half_wolf';
}

/**
 * Sói Tiên Tri chỉ được soi người còn sống ngoài phe Sói. Trả về null nếu
 * client gửi mục tiêu cũ hoặc không hợp lệ sau khi vòng/người chơi đã đổi.
 */
export function createWolfSeerCheck(
  players: Player[],
  targetId: string,
): WolfSeerCheck | null {
  const target = players.find(player => player.id === targetId && player.alive);
  if (!target || isWolfAligned(target)) return null;

  return {
    target: target.id,
    hasAbility: hasSpecialAbility(target.role),
  };
}
