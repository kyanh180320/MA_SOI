import type { Game } from './types';

export const MAX_GAME_HISTORY_ENTRIES = 50;

/**
 * Giữ đủ lịch sử cho Undo nhưng không để một ván dài giữ state vô hạn trong RAM.
 * Updater idempotent trả lại đúng object hiện tại sẽ không tạo thêm một bản ghi.
 */
export function appendGameHistory(
  history: Game[],
  next: Game,
  limit = MAX_GAME_HISTORY_ENTRIES,
): Game[] {
  if (history[history.length - 1] === next) return history;

  const start = Math.max(0, history.length - Math.max(1, limit) + 1);
  return [...history.slice(start), next];
}
