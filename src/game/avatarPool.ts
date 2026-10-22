import type { RoomMember } from './types';

/** Ưu tiên gương mặt chưa xuất hiện trong phòng; khi hết pool thì xoay vòng ổn định. */
export function pickAvailableAvatar(
  avatarUrls: readonly string[],
  usedAvatarUrls: ReadonlySet<string>,
  fallbackIndex = 0,
): string {
  if (avatarUrls.length === 0) return '';
  return avatarUrls.find(url => !usedAvatarUrls.has(url))
    ?? avatarUrls[Math.abs(fallbackIndex) % avatarUrls.length];
}

function needsDefaultBotAvatar(member: RoomMember): boolean {
  return Boolean(member.isBot && (!member.avatar || member.avatar.includes('api.dicebear.com')));
}

/** Phòng cũ dùng DiceBear được nâng cấp khi đọc, không cần migration Firestore bắt buộc. */
export function normalizeBotMemberAvatars(
  members: readonly RoomMember[],
  avatarUrls: readonly string[],
): RoomMember[] {
  const usedAvatarUrls = new Set(
    members
      .filter(member => !needsDefaultBotAvatar(member))
      .map(member => member.avatar)
      .filter((avatar): avatar is string => Boolean(avatar)),
  );
  let fallbackIndex = 0;

  return members.map(member => {
    if (!needsDefaultBotAvatar(member)) return member;
    const avatar = pickAvailableAvatar(avatarUrls, usedAvatarUrls, fallbackIndex);
    fallbackIndex += 1;
    if (avatar) usedAvatarUrls.add(avatar);
    return { ...member, avatar };
  });
}
