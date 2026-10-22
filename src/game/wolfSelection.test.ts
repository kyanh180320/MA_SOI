import { describe, expect, it } from 'vitest';
import { toggleWolfTargetSelection } from './wolfSelection';

describe('toggleWolfTargetSelection', () => {
  it('replaces the previous target immediately when only one bite is allowed', () => {
    expect(toggleWolfTargetSelection(['player-a'], 'player-b', 1)).toEqual(['player-b']);
  });

  it('replaces the oldest target when the demon-wolf limit is already full', () => {
    expect(toggleWolfTargetSelection(['player-a', 'player-b'], 'player-c', 2)).toEqual([
      'player-b',
      'player-c',
    ]);
  });

  it('keeps click-again behavior for removing a selected target', () => {
    expect(toggleWolfTargetSelection(['player-a', 'player-b'], 'player-a', 2)).toEqual(['player-b']);
  });
});
