import { describe, expect, it } from 'vitest';
import { canDeleteGameHistory } from './historyAccess';
import type { AppUser } from './types';

function player(displayName: string, usernameKey?: string): AppUser {
  return { uid: 'player-id', displayName, usernameKey, email: '' };
}

describe('canDeleteGameHistory', () => {
  it('chỉ cấp quyền cho username chuẩn hóa kyanh', () => {
    expect(canDeleteGameHistory(player('Kỳ Anh', 'kyanh'))).toBe(true);
    expect(canDeleteGameHistory(player('kyanh'))).toBe(true);
    expect(canDeleteGameHistory(player('Người khác', 'nguoi-khac'))).toBe(false);
    expect(canDeleteGameHistory(null)).toBe(false);
  });

  it('không nhầm tên gần giống thành tài khoản quản lý', () => {
    expect(canDeleteGameHistory(player('kyanh 2'))).toBe(false);
    expect(canDeleteGameHistory(player('ky-anh'))).toBe(false);
  });
});
