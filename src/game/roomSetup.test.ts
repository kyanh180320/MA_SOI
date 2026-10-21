import { describe, expect, it } from 'vitest';
import type { RoleDistribution, RoomSetupConfig } from './types';
import { assignRoles } from './roles';
import { getValidRoomSetupDistribution, isValidRoleDistribution } from './roomSetup';

const customFourPlayerRoles: RoleDistribution = {
  wolf: 1,
  wolf_demon: 0,
  wolf_seer: 0,
  villager: 1,
  seer: 0,
  detective: 0,
  witch: 0,
  guard: 1,
  hunter: 1,
};

function createConfig(overrides?: Partial<RoomSetupConfig>): RoomSetupConfig {
  return {
    playerCount: 4,
    distribution: customFourPlayerRoles,
    updatedAt: 1,
    ...overrides,
  };
}

describe('room setup configuration', () => {
  it('keeps the exact custom roles when the room player count still matches', () => {
    const result = getValidRoomSetupDistribution(createConfig(), 4);

    expect(result).toEqual(customFourPlayerRoles);
    expect(result).not.toBe(customFourPlayerRoles);

    const assigned = assignRoles(
      ['a', 'b', 'c', 'd'].map(id => ({ id, name: id })),
      result!,
      { random: () => 0 },
    );
    const assignedCounts = assigned.reduce<RoleDistribution>((counts, player) => ({
      ...counts,
      [player.role]: counts[player.role] + 1,
    }), {
      wolf: 0,
      wolf_demon: 0,
      wolf_seer: 0,
      villager: 0,
      seer: 0,
      detective: 0,
      witch: 0,
      guard: 0,
      hunter: 0,
    });
    expect(assignedCounts).toEqual(customFourPlayerRoles);
  });

  it('rejects a saved configuration after the room player count changes', () => {
    expect(getValidRoomSetupDistribution(createConfig(), 5)).toBeNull();
  });

  it('rejects missing wolves or a role total that does not match', () => {
    expect(isValidRoleDistribution({ ...customFourPlayerRoles, wolf: 0 }, 4)).toBe(false);
    expect(isValidRoleDistribution({ ...customFourPlayerRoles, villager: 2 }, 4)).toBe(false);
  });

  it('keeps old rooms without setupConfig backward compatible', () => {
    expect(getValidRoomSetupDistribution(undefined, 4)).toBeNull();
  });

  it('treats new role fields missing from an old saved room as zero', () => {
    const oldDistribution = {
      wolf: 1,
      wolf_demon: 0,
      villager: 2,
      seer: 1,
      witch: 0,
      guard: 0,
      hunter: 0,
    } as RoleDistribution;

    expect(getValidRoomSetupDistribution(createConfig({ distribution: oldDistribution }), 4)).toEqual({
      ...oldDistribution,
      wolf_seer: 0,
      detective: 0,
    });
  });
});
