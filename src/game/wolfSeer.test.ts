import { describe, expect, it } from 'vitest';
import type { Player } from './types';
import { createWolfSeerCheck, hasSpecialAbility } from './wolfSeer';

const players: Player[] = [
  { id: 'ws1', name: 'Wolf Seer', role: 'wolf_seer', alive: true },
  { id: 'w1', name: 'Wolf', role: 'wolf', alive: true },
  { id: 'v1', name: 'Villager', role: 'villager', alive: true },
  { id: 's1', name: 'Seer', role: 'seer', alive: true },
  { id: 'h1', name: 'Hunter', role: 'hunter', alive: false },
];

describe('wolf seer role', () => {
  it('reports no ability for a living villager', () => {
    expect(createWolfSeerCheck(players, 'v1')).toEqual({
      target: 'v1',
      hasAbility: false,
    });
  });

  it('reports an ability for a special villager-team role', () => {
    expect(createWolfSeerCheck(players, 's1')).toEqual({
      target: 's1',
      hasAbility: true,
    });
    expect(hasSpecialAbility('detective')).toBe(true);
    expect(hasSpecialAbility('villager')).toBe(false);
  });

  it('rejects every wolf-team target and a dead target', () => {
    expect(createWolfSeerCheck(players, 'ws1')).toBeNull();
    expect(createWolfSeerCheck(players, 'w1')).toBeNull();
    expect(createWolfSeerCheck(players, 'h1')).toBeNull();
  });

  it('rejects a stale or unknown target id', () => {
    expect(createWolfSeerCheck(players, 'missing')).toBeNull();
  });
});
