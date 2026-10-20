export const DEFAULT_DISCUSSION_MINUTES = 5;
export const MIN_DISCUSSION_MINUTES = 1;
export const MAX_DISCUSSION_MINUTES = 30;

export function sanitizeDiscussionMinutes(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DISCUSSION_MINUTES;
  return Math.min(
    MAX_DISCUSSION_MINUTES,
    Math.max(MIN_DISCUSSION_MINUTES, Math.round(value)),
  );
}

export function getRemainingSeconds(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function formatDiscussionTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
