import type { AppUser } from './types';
import { isCleanupManager } from './adminAccess';

/** Quyền dọn dữ liệu test cho nhóm nội bộ; không phải ranh giới bảo mật. */
export function canDeleteGameHistory(user?: AppUser | null): boolean {
  return isCleanupManager(user);
}
