import type { Game, LiveNightActions, RoomMember } from './types';

const MAX_INLINE_AVATAR_LENGTH = 2_048;

/**
 * Avatar base64 có thể nặng hàng chục KB. Không nhân bản nó vào room/gameData
 * vì mọi snapshot Firestore sẽ phải tải lại toàn bộ chuỗi trên điện thoại.
 */
export function sanitizeRoomAvatar(avatar?: string): string {
  if (!avatar || avatar.startsWith('data:') || avatar.length > MAX_INLINE_AVATAR_LENGTH) {
    return '';
  }
  return avatar;
}

export function sanitizeMembersForSync(members: RoomMember[] = []): RoomMember[] {
  return members.map(member => ({
    ...member,
    avatar: sanitizeRoomAvatar(member.avatar),
  }));
}

export function sanitizeGameForSync(game: Game): Game {
  return {
    ...game,
    players: game.players.map(player => ({
      ...player,
      avatar: sanitizeRoomAvatar(player.avatar),
    })),
  };
}

export function createLiveNightActionsBaseline(game: Game): LiveNightActions {
  return {
    gameId: game.id,
    roundNumber: game.rounds[game.rounds.length - 1]?.number ?? 1,
  };
}

/** Ghép payload thao tác nhỏ vào gameData để UI cũ không phải biết schema mới. */
export function applyLiveNightActions(game: Game, live?: LiveNightActions): Game {
  const lastIndex = game.rounds.length - 1;
  const currentRound = game.rounds[lastIndex];
  if (!live || !currentRound || live.gameId !== game.id || live.roundNumber !== currentRound.number) {
    return game;
  }

  const mergedRound = {
    ...currentRound,
    ...(live.guardProtectTarget !== undefined ? { guardProtectTarget: live.guardProtectTarget } : {}),
    ...(live.wolfTarget !== undefined ? { wolfTarget: live.wolfTarget } : {}),
    ...(live.wolfTargets !== undefined ? { wolfTargets: live.wolfTargets } : {}),
    ...(live.wolfVotes !== undefined
      ? { wolfVotes: { ...(currentRound.wolfVotes || {}), ...live.wolfVotes } }
      : {}),
    ...(live.seerCheck !== undefined ? { seerCheck: live.seerCheck } : {}),
    ...(live.detectiveChecks !== undefined
      ? { detectiveChecks: { ...(currentRound.detectiveChecks || {}), ...live.detectiveChecks } }
      : {}),
    ...(live.witchSaved !== undefined ? { witchSaved: live.witchSaved } : {}),
    ...(live.witchSavedTarget !== undefined ? { witchSavedTarget: live.witchSavedTarget } : {}),
    ...(live.witchPoisonTarget !== undefined ? { witchPoisonTarget: live.witchPoisonTarget } : {}),
    ...(live.hunterTargets !== undefined
      ? { hunterTargets: { ...(currentRound.hunterTargets || {}), ...live.hunterTargets } }
      : {}),
    ...(live.skippedDeadRoleSteps !== undefined
      ? { skippedDeadRoleSteps: [...new Set([
        ...(currentRound.skippedDeadRoleSteps || []),
        ...live.skippedDeadRoleSteps,
      ])] }
      : {}),
  };

  const rounds = [...game.rounds];
  rounds[lastIndex] = mergedRound;
  return {
    ...game,
    rounds,
    ...(live.witchItems !== undefined ? { witchItems: live.witchItems } : {}),
  };
}
