import type { AppUser } from './types';
import { normalizeUsername } from './username';

const HISTORY_MANAGER_USERNAME = 'kyanh';

/** Quyền dọn dữ liệu test cho nhóm nội bộ; không phải ranh giới bảo mật. */
export function canDeleteGameHistory(user?: AppUser | null): boolean {
  if (!user) return false;
  const usernameKey = user.usernameKey || normalizeUsername(user.displayName);
  return usernameKey === HISTORY_MANAGER_USERNAME;
}
