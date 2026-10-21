import { normalizeNightRoleOrder } from '../game/nightRoleOrder';
import type { NightRoleStep } from '../game/types';
import type { GameRoleSettings } from '../game/types';
import { normalizeGameRoleSettings } from '../game/roleSettings';

export const NIGHT_ROLE_ORDER_STORAGE_KEY = 'werewolf_night_role_order';
export const GAME_ROLE_SETTINGS_STORAGE_KEY = 'werewolf_role_settings';

interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function getBrowserStorage(): SettingsStorage | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage;
}

export function loadNightRoleOrder(storage = getBrowserStorage()): NightRoleStep[] {
  if (!storage) return normalizeNightRoleOrder(undefined);
  try {
    const rawValue = storage.getItem(NIGHT_ROLE_ORDER_STORAGE_KEY);
    return normalizeNightRoleOrder(rawValue ? JSON.parse(rawValue) : undefined);
  } catch {
    return normalizeNightRoleOrder(undefined);
  }
}

export function saveNightRoleOrder(
  order: readonly NightRoleStep[],
  storage = getBrowserStorage(),
): NightRoleStep[] {
  const normalized = normalizeNightRoleOrder(order);
  storage?.setItem(NIGHT_ROLE_ORDER_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function loadGameRoleSettings(storage = getBrowserStorage()): GameRoleSettings {
  if (!storage) return normalizeGameRoleSettings(undefined);
  try {
    const rawValue = storage.getItem(GAME_ROLE_SETTINGS_STORAGE_KEY);
    return normalizeGameRoleSettings(rawValue ? JSON.parse(rawValue) : undefined);
  } catch {
    return normalizeGameRoleSettings(undefined);
  }
}

export function saveGameRoleSettings(
  settings: GameRoleSettings,
  storage = getBrowserStorage(),
): GameRoleSettings {
  const normalized = normalizeGameRoleSettings(settings);
  storage?.setItem(GAME_ROLE_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}
