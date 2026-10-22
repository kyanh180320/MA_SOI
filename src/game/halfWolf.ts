import type { Player, Round } from './types';
import { getSuccessfulWolfBiteTargets } from './night';
import { isWolfAligned } from './win';

/** Bán Sói chỉ chuyển hóa khi cú cắn không bị Bảo Vệ hoặc Phù Thủy vô hiệu. */
export function getHalfWolfConversionIds(round: Round, players: readonly Player[]): string[] {
  return getSuccessfulWolfBiteTargets(round, players)
    .filter(playerId => {
      const player = players.find(candidate => candidate.id === playerId);
      return player?.alive
        && player.role === 'half_wolf'
        && !isWolfAligned(player)
        && round.witchPoisonTarget !== playerId;
    });
}

/**
 * Thêm Bán Sói mới vào đầu danh sách để không cướp vị trí đầu đàn hiện tại.
 * Hệ thống lấy Sói còn sống cuối danh sách làm đầu đàn.
 */
export function prependConvertedWolves(
  currentOrder: readonly string[] | undefined,
  convertedIds: readonly string[],
): string[] {
  const converted = [...new Set(convertedIds)];
  const convertedSet = new Set(converted);
  return [...converted, ...(currentOrder ?? []).filter(id => !convertedSet.has(id))];
}
