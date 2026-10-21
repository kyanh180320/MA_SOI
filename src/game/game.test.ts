import { describe, it, expect } from 'vitest';
import { getRoleDistribution, assignRoles } from './roles';
import { resolveHunterShots, resolveNight, mergeRemoteNightActions, getActiveNightRoleSteps, getConfiguredNightRoleSteps, getNightStep, getWolfPackSelection } from './night';
import { resolveVote } from './vote';
import { checkWinner } from './win';
import { applyLiveNightActions, sanitizeGameForSync } from './onlineSync';
import type { Player, Game } from './types';

describe('online sync', () => {
  const game: Game = {
    id: 'online-game',
    createdAt: 0,
    players: [
      { id: 'w1', name: 'Wolf', role: 'wolf', alive: true, avatar: 'data:image/jpeg;base64,very-large' },
      { id: 'v1', name: 'Villager', role: 'villager', alive: true, avatar: 'https://example.com/avatar.jpg' },
    ],
    phase: 'night',
    witchItems: { saveLeft: 1, poisonLeft: 1 },
    rounds: [{ number: 2, nightDeaths: [] }],
  };

  it('hydrates small live actions into the current game snapshot', () => {
    const hydrated = applyLiveNightActions(game, {
      gameId: game.id,
      roundNumber: 2,
      guardProtectTarget: 'v1',
      wolfVotes: { w1: ['v1'] },
      hunterTargets: { h1: 'v1' },
      skippedDeadRoleSteps: ['seer'],
    });

    expect(hydrated.rounds[0].guardProtectTarget).toBe('v1');
    expect(hydrated.rounds[0].wolfVotes).toEqual({ w1: ['v1'] });
    expect(hydrated.rounds[0].hunterTargets).toEqual({ h1: 'v1' });
    expect(hydrated.rounds[0].skippedDeadRoleSteps).toEqual(['seer']);
  });

  it('ignores stale actions from another round', () => {
    expect(applyLiveNightActions(game, {
      gameId: game.id,
      roundNumber: 1,
      guardProtectTarget: 'v1',
    })).toBe(game);
  });

  it('removes inline base64 avatars but keeps remote image URLs', () => {
    const sanitized = sanitizeGameForSync(game);
    expect(sanitized.players[0].avatar).toBe('');
    expect(sanitized.players[1].avatar).toBe('https://example.com/avatar.jpg');
  });
});

describe('mergeRemoteNightActions', () => {
  const base: Game = {
    id: 'g', createdAt: 0, players: [], phase: 'night',
    witchItems: { saveLeft: 1, poisonLeft: 1 },
    rounds: [{ number: 1, nightDeaths: [] }],
  };
  const withRound = (g: Game, r: object): Game => ({ ...g, rounds: [{ ...g.rounds[0], ...r }] });

  it('adopts guard action done by player so host moves to next step', () => {
    const merged = mergeRemoteNightActions(base, withRound(base, { guardProtectTarget: 'p1' }));
    expect(merged?.rounds[0].guardProtectTarget).toBe('p1');
  });

  it('does not overwrite steps the host already has', () => {
    const local = withRound(base, { guardProtectTarget: 'none' });
    expect(mergeRemoteNightActions(local, withRound(base, { guardProtectTarget: 'p1' }))).toBeNull();
  });

  it('adopts witch action and decreases potions', () => {
    const remote = { ...withRound(base, { witchSaved: true, witchSavedTarget: 'p2' }), witchItems: { saveLeft: 0, poisonLeft: 1 } };
    const merged = mergeRemoteNightActions(base, remote);
    expect(merged?.rounds[0].witchSavedTarget).toBe('p2');
    expect(merged?.witchItems.saveLeft).toBe(0);
  });

  it('ignores different rounds or non-night phases', () => {
    const remote = { ...withRound(base, { guardProtectTarget: 'p1' }), rounds: [{ number: 2, nightDeaths: [], guardProtectTarget: 'p1' }] };
    expect(mergeRemoteNightActions(base, remote)).toBeNull();
    expect(mergeRemoteNightActions({ ...base, phase: 'day' }, withRound(base, { guardProtectTarget: 'p1' }))).toBeNull();
  });

  it('never carries night actions from an older game into a new game', () => {
    const oldGame = { ...withRound(base, { wolfTarget: 'p1' }), id: 'old-game' };
    expect(mergeRemoteNightActions(base, oldGame)).toBeNull();
  });

  it('merges independent choices from multiple hunters', () => {
    const local = withRound(base, { hunterTargets: { h1: 'p1' } });
    const remote = withRound(base, { hunterTargets: { h2: 'p2' } });
    expect(mergeRemoteNightActions(local, remote)?.rounds[0].hunterTargets).toEqual({
      h1: 'p1',
      h2: 'p2',
    });
  });

  it('merges dead-role acknowledgements without losing local ones', () => {
    const local = withRound(base, { skippedDeadRoleSteps: ['guard'] });
    const remote = withRound(base, { skippedDeadRoleSteps: ['seer'] });
    expect(mergeRemoteNightActions(local, remote)?.rounds[0].skippedDeadRoleSteps).toEqual([
      'guard',
      'seer',
    ]);
  });
});

describe('roles', () => {
  describe('getRoleDistribution', () => {
    it('should throw error if n < 4 or n > 20', () => {
      expect(() => getRoleDistribution(3)).toThrowError();
      expect(() => getRoleDistribution(21)).toThrowError();
    });

    it('should correctly distribute roles for 4 players with a single wolf', () => {
      expect(getRoleDistribution(4)).toEqual({ wolf: 1, wolf_demon: 0, seer: 1, witch: 0, guard: 0, hunter: 0, villager: 2 });
    });

    it('should correctly distribute roles for 5 players with a single wolf', () => {
      expect(getRoleDistribution(5)).toEqual({ wolf: 1, wolf_demon: 0, seer: 1, witch: 0, guard: 0, hunter: 0, villager: 3 });
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
      for (let n = 4; n <= 15; n++) {
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

    it('minimizes repeated roles from the previous game', () => {
      const previousPlayers: Player[] = [
        { id: 'p1', name: 'A', role: 'wolf', alive: true },
        { id: 'p2', name: 'B', role: 'seer', alive: true },
        { id: 'p3', name: 'C', role: 'villager', alive: true },
        { id: 'p4', name: 'D', role: 'villager', alive: true },
      ];
      const players = previousPlayers.map(({ id, name }) => ({ id, name }));
      const distribution = { wolf: 1, wolf_demon: 0, seer: 1, witch: 0, guard: 0, hunter: 0, villager: 2 };

      const assigned = assignRoles(players, distribution, { previousPlayers, random: () => 0 });

      expect(assigned.filter((player, index) => player.role === previousPlayers[index].role)).toHaveLength(0);
    });

    it('returns the mathematical minimum when repeats are unavoidable', () => {
      const previousPlayers: Player[] = [
        { id: 'p1', name: 'A', role: 'wolf', alive: true },
        { id: 'p2', name: 'B', role: 'villager', alive: true },
        { id: 'p3', name: 'C', role: 'villager', alive: true },
        { id: 'p4', name: 'D', role: 'villager', alive: true },
        { id: 'p5', name: 'E', role: 'villager', alive: true },
      ];
      const players = previousPlayers.map(({ id, name }) => ({ id, name }));
      const distribution = { wolf: 1, wolf_demon: 0, seer: 0, witch: 0, guard: 0, hunter: 0, villager: 4 };

      const assigned = assignRoles(players, distribution, { previousPlayers, random: () => 0.5 });
      const repeatCount = assigned.filter((player, index) => player.role === previousPlayers[index].role).length;

      expect(repeatCount).toBe(3);
    });
  });
});

describe('night', () => {
  describe('wolf pack selection', () => {
    const normalWolfPlayers: Player[] = [
      { id: 'w1', name: 'Wolf 1', role: 'wolf', alive: true },
      { id: 'w2', name: 'Wolf 2', role: 'wolf', alive: true },
      { id: 'v1', name: 'Villager 1', role: 'villager', alive: true },
      { id: 'v2', name: 'Villager 2', role: 'villager', alive: true },
      { id: 'v3', name: 'Villager 3', role: 'villager', alive: true },
    ];

    it('rejects two normal wolves choosing different victims', () => {
      expect(getWolfPackSelection(normalWolfPlayers, { w1: ['v1'], w2: ['v2'] })).toEqual({
        targetIds: ['v1', 'v2'],
        maxTargets: 1,
        allWolvesVoted: true,
        exceedsLimit: true,
      });
    });

    it('accepts normal wolves agreeing on one victim', () => {
      expect(getWolfPackSelection(normalWolfPlayers, { w1: ['v1'], w2: ['v1'] })).toEqual({
        targetIds: ['v1'],
        maxTargets: 1,
        allWolvesVoted: true,
        exceedsLimit: false,
      });
    });

    it('rejects more than two distinct victims when a demon wolf is alive', () => {
      const players: Player[] = [
        ...normalWolfPlayers,
        { id: 'wd1', name: 'Demon Wolf', role: 'wolf_demon', alive: true },
      ];
      const selection = getWolfPackSelection(players, {
        w1: ['v1'],
        w2: ['v2'],
        wd1: ['v2', 'v3'],
      });

      expect(selection.maxTargets).toBe(2);
      expect(selection.targetIds).toEqual(['v1', 'v2', 'v3']);
      expect(selection.exceedsLimit).toBe(true);
    });
  });

  describe('getNightStep', () => {
    const player = (id: string, role: Player['role'], alive = true): Player => ({ id, name: id, role, alive });

    it('skips roles that were not selected for the game', () => {
      const players = [player('w1', 'wolf'), player('v1', 'villager'), player('s1', 'seer')];
      const round = { number: 1, nightDeaths: [] };

      expect(getActiveNightRoleSteps(players)).toEqual(['wolf', 'seer']);
      expect(getNightStep(round, players)).toBe('wolf');
      expect(getNightStep({ ...round, wolfTarget: 'v1' }, players)).toBe('seer');
      expect(getNightStep({ ...round, wolfTarget: 'v1', seerCheck: { target: 'w1', isWolf: true } }, players)).toBe('done');
    });

    it('waits for the moderator to call every configured role that has died', () => {
      const players = [
        player('w1', 'wolf'),
        player('g1', 'guard', false),
        player('s1', 'seer', false),
        player('wt1', 'witch', false),
        player('v1', 'villager')
      ];
      const round = { number: 2, nightDeaths: [] };

      expect(getActiveNightRoleSteps(players)).toEqual(['wolf']);
      expect(getNightStep(round, players)).toBe('guard');
      expect(getNightStep({ ...round, skippedDeadRoleSteps: ['guard'] }, players)).toBe('wolf');
      expect(getNightStep({
        ...round,
        skippedDeadRoleSteps: ['guard'],
        wolfTargets: ['v1'],
      }, players)).toBe('seer');
      expect(getNightStep({
        ...round,
        skippedDeadRoleSteps: ['guard', 'seer'],
        wolfTargets: ['v1'],
      }, players)).toBe('witch');
      expect(getNightStep({
        ...round,
        skippedDeadRoleSteps: ['guard', 'seer', 'witch'],
        wolfTargets: ['v1'],
      }, players)).toBe('done');
    });

    it('pauses at a dead role between living roles until it is acknowledged', () => {
      const players = [
        player('w1', 'wolf'),
        player('s1', 'seer', false),
        player('h1', 'hunter'),
        player('v1', 'villager'),
      ];
      const round = { number: 3, nightDeaths: [], wolfTargets: ['v1'] };

      expect(getNightStep(round, players)).toBe('seer');
      expect(getNightStep({ ...round, skippedDeadRoleSteps: ['seer'] }, players)).toBe('hunter');
    });

    it('keeps configured role icons after those roles die', () => {
      const players = [
        player('w1', 'wolf'),
        player('g1', 'guard', false),
        player('s1', 'seer', false),
        player('wt1', 'witch', false),
        player('h1', 'hunter', false),
        player('v1', 'villager'),
      ];

      expect(getActiveNightRoleSteps(players)).toEqual(['wolf']);
      expect(getConfiguredNightRoleSteps(players)).toEqual(['guard', 'wolf', 'seer', 'witch', 'hunter']);
    });

    it('treats demon wolf as the wolf night step', () => {
      const players = [player('wd1', 'wolf_demon'), player('v1', 'villager')];
      expect(getActiveNightRoleSteps(players)).toEqual(['wolf']);
    });

    it('includes living hunters and waits for every hunter choice', () => {
      const players = [player('w1', 'wolf'), player('h1', 'hunter'), player('h2', 'hunter'), player('v1', 'villager')];
      const round = { number: 1, nightDeaths: [], wolfTargets: ['v1'] };

      expect(getActiveNightRoleSteps(players)).toEqual(['wolf', 'hunter']);
      expect(getNightStep(round, players)).toBe('hunter');
      expect(getNightStep({ ...round, hunterTargets: { h1: 'v1' } }, players)).toBe('hunter');
      expect(getNightStep({ ...round, hunterTargets: { h1: 'v1', h2: 'none' } }, players)).toBe('done');
    });

    it('returns every configured actionable role in the exact call order', () => {
      const players = [
        player('g1', 'guard'),
        player('w1', 'wolf'),
        player('s1', 'seer'),
        player('wt1', 'witch'),
        player('h1', 'hunter'),
        player('v1', 'villager'),
      ];

      expect(getActiveNightRoleSteps(players)).toEqual(['guard', 'wolf', 'seer', 'witch', 'hunter']);
    });

    it('skips a hunter after they have died', () => {
      const players = [player('w1', 'wolf'), player('h1', 'hunter', false), player('v1', 'villager')];
      expect(getActiveNightRoleSteps(players)).toEqual(['wolf']);
    });
  });

  describe('resolveHunterShots', () => {
    const players: Player[] = [
      { id: 'h1', name: 'Hunter 1', role: 'hunter', alive: true },
      { id: 'h2', name: 'Hunter 2', role: 'hunter', alive: true },
      { id: 'v1', name: 'Villager', role: 'villager', alive: true },
    ];

    it('applies the target selected by a hunter before death', () => {
      expect(resolveHunterShots(['h1'], { hunterTargets: { h1: 'v1' } }, players)).toEqual({
        deaths: ['h1', 'v1'],
        shots: { h1: 'v1' },
        unresolvedHunterIds: [],
      });
    });

    it('resolves a chain when one hunter shoots another hunter', () => {
      const result = resolveHunterShots(['h1'], { hunterTargets: { h1: 'h2', h2: 'v1' } }, players);
      expect(result.deaths).toEqual(['h1', 'h2', 'v1']);
      expect(result.shots).toEqual({ h1: 'h2', h2: 'v1' });
      expect(result.unresolvedHunterIds).toEqual([]);
    });

    it('keeps old rounds compatible by returning hunters without a saved choice', () => {
      expect(resolveHunterShots(['h1'], {}, players).unresolvedHunterIds).toEqual(['h1']);
    });
  });

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

    it('should not allow wolves to bite wolf team members', () => {
      const mockPlayers: Player[] = [
        { id: 'w1', name: 'Wolf 1', role: 'wolf', alive: true },
        { id: 'w2', name: 'Wolf 2', role: 'wolf_demon', alive: true },
        { id: 'v1', name: 'Villager 1', role: 'villager', alive: true },
      ];
      // Sói chọn cắn sói w2 và dân v1
      const deaths = resolveNight({ wolfTargets: ['w2', 'v1'] }, mockPlayers);
      expect(deaths).toEqual(['v1']);

      // Sói chọn cắn đơn w1
      const deathsSingle = resolveNight({ wolfTarget: 'w1' }, mockPlayers);
      expect(deathsSingle).toEqual([]);
    });

    it('enforces the final victim limit even if invalid targets reach game logic', () => {
      const normalPack: Player[] = [
        { id: 'w1', name: 'Wolf', role: 'wolf', alive: true },
        { id: 'v1', name: 'Villager 1', role: 'villager', alive: true },
        { id: 'v2', name: 'Villager 2', role: 'villager', alive: true },
        { id: 'v3', name: 'Villager 3', role: 'villager', alive: true },
      ];
      const demonPack: Player[] = [
        ...normalPack,
        { id: 'wd1', name: 'Demon Wolf', role: 'wolf_demon', alive: true },
      ];

      expect(resolveNight({ wolfTargets: ['v1', 'v2', 'v3'] }, normalPack)).toEqual(['v1']);
      expect(resolveNight({ wolfTargets: ['v1', 'v2', 'v3'] }, demonPack)).toEqual(['v1', 'v2']);
    });

    it('should not allow witch to poison herself', () => {
      const mockPlayers: Player[] = [
        { id: 'witch1', name: 'Witch', role: 'witch', alive: true },
        { id: 'v1', name: 'Villager 1', role: 'villager', alive: true },
      ];
      const deaths = resolveNight({ witchPoisonTarget: 'witch1' }, mockPlayers);
      expect(deaths).toEqual([]);
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
