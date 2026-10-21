import { describe, expect, it } from 'vitest';
import type { Player } from './types';
import {
  createWolfLeadershipOrder,
  getWolfLeaderId,
  normalizeWolfLeadershipOrder,
} from './wolfLeadership';

const players: Player[] = [
  { id: 'v1', name: 'Villager', role: 'villager', alive: true },
  { id: 'w1', name: 'Wolf 1', role: 'wolf', alive: true },
  { id: 'ws1', name: 'Wolf Seer', role: 'wolf_seer', alive: true },
  { id: 'wd1', name: 'Demon Wolf', role: 'wolf_demon', alive: true },
];

describe('wolf leadership order', () => {
  it('stores every wolf role in player order', () => {
    expect(createWolfLeadershipOrder(players)).toEqual(['w1', 'ws1', 'wd1']);
  });

  it('uses the last living wolf as leader without mutating the stored order', () => {
    const order = ['w1', 'ws1', 'wd1'];
    expect(getWolfLeaderId(players, order)).toBe('wd1');
    expect(order).toEqual(['w1', 'ws1', 'wd1']);
  });

  it('falls back to the previous wolf after the current leader dies', () => {
    const withDeadLeader = players.map(player => (
      player.id === 'wd1' ? { ...player, alive: false } : player
    ));
    expect(getWolfLeaderId(withDeadLeader, ['w1', 'ws1', 'wd1'])).toBe('ws1');
  });

  it('repairs an old or malformed order without losing wolves', () => {
    expect(normalizeWolfLeadershipOrder(players, ['missing', 'w1', 'w1'])).toEqual([
      'w1', 'ws1', 'wd1',
    ]);
    expect(getWolfLeaderId(players)).toBe('wd1');
  });

  it('returns no leader after the wolf team is eliminated', () => {
    expect(getWolfLeaderId(players.map(player => ({ ...player, alive: false })))).toBeUndefined();
  });
});
