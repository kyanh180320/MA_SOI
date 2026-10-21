import { describe, expect, it } from 'vitest';
import { createDetectiveCheck, getDetectiveTargetLimit, isDetectiveLockedForRound } from './detective';
import type { Game, Player } from './types';

const players: Player[] = [
  { id: 'd1', name: 'Detective', role: 'detective', alive: true },
  { id: 'w1', name: 'Wolf', role: 'wolf', alive: true },
  { id: 'wd1', name: 'Demon', role: 'wolf_demon', alive: true },
  { id: 'ws1', name: 'Wolf Seer', role: 'wolf_seer', alive: true },
  { id: 'v1', name: 'Villager 1', role: 'villager', alive: true },
  { id: 'v2', name: 'Villager 2', role: 'villager', alive: true },
];

function createGame(previousTargets: string[], hasWolf: boolean, lockRule = true): Game {
  return {
    id: 'game-detective',
    createdAt: 1,
    players,
    phase: 'night',
    witchItems: { saveLeft: 1, poisonLeft: 1 },
    roleSettings: { detective: { lockNextRoundAfterClearCheck: lockRule } },
    rounds: [
      {
        number: 1,
        nightDeaths: [],
        detectiveChecks: { d1: { targets: previousTargets, hasWolf } },
      },
      { number: 2, nightDeaths: [] },
    ],
  };
}

describe('detective role', () => {
  it('reports only whether at least one selected player belongs to the wolf team', () => {
    expect(createDetectiveCheck(players, 'd1', ['v1', 'wd1', 'v2'])).toEqual({
      targets: ['v1', 'wd1', 'v2'],
      hasWolf: true,
    });
    expect(createDetectiveCheck(players, 'd1', ['v1', 'ws1', 'v2']).hasWolf).toBe(true);
    expect(createDetectiveCheck(players, 'd1', ['v1', 'v2'])).toEqual({
      targets: ['v1', 'v2'],
      hasWolf: false,
    });
  });

  it('requires at most three other living players', () => {
    expect(getDetectiveTargetLimit(players, 'd1')).toBe(3);
    expect(getDetectiveTargetLimit(players.slice(0, 3), 'd1')).toBe(2);
  });

  it('locks exactly the next round after a clear three-player inspection', () => {
    expect(isDetectiveLockedForRound(createGame(['v1', 'v2', 'd2'], false), 'd1')).toBe(true);
    expect(isDetectiveLockedForRound(createGame(['v1', 'v2'], false), 'd1')).toBe(false);
    expect(isDetectiveLockedForRound(createGame(['v1', 'v2', 'w1'], true), 'd1')).toBe(false);
  });

  it('does not lock when the moderator disables that role rule', () => {
    expect(isDetectiveLockedForRound(createGame(['v1', 'v2', 'd2'], false, false), 'd1')).toBe(false);
  });

  it('keeps old games without role settings on the default lock rule', () => {
    const oldGame = createGame(['v1', 'v2', 'd2'], false);
    delete oldGame.roleSettings;

    expect(isDetectiveLockedForRound(oldGame, 'd1')).toBe(true);
  });

  it('does not chain a lock into another round', () => {
    const game = createGame(['v1', 'v2', 'd2'], false);
    game.rounds[1].detectiveChecks = { d1: { targets: [], hasWolf: false, locked: true } };
    game.rounds.push({ number: 3, nightDeaths: [] });

    expect(isDetectiveLockedForRound(game, 'd1')).toBe(false);
  });
});
