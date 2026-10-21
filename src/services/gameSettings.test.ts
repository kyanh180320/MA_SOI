import { describe, expect, it } from 'vitest';
import {
  loadNightRoleOrder,
  NIGHT_ROLE_ORDER_STORAGE_KEY,
  saveNightRoleOrder,
} from './gameSettings';

function createStorage(initialValue: string | null = null) {
  let value = initialValue;
  return {
    getItem: (key: string) => key === NIGHT_ROLE_ORDER_STORAGE_KEY ? value : null,
    setItem: (key: string, nextValue: string) => {
      if (key === NIGHT_ROLE_ORDER_STORAGE_KEY) value = nextValue;
    },
  };
}

describe('game settings', () => {
  it('saves and reloads the moderator night role order', () => {
    const storage = createStorage();
    const customOrder = ['wolf', 'seer', 'hunter', 'guard', 'witch'] as const;

    saveNightRoleOrder(customOrder, storage);

    expect(loadNightRoleOrder(storage)).toEqual(customOrder);
  });

  it('uses the default order when stored JSON is invalid', () => {
    expect(loadNightRoleOrder(createStorage('{broken'))).toEqual([
      'guard', 'wolf', 'seer', 'witch', 'hunter',
    ]);
  });
});
