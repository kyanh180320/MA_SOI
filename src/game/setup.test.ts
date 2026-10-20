import { describe, expect, it } from 'vitest';
import { canManageGameSetup } from './setup';

describe('canManageGameSetup', () => {
  it('allows offline setup without an authenticated host', () => {
    expect(canManageGameSetup()).toBe(true);
  });

  it('allows only the matching room host for online setup', () => {
    expect(canManageGameSetup('host-1', 'host-1')).toBe(true);
    expect(canManageGameSetup('host-1', 'player-2')).toBe(false);
    expect(canManageGameSetup('host-1')).toBe(false);
  });

  it('does not enable online start while authentication is loading', () => {
    expect(canManageGameSetup('host-1', 'host-1', true)).toBe(false);
  });
});
