import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NIGHT_ROLE_ORDER,
  moveNightRoleStep,
  normalizeNightRoleOrder,
} from './nightRoleOrder';

describe('night role order', () => {
  it('calls the half wolf before the wolf pack by default', () => {
    expect(DEFAULT_NIGHT_ROLE_ORDER).toEqual([
      'guard', 'half_wolf', 'wolf', 'wolf_seer', 'seer', 'detective', 'witch', 'hunter',
    ]);
  });

  it('accepts a complete custom role order', () => {
    const customOrder = ['guard', 'half_wolf', 'wolf', 'wolf_seer', 'witch', 'detective', 'hunter', 'seer'] as const;
    expect(normalizeNightRoleOrder(customOrder)).toEqual(customOrder);
  });

  it('migrates a saved order from before the half-wolf role', () => {
    expect(normalizeNightRoleOrder(['wolf', 'wolf_seer', 'witch', 'detective', 'guard', 'hunter', 'seer'])).toEqual([
      'half_wolf', 'wolf', 'wolf_seer', 'witch', 'detective', 'guard', 'hunter', 'seer',
    ]);
  });

  it('falls back for missing, duplicated or unknown steps', () => {
    expect(normalizeNightRoleOrder(undefined)).toEqual(DEFAULT_NIGHT_ROLE_ORDER);
    expect(normalizeNightRoleOrder(['wolf', 'wolf', 'wolf_seer', 'seer', 'detective', 'witch', 'hunter'])).toEqual(DEFAULT_NIGHT_ROLE_ORDER);
    expect(normalizeNightRoleOrder(['wolf', 'ghost', 'wolf_seer', 'seer', 'detective', 'witch', 'hunter'])).toEqual(DEFAULT_NIGHT_ROLE_ORDER);
  });

  it('moves one role without dropping or duplicating another role', () => {
    expect(moveNightRoleStep(DEFAULT_NIGHT_ROLE_ORDER, 'seer', -1)).toEqual([
      'guard', 'half_wolf', 'wolf', 'seer', 'wolf_seer', 'detective', 'witch', 'hunter',
    ]);
    expect(moveNightRoleStep(DEFAULT_NIGHT_ROLE_ORDER, 'guard', -1)).toEqual(DEFAULT_NIGHT_ROLE_ORDER);
    expect(moveNightRoleStep(DEFAULT_NIGHT_ROLE_ORDER, 'half_wolf', 1)).toEqual(DEFAULT_NIGHT_ROLE_ORDER);
  });
});
