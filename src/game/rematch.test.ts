import { describe, expect, it } from 'vitest';
import { createRematchGame } from './rematch';
import type { Game, Role } from './types';

const endedGame: Game = {
  id: 'game_old',
  createdAt: 100,
  roomId: '123456',
  phase: 'ended',
  winner: 'villager',
  nightRoleOrder: ['wolf', 'seer', 'hunter', 'guard', 'witch'],
  players: [
    { id: 'p1', name: 'A', avatar: 'a.webp', role: 'wolf', alive: false },
    { id: 'p2', name: 'B', avatar: 'b.webp', role: 'seer', alive: true },
    { id: 'p3', name: 'C', role: 'villager', alive: true },
    { id: 'p4', name: 'D', role: 'villager', alive: false },
  ],
  rounds: [{
    number: 3,
    guardProtectTarget: 'p2',
    wolfTargets: ['p1'],
    nightDeaths: ['p1'],
    vote: { tally: { p1: 3 }, eliminated: 'p1' },
  }],
  witchItems: { saveLeft: 0, poisonLeft: 0 },
};

function countRoles(game: Game): Record<Role, number> {
  return game.players.reduce<Record<Role, number>>((counts, player) => {
    counts[player.role] += 1;
    return counts;
  }, {
    wolf: 0,
    wolf_demon: 0,
    villager: 0,
    seer: 0,
    witch: 0,
    guard: 0,
    hunter: 0,
  });
}

describe('createRematchGame', () => {
  it('keeps the room, players and role counts while resetting all match state', () => {
    const rematch = createRematchGame(endedGame, 200);

    expect(rematch.id).toBe('game_200');
    expect(rematch.roomId).toBe(endedGame.roomId);
    expect(rematch.createdAt).toBe(200);
    expect(rematch.nightRoleOrder).toEqual(endedGame.nightRoleOrder);
    expect(rematch.phase).toBe('night');
    expect(rematch.winner).toBeUndefined();
    expect(rematch.rounds).toEqual([{ number: 1, nightDeaths: [] }]);
    expect(rematch.witchItems).toEqual({ saveLeft: 1, poisonLeft: 1 });
    expect(rematch.players.map(player => player.id)).toEqual(endedGame.players.map(player => player.id));
    expect(rematch.players.every(player => player.alive)).toBe(true);
    expect(countRoles(rematch)).toEqual(countRoles(endedGame));
    expect(rematch.players.filter((player, index) => player.role === endedGame.players[index].role)).toHaveLength(0);
  });
});
