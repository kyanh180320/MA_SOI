import { describe, expect, it } from 'vitest';
import { getHalfWolfConversionIds, prependConvertedWolves } from './halfWolf';
import { getNightStep, resolveNight } from './night';
import type { Player, Round } from './types';
import { checkWinner, isWolfAligned } from './win';
import { getWolfLeaderId } from './wolfLeadership';

const players: Player[] = [
  { id: 'w1', name: 'Wolf 1', role: 'wolf', alive: true },
  { id: 'w2', name: 'Wolf 2', role: 'wolf', alive: true },
  { id: 'h1', name: 'Half Wolf', role: 'half_wolf', alive: true },
  { id: 'v1', name: 'Villager', role: 'villager', alive: true },
];

function round(overrides: Partial<Round> = {}): Round {
  return { number: 1, nightDeaths: [], ...overrides };
}

describe('half wolf', () => {
  it('survives a successful bite and becomes wolf-aligned', () => {
    const currentRound = round({ wolfTargets: ['h1'] });
    expect(resolveNight(currentRound, players)).toEqual([]);
    expect(getHalfWolfConversionIds(currentRound, players)).toEqual(['h1']);

    const converted = { ...players[2], wolfConvertedAtRound: 1 };
    expect(isWolfAligned(converted)).toBe(true);
  });

  it('does not convert when protected, saved, or poisoned', () => {
    expect(getHalfWolfConversionIds(round({ wolfTargets: ['h1'], guardProtectTarget: 'h1' }), players)).toEqual([]);
    expect(getHalfWolfConversionIds(round({ wolfTargets: ['h1'], witchSavedTarget: 'h1' }), players)).toEqual([]);
    expect(getHalfWolfConversionIds(round({ wolfTargets: ['h1'], witchPoisonTarget: 'h1' }), players)).toEqual([]);
    expect(resolveNight(round({ wolfTargets: ['h1'], witchPoisonTarget: 'h1' }), players)).toEqual(['h1']);
  });

  it('waits for every living half wolf to check the phone before the wolf step', () => {
    const order = ['half_wolf', 'wolf', 'guard', 'wolf_seer', 'seer', 'detective', 'witch', 'hunter'] as const;
    expect(getNightStep(round(), players, order)).toBe('half_wolf');
    expect(getNightStep(round({ halfWolfAcknowledgements: ['h1'] }), players, order)).toBe('wolf');
  });

  it('prepends a converted id so the current leader keeps priority', () => {
    const convertedPlayers = players.map(player => player.id === 'h1'
      ? { ...player, wolfConvertedAtRound: 1 }
      : player);
    const order = prependConvertedWolves(['w1', 'w2'], ['h1']);

    expect(order).toEqual(['h1', 'w1', 'w2']);
    expect(getWolfLeaderId(convertedPlayers, order)).toBe('w2');
    const onlyHalfWolfAlive = convertedPlayers.map(player => (
      player.id === 'w1' || player.id === 'w2' ? { ...player, alive: false } : player
    ));
    expect(getWolfLeaderId(onlyHalfWolfAlive, order)).toBe('h1');
  });

  it('counts the converted half wolf as wolf team for victory', () => {
    const endPlayers: Player[] = [
      { id: 'h1', name: 'Half Wolf', role: 'half_wolf', alive: true, wolfConvertedAtRound: 1 },
      { id: 'v1', name: 'Villager', role: 'villager', alive: true },
    ];
    expect(checkWinner(endPlayers)).toBe('wolf');
  });
});
