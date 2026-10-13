import type { Game, Player, Round } from "./types";
import { isWolfTeam } from "./win";

export type NightRoleStep = 'guard' | 'wolf' | 'seer' | 'witch';
export type NightStep = NightRoleStep | 'done' | 'wait';

const NIGHT_ROLE_ORDER: NightRoleStep[] = ['guard', 'wolf', 'seer', 'witch'];

/**
 * Các lượt thực sự cần gọi trong đêm, dựa trên những vai còn sống.
 * Sói thường và Sói quỷ cùng dùng một lượt "wolf".
 */
export function getActiveNightRoleSteps(players: Player[]): NightRoleStep[] {
  return NIGHT_ROLE_ORDER.filter(step => {
    if (step === 'wolf') {
      return players.some(player => player.alive && isWolfTeam(player.role));
    }
    return players.some(player => player.alive && player.role === step);
  });
}

/**
 * Tìm lượt ban đêm kế tiếp. Những role không có trong ván hoặc đã chết được bỏ qua.
 */
export function getNightStep(currentRound: Round | undefined, players: Player[]): NightStep {
  if (!currentRound) return 'wait';

  for (const step of getActiveNightRoleSteps(players)) {
    if (step === 'guard' && currentRound.guardProtectTarget === undefined) return step;
    if (step === 'wolf' && currentRound.wolfTargets === undefined && currentRound.wolfTarget === undefined) return step;
    if (step === 'seer' && currentRound.seerCheck === undefined) return step;
    if (step === 'witch' && currentRound.witchSaved === undefined && currentRound.witchSavedTarget === undefined) return step;
  }

  return 'done';
}

/**
 * Gộp hành động ban đêm mà người chơi (online) đã ghi lên phòng vào ván cục bộ của Quản trò.
 * Chỉ bổ sung các bước mà Quản trò CHƯA có (không ghi đè), chỉ áp dụng cùng round & đang ban đêm.
 * Trả về ván mới nếu có thay đổi, hoặc null nếu không có gì cần gộp.
 */
export function mergeRemoteNightActions(local: Game, remote?: Game | null): Game | null {
  if (!remote || remote.id !== local.id || local.phase !== 'night' || remote.phase !== 'night') return null;
  const lr = local.rounds[local.rounds.length - 1];
  const rr = remote.rounds[remote.rounds.length - 1];
  if (!lr || !rr || lr.number !== rr.number) return null;

  const next: Round = { ...lr };
  let witchItems = local.witchItems;
  let changed = false;

  if (lr.guardProtectTarget === undefined && rr.guardProtectTarget !== undefined) {
    next.guardProtectTarget = rr.guardProtectTarget;
    changed = true;
  }

  const localWolfDone = lr.wolfTargets !== undefined || lr.wolfTarget !== undefined;
  if (!localWolfDone) {
    if (rr.wolfTargets !== undefined || rr.wolfTarget !== undefined) {
      next.wolfTarget = rr.wolfTarget;
      next.wolfTargets = rr.wolfTargets;
      changed = true;
    }
    if (rr.wolfVotes && JSON.stringify(rr.wolfVotes) !== JSON.stringify(lr.wolfVotes ?? {})) {
      next.wolfVotes = { ...(lr.wolfVotes ?? {}), ...rr.wolfVotes };
      changed = true;
    }
  }

  if (lr.seerCheck === undefined && rr.seerCheck !== undefined) {
    next.seerCheck = rr.seerCheck;
    changed = true;
  }

  const localWitchDone = lr.witchSaved !== undefined || lr.witchSavedTarget !== undefined;
  if (!localWitchDone && (rr.witchSaved !== undefined || rr.witchSavedTarget !== undefined)) {
    next.witchSaved = rr.witchSaved;
    next.witchSavedTarget = rr.witchSavedTarget;
    next.witchPoisonTarget = rr.witchPoisonTarget;
    witchItems = {
      saveLeft: Math.min(local.witchItems.saveLeft, remote.witchItems.saveLeft),
      poisonLeft: Math.min(local.witchItems.poisonLeft, remote.witchItems.poisonLeft),
    };
    changed = true;
  }

  if (!changed) return null;
  const rounds = [...local.rounds];
  rounds[rounds.length - 1] = next;
  return { ...local, rounds, witchItems };
}

/**
 * Xử lý kết quả trong đêm (ai chết)
 */
export function resolveNight(
  round: Partial<Pick<Round, 'wolfTarget' | 'wolfTargets' | 'witchSaved' | 'witchSavedTarget' | 'witchPoisonTarget' | 'guardProtectTarget'>>,
  players?: Player[]
): string[] {
  const deaths = new Set<string>();

  // Thu thập danh sách người bị sói cắn
  const wolfBites: string[] = [];
  if (round.wolfTargets && round.wolfTargets.length > 0) {
    for (const target of round.wolfTargets) {
      if (target && target !== 'none' && !wolfBites.includes(target)) {
        if (players) {
          const targetPlayer = players.find(p => p.id === target);
          if (targetPlayer && isWolfTeam(targetPlayer.role)) {
            continue;
          }
        }
        wolfBites.push(target);
      }
    }
  } else if (round.wolfTarget && round.wolfTarget !== 'none') {
    let isValid = true;
    if (players) {
      const targetPlayer = players.find(p => p.id === round.wolfTarget);
      if (targetPlayer && isWolfTeam(targetPlayer.role)) {
        isValid = false;
      }
    }
    if (isValid) {
      wolfBites.push(round.wolfTarget);
    }
  }

  // Xét từng người bị cắn
  for (const victimId of wolfBites) {
    const isProtected = round.guardProtectTarget === victimId;
    const isSaved = round.witchSavedTarget ? round.witchSavedTarget === victimId : (round.witchSaved && wolfBites.length <= 1);
    if (!isProtected && !isSaved) {
      deaths.add(victimId);
    }
  }

  // Phù thủy đầu độc
  if (round.witchPoisonTarget && round.witchPoisonTarget !== 'none') {
    let canPoison = true;
    if (players) {
      const poisonVictim = players.find(p => p.id === round.witchPoisonTarget);
      if (poisonVictim && poisonVictim.role === 'witch') {
        canPoison = false;
      }
    }
    if (canPoison) {
      deaths.add(round.witchPoisonTarget);
    }
  }

  return Array.from(deaths);
}
