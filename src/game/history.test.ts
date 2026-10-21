import { describe, expect, it } from 'vitest';
import { appendGameHistory } from './history';
import type { Game } from './types';

const makeGame = (id: string): Game => ({
  id,
  createdAt: 0,
  players: [],
  rounds: [{ number: 1, nightDeaths: [] }],
  phase: 'night',
  witchItems: { saveLeft: 1, poisonLeft: 1 },
});

describe('game history', () => {
  it('does not append an idempotent state update', () => {
    const game = makeGame('same');
    const history = [game];

    expect(appendGameHistory(history, game)).toBe(history);
  });

  it('keeps only the newest entries up to the configured limit', () => {
    const games = ['1', '2', '3'].map(makeGame);
    const next = makeGame('4');

    expect(appendGameHistory(games, next, 3).map(game => game.id)).toEqual(['2', '3', '4']);
  });
});
