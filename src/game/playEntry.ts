import type { Game } from './types';

/**
 * Khi chuyển từ phòng chờ/cấu hình sang bàn Quản trò, không render game cũ
 * trong lúc state của router và GameContext đang hoàn tất cùng một transition.
 */
export function isExpectedGameReady(
  game: Pick<Game, 'id'> | null,
  expectedGameId?: string,
): boolean {
  return Boolean(game && (!expectedGameId || game.id === expectedGameId));
}
