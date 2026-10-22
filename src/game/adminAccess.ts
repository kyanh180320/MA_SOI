import type { AppUser } from './types';
import { normalizeUsername } from './username';

const CLEANUP_MANAGER_USERNAME = 'kyanh';

/** Quyền dọn dữ liệu test của nhóm nội bộ; không phải ranh giới bảo mật. */
export function isCleanupManager(user?: AppUser | null): boolean {
  if (!user) return false;
  const usernameKey = user.usernameKey || normalizeUsername(user.displayName);
  return usernameKey === CLEANUP_MANAGER_USERNAME;
}

/** Quyền gán vai thủ công để test game; chỉ là feature gate cho nhóm nội bộ. */
export function canUseRoleAssignmentCheat(user?: AppUser | null): boolean {
  return isCleanupManager(user);
}
