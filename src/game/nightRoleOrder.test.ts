import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NIGHT_ROLE_ORDER,
  moveNightRoleStep,
  normalizeNightRoleOrder,
} from './nightRoleOrder';

describe('night role order', () => {
  it('accepts a complete custom role order', () => {
    const customOrder = ['wolf', 'witch', 'detective', 'guard', 'hunter', 'seer'] as const;
    expect(normalizeNightRoleOrder(customOrder)).toEqual(customOrder);
  });

  it('falls back for missing, duplicated or unknown steps', () => {
    expect(normalizeNightRoleOrder(undefined)).toEqual(DEFAULT_NIGHT_ROLE_ORDER);
    expect(normalizeNightRoleOrder(['wolf', 'wolf', 'seer', 'detective', 'witch', 'hunter'])).toEqual(DEFAULT_NIGHT_ROLE_ORDER);
    expect(normalizeNightRoleOrder(['wolf', 'ghost', 'seer', 'detective', 'witch', 'hunter'])).toEqual(DEFAULT_NIGHT_ROLE_ORDER);
  });

  it('moves one role without dropping or duplicating another role', () => {
    expect(moveNightRoleStep(DEFAULT_NIGHT_ROLE_ORDER, 'seer', -1)).toEqual([
      'guard', 'seer', 'wolf', 'detective', 'witch', 'hunter',
    ]);
    expect(moveNightRoleStep(DEFAULT_NIGHT_ROLE_ORDER, 'guard', -1)).toEqual(DEFAULT_NIGHT_ROLE_ORDER);
  });
});
