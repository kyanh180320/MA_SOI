import { describe, expect, it } from 'vitest';
import { isExpectedGameReady } from './playEntry';

describe('moderator play entry', () => {
  it('does not render a stale previous game during navigation', () => {
    expect(isExpectedGameReady({ id: 'old-game' }, 'new-game')).toBe(false);
    expect(isExpectedGameReady({ id: 'new-game' }, 'new-game')).toBe(true);
  });

  it('keeps direct reload and legacy navigation compatible', () => {
    expect(isExpectedGameReady({ id: 'restored-game' })).toBe(true);
    expect(isExpectedGameReady(null)).toBe(false);
  });
});
