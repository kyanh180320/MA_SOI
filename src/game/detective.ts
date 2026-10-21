import type { DetectiveCheck, Game, Player } from './types';
import { normalizeGameRoleSettings } from './roleSettings';
import { isWolfTeam } from './win';

export const DETECTIVE_MAX_TARGETS = 3;

export function getDetectiveTargetLimit(players: Player[], detectiveId: string): number {
  return Math.min(
    DETECTIVE_MAX_TARGETS,
    players.filter(player => player.alive && player.id !== detectiveId).length,
  );
}

export function createDetectiveCheck(
  players: Player[],
  detectiveId: string,
  targetIds: readonly string[],
): DetectiveCheck {
  const validTargets = [...new Set(targetIds)].filter(targetId => (
    targetId !== detectiveId
    && players.some(player => player.id === targetId && player.alive)
  )).slice(0, DETECTIVE_MAX_TARGETS);

  return {
    targets: validTargets,
    hasWolf: validTargets.some(targetId => {
      const target = players.find(player => player.id === targetId);
      return target ? isWolfTeam(target.role) : false;
    }),
  };
}

/** Khóa đúng một vòng sau khi Thám tử soi đủ 3 người và không gặp Sói. */
export function isDetectiveLockedForRound(
  game: Game,
  detectiveId: string,
  roundIndex = game.rounds.length - 1,
): boolean {
  const settings = normalizeGameRoleSettings(game.roleSettings);
  if (!settings.detective.lockNextRoundAfterClearCheck || roundIndex <= 0) return false;

  const previousCheck = game.rounds[roundIndex - 1]?.detectiveChecks?.[detectiveId];
  return Boolean(
    previousCheck
    && !previousCheck.locked
    && previousCheck.targets.length === DETECTIVE_MAX_TARGETS
    && !previousCheck.hasWolf,
  );
}
