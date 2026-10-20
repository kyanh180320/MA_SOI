/**
 * Offline setup luôn được phép. Với phòng online, chỉ host đã xác thực mới
 * được thay đổi cấu hình hoặc bắt đầu ván; tránh thao tác khi auth còn tải.
 */
export function canManageGameSetup(
  roomHostUid?: string,
  userUid?: string,
  authLoading = false,
): boolean {
  if (!roomHostUid) return true;
  return !authLoading && userUid === roomHostUid;
}
