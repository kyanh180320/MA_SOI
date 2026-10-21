import { normalizeNightRoleOrder } from '../game/nightRoleOrder';
import type { NightRoleStep } from '../game/types';

export const NIGHT_ROLE_ORDER_STORAGE_KEY = 'werewolf_night_role_order';

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
