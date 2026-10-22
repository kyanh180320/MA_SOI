/**
 * Cập nhật lựa chọn con mồi mà không buộc người chơi phải bỏ chọn trước.
 * Khi đã đủ giới hạn, mục tiêu mới thay mục tiêu được chọn lâu nhất.
 */
export function toggleWolfTargetSelection(
  currentTargetIds: readonly string[],
  targetId: string,
  targetLimit: number,
): string[] {
  const limit = Math.max(1, Math.floor(targetLimit));
  const normalizedTargets = [...new Set(currentTargetIds)].slice(-limit);

  if (normalizedTargets.includes(targetId)) {
    return normalizedTargets.filter(id => id !== targetId);
  }

  if (limit === 1) return [targetId];
  if (normalizedTargets.length < limit) return [...normalizedTargets, targetId];
  return [...normalizedTargets.slice(1), targetId];
}
