import { describe, expect, it } from 'vitest';
import { normalizeBotMemberAvatars, pickAvailableAvatar } from './avatarPool';

describe('pickAvailableAvatar', () => {
  const pool = ['/a.webp', '/b.webp', '/c.webp'];

  it('selects the first portrait not already used in the room', () => {
    expect(pickAvailableAvatar(pool, new Set(['/a.webp', '/b.webp']))).toBe('/c.webp');
  });

  it('cycles deterministically after every portrait is in use', () => {
    expect(pickAvailableAvatar(pool, new Set(pool), 4)).toBe('/b.webp');
  });

  it('handles an empty pool without creating an invalid URL', () => {
    expect(pickAvailableAvatar([], new Set())).toBe('');
  });
});

describe('normalizeBotMemberAvatars', () => {
  it('replaces legacy robot images with distinct local portraits', () => {
    const members = normalizeBotMemberAvatars([
      { uid: 'host', displayName: 'Host', isHost: true, avatar: '/custom.webp', joinedAt: 1 },
      { uid: 'bot-1', displayName: 'Bot 1', isHost: false, isBot: true, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=1', joinedAt: 2 },
      { uid: 'bot-2', displayName: 'Bot 2', isHost: false, isBot: true, joinedAt: 3 },
    ], ['/a.webp', '/b.webp']);

    expect(members.map(member => member.avatar)).toEqual(['/custom.webp', '/a.webp', '/b.webp']);
  });

  it('preserves uploaded and already migrated bot portraits', () => {
    const members = normalizeBotMemberAvatars([
      { uid: 'bot', displayName: 'Bot', isHost: false, isBot: true, avatar: '/custom-bot.webp', joinedAt: 1 },
    ], ['/a.webp']);

    expect(members[0].avatar).toBe('/custom-bot.webp');
  });
});
