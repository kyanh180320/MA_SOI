import type { Player } from './types';
import { isWolfTeam } from './win';

export function createWolfLeadershipOrder(players: readonly Player[]): string[] {
  return players.filter(player => isWolfTeam(player.role)).map(player => player.id);
}

/**
 * Giữ nguyên thứ tự đã lưu, loại ID hỏng/trùng và nối thêm Sói còn thiếu để
 * dữ liệu ván cũ hoặc schema cũ vẫn có một danh sách kế nhiệm đầy đủ.
 */
export function normalizeWolfLeadershipOrder(
  players: readonly Player[],
  storedOrder?: readonly string[],
): string[] {
  const wolfIds = new Set(createWolfLeadershipOrder(players));
  const seen = new Set<string>();
  const normalized = (storedOrder ?? []).filter(id => {
    if (!wolfIds.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  for (const player of players) {
    if (wolfIds.has(player.id) && !seen.has(player.id)) {
      normalized.push(player.id);
      seen.add(player.id);
    }
  }

  return normalized;
}

/** Không mutate/pop danh sách: chỉ suy ra Sói cuối cùng còn sống. */
export function getWolfLeaderId(
  players: readonly Player[],
  storedOrder?: readonly string[],
): string | undefined {
  const aliveWolfIds = new Set(
    players.filter(player => player.alive && isWolfTeam(player.role)).map(player => player.id),
  );
  const order = normalizeWolfLeadershipOrder(players, storedOrder);

  for (let index = order.length - 1; index >= 0; index -= 1) {
    if (aliveWolfIds.has(order[index])) return order[index];
  }
  return undefined;
}
