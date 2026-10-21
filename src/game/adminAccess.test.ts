import { describe, expect, it } from 'vitest';
import { isCleanupManager } from './adminAccess';
import type { AppUser } from './types';

function player(displayName: string, usernameKey?: string): AppUser {
  return { uid: 'player-id', displayName, usernameKey, email: '' };
}

describe('isCleanupManager', () => {
  it('grants cleanup access only to the normalized kyanh username', () => {
    expect(isCleanupManager(player('Kỳ Anh', 'kyanh'))).toBe(true);
    expect(isCleanupManager(player('kyanh'))).toBe(true);
    expect(isCleanupManager(player('Người khác', 'nguoi-khac'))).toBe(false);
    expect(isCleanupManager(null)).toBe(false);
  });

  it('does not accept similar usernames', () => {
    expect(isCleanupManager(player('kyanh 2'))).toBe(false);
    expect(isCleanupManager(player('ky-anh'))).toBe(false);
  });
});
