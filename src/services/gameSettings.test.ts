import { describe, expect, it } from 'vitest';
import {
  loadNightRoleOrder,
  loadGameRoleSettings,
  GAME_ROLE_SETTINGS_STORAGE_KEY,
  NIGHT_ROLE_ORDER_STORAGE_KEY,
  saveNightRoleOrder,
  saveGameRoleSettings,
} from './gameSettings';

function createStorage(initialValue: string | null = null) {
  const values = new Map<string, string>();
  if (initialValue !== null) values.set(NIGHT_ROLE_ORDER_STORAGE_KEY, initialValue);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, nextValue: string) => values.set(key, nextValue),
  };
}

describe('game settings', () => {
  it('saves and reloads the moderator night role order', () => {
    const storage = createStorage();
    const customOrder = ['guard', 'half_wolf', 'wolf', 'wolf_seer', 'seer', 'detective', 'hunter', 'witch'] as const;

    saveNightRoleOrder(customOrder, storage);

    expect(loadNightRoleOrder(storage)).toEqual(customOrder);
  });

  it('uses the default order when stored JSON is invalid', () => {
    expect(loadNightRoleOrder(createStorage('{broken'))).toEqual([
      'guard', 'half_wolf', 'wolf', 'wolf_seer', 'seer', 'detective', 'witch', 'hunter',
    ]);
  });

  it('saves the detective lock rule independently from the call order', () => {
    const storage = createStorage();
    const settings = { detective: { lockNextRoundAfterClearCheck: false } };

    saveGameRoleSettings(settings, storage);

    expect(storage.getItem(GAME_ROLE_SETTINGS_STORAGE_KEY)).not.toBeNull();
    expect(loadGameRoleSettings(storage)).toEqual(settings);
  });
});
