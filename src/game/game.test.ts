import { describe, it, expect } from 'vitest';
import { getRoleDistribution, assignRoles } from './roles';
import { resolveNight } from './night';
import { resolveVote } from './vote';
import { checkWinner } from './win';
import type { Player } from './types';

describe('roles', () => {
  describe('getRoleDistribution', () => {
    it('should throw error if n < 6 or n > 20', () => {
      expect(() => getRoleDistribution(5)).toThrowError();
      expect(() => getRoleDistribution(21)).toThrowError();
    });

    it('should correctly distribute roles for 6 players', () => {
      expect(getRoleDistribution(6)).toEqual({ wolf: 2, wolf_demon: 0, seer: 1, witch: 0, guard: 0, hunter: 0, villager: 3 });
    });

    it('should correctly distribute roles for 7 players', () => {
      expect(getRoleDistribution(7)).toEqual({ wolf: 2, wolf_demon: 0, seer: 1, witch: 1, guard: 0, hunter: 0, villager: 3 });
    });

    it('should correctly distribute roles for 9 players', () => {
      expect(getRoleDistribution(9)).toEqual({ wolf: 3, wolf_demon: 0, seer: 1, witch: 1, guard: 1, hunter: 0, villager: 3 });
    });

    it('should correctly distribute roles for 12 players', () => {
      expect(getRoleDistribution(12)).toEqual({ wolf: 4, wolf_demon: 0, seer: 1, witch: 1, guard: 1, hunter: 0, villager: 5 });
    });

    it('should correctly distribute roles for 15 players', () => {
      expect(getRoleDistribution(15)).toEqual({ wolf: 5, wolf_demon: 0, seer: 1, witch: 1, guard: 1, hunter: 0, villager: 7 });
    });

    it('should provide dynamic balanced distribution that totals to n and may omit some roles', () => {
      for (let n = 6; n <= 15; n++) {
        const dist = getRoleDistribution(n, { randomize: true });
        const total = Object.values(dist).reduce((a, b) => a + b, 0);
        expect(total).toBe(n);
        expect(dist.wolf + dist.wolf_demon).toBeGreaterThan(0);
        expect(dist.villager).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('assignRoles', () => {
    it('should assign roles according to distribution', () => {
      const players = Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, name: `Player ${i}` }));
      const distribution = { wolf: 2, wolf_demon: 0, seer: 1, witch: 1, guard: 0, hunter: 0, villager: 3 };
      
      const assigned = assignRoles(players, distribution);
      
      expect(assigned).toHaveLength(7);
      expect(assigned.filter(p => p.role === 'wolf')).toHaveLength(2);
      expect(assigned.filter(p => p.role === 'seer')).toHaveLength(1);
      expect(assigned.filter(p => p.role === 'witch')).toHaveLength(1);
      expect(assigned.filter(p => p.role === 'villager')).toHaveLength(3);
      expect(assigned.every(p => p.alive === true)).toBe(true);
    });

    it('should throw error if distribution total does not match player count', () => {
      const players = [{ id: '1', name: 'A' }];
      const distribution = { wolf: 2, wolf_demon: 0, seer: 0, witch: 0, guard: 0, hunter: 0, villager: 0 };
      expect(() => assignRoles(players, distribution)).toThrowError();
    });
  });
});

describe('night', () => {
  describe('resolveNight', () => {
    it('should kill target if bitten and not saved', () => {
      expect(resolveNight({ wolfTarget: 'p1' })).toEqual(['p1']);
    });

    it('should not kill target if bitten and saved', () => {
      expect(resolveNight({ wolfTarget: 'p1', witchSaved: true })).toEqual([]);
    });

    it('should kill poison target and bite target if different', () => {
      const deaths = resolveNight({ wolfTarget: 'p1', witchPoisonTarget: 'p2' });
      expect(deaths).toContain('p1');
      expect(deaths).toContain('p2');
      expect(deaths).toHaveLength(2);
    });

    it('should kill target once if both bitten and poisoned', () => {
      expect(resolveNight({ wolfTarget: 'p1', witchPoisonTarget: 'p1' })).toEqual(['p1']);
    });

    it('should kill poison target even if bite was saved', () => {
      const deaths = resolveNight({ wolfTarget: 'p1', witchSaved: true, witchPoisonTarget: 'p2' });
      expect(deaths).toEqual(['p2']);
    });

    it('should support multiple wolf targets when demon wolf kills 2 players', () => {
      const deaths = resolveNight({ wolfTargets: ['p1', 'p2'] });
      expect(deaths).toContain('p1');
      expect(deaths).toContain('p2');
      expect(deaths).toHaveLength(2);
    });

    it('should spare only guarded target when wolves bite 2 players', () => {
      const deaths = resolveNight({ wolfTargets: ['p1', 'p2'], guardProtectTarget: 'p1' });
      expect(deaths).toEqual(['p2']);
    });

    it('should spare specific saved target when witch saves 1 of 2 bitten players', () => {
      const deaths = resolveNight({ wolfTargets: ['p1', 'p2'], witchSavedTarget: 'p2' });
      expect(deaths).toEqual(['p1']);
    });
  });
});

describe('vote', () => {
  describe('resolveVote', () => {
    it('should eliminate person with most votes', () => {
      expect(resolveVote({ p1: 1, p2: 3, p3: 2 })).toBe('p2');
    });

    it('should eliminate nobody on tie', () => {
      expect(resolveVote({ p1: 2, p2: 2, p3: 1 })).toBeUndefined();
    });

    it('should return undefined if tally is empty', () => {
      expect(resolveVote({})).toBeUndefined();
    });
  });
});

describe('win', () => {
  describe('checkWinner', () => {
    const createPlayers = (wolves: number, villagers: number, wolfDemons: number = 0): Player[] => {
      const p: Player[] = [];
      for (let i = 0; i < wolves; i++) p.push({ id: `w${i}`, name: 'W', role: 'wolf', alive: true });
      for (let i = 0; i < wolfDemons; i++) p.push({ id: `wd${i}`, name: 'WD', role: 'wolf_demon', alive: true });
      for (let i = 0; i < villagers; i++) p.push({ id: `v${i}`, name: 'V', role: 'villager', alive: true });
      return p;
    };

    it('should return villager if 0 wolves left', () => {
      expect(checkWinner(createPlayers(0, 5))).toBe('villager');
    });

    it('should return wolf if wolves >= others', () => {
      expect(checkWinner(createPlayers(2, 2))).toBe('wolf');
      expect(checkWinner(createPlayers(3, 2))).toBe('wolf');
    });

    it('should consider wolf_demon as wolf team', () => {
      expect(checkWinner(createPlayers(1, 2, 1))).toBe('wolf');
      expect(checkWinner(createPlayers(0, 3, 1))).toBeUndefined();
    });

    it('should return undefined if game is still going', () => {
      expect(checkWinner(createPlayers(2, 3))).toBeUndefined();
    });
  });
});
