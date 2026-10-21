import type { GameRoleSettings } from './types';

export const DEFAULT_GAME_ROLE_SETTINGS: GameRoleSettings = {
  detective: {
    lockNextRoundAfterClearCheck: true,
  },
};

export function normalizeGameRoleSettings(value: unknown): GameRoleSettings {
  const candidate = value as Partial<GameRoleSettings> | null | undefined;
  return {
    detective: {
      lockNextRoundAfterClearCheck:
        typeof candidate?.detective?.lockNextRoundAfterClearCheck === 'boolean'
          ? candidate.detective.lockNextRoundAfterClearCheck
          : DEFAULT_GAME_ROLE_SETTINGS.detective.lockNextRoundAfterClearCheck,
    },
  };
}
