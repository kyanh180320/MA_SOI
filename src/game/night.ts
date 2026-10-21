import type { Game, NightRoleStep, Player, Round } from "./types";
import { isWolfTeam } from "./win";

export type { NightRoleStep } from "./types";
export type NightStep = NightRoleStep | 'done' | 'wait';

const NIGHT_ROLE_ORDER: NightRoleStep[] = ['guard', 'wolf', 'seer', 'witch', 'hunter'];

export interface WolfPackSelection {
  targetIds: string[];
  maxTargets: 1 | 2;
  allWolvesVoted: boolean;
  exceedsLimit: boolean;
}

export function getWolfTargetLimit(players: Player[]): 1 | 2 {
  return players.some(player => player.alive && player.role === 'wolf_demon') ? 2 : 1;
}

/**
 * Tổng hợp lựa chọn riêng của từng Sói thành quyết định chung của cả bầy.
 * Chỉ nhận mục tiêu còn sống và không thuộc phe Sói.
 */
export function getWolfPackSelection(
  players: Player[],
  votes: Record<string, string[]> = {},
): WolfPackSelection {
  const aliveWolves = players.filter(player => player.alive && isWolfTeam(player.role));
  const validTargetIds = new Set(
    players
      .filter(player => player.alive && !isWolfTeam(player.role))
      .map(player => player.id),
  );
  const targetIds = [...new Set(
    aliveWolves.flatMap(wolf => (votes[wolf.id] ?? []).filter(targetId => validTargetIds.has(targetId))),
  )];
  const maxTargets = getWolfTargetLimit(players);

  return {
    targetIds,
    maxTargets,
    allWolvesVoted: aliveWolves.length > 0
      && aliveWolves.every(wolf => (votes[wolf.id] ?? []).some(targetId => validTargetIds.has(targetId))),
    exceedsLimit: targetIds.length > maxTargets,
  };
}

/**
 * Các lượt thực sự cần gọi trong đêm, dựa trên những vai còn sống.
 * Sói thường và Sói quỷ cùng dùng một lượt "wolf".
 */
export function getActiveNightRoleSteps(players: Player[]): NightRoleStep[] {
  return NIGHT_ROLE_ORDER.filter(step => hasLivingNightRole(players, step));
}

export function hasLivingNightRole(players: Player[], step: NightRoleStep): boolean {
  if (step === 'wolf') {
    return players.some(player => player.alive && isWolfTeam(player.role));
  }
  return players.some(player => player.alive && player.role === step);
}

/**
 * Danh sách icon cố định theo cấu hình đầu ván. Trạng thái sống/chết không được
 * làm mất icon vì điều đó sẽ vô tình tiết lộ role của người vừa bị loại.
 */
export function getConfiguredNightRoleSteps(players: Player[]): NightRoleStep[] {
  return NIGHT_ROLE_ORDER.filter(step => {
    if (step === 'wolf') {
      return players.some(player => isWolfTeam(player.role));
    }
    return players.some(player => player.role === step);
  });
}

/**
 * Tìm lượt ban đêm kế tiếp. Role đã cấu hình nhưng không còn người sống vẫn
 * dừng lại cho đến khi Quản trò xác nhận đã gọi giả để không lộ thông tin.
 */
export function getNightStep(currentRound: Round | undefined, players: Player[]): NightStep {
  if (!currentRound) return 'wait';

  for (const step of getConfiguredNightRoleSteps(players)) {
    if (!hasLivingNightRole(players, step)) {
      if (!currentRound.skippedDeadRoleSteps?.includes(step)) return step;
      continue;
    }
    if (step === 'guard' && currentRound.guardProtectTarget === undefined) return step;
    if (step === 'wolf' && currentRound.wolfTargets === undefined && currentRound.wolfTarget === undefined) return step;
    if (step === 'seer' && currentRound.seerCheck === undefined) return step;
    if (step === 'witch' && currentRound.witchSaved === undefined && currentRound.witchSavedTarget === undefined) return step;
    if (step === 'hunter') {
      const aliveHunters = players.filter(player => player.alive && player.role === 'hunter');
      if (aliveHunters.some(hunter => currentRound.hunterTargets?.[hunter.id] === undefined)) return step;
    }
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

  if (rr.hunterTargets) {
    const mergedHunterTargets = { ...(lr.hunterTargets ?? {}), ...rr.hunterTargets };
    if (JSON.stringify(mergedHunterTargets) !== JSON.stringify(lr.hunterTargets ?? {})) {
      next.hunterTargets = mergedHunterTargets;
      changed = true;
    }
  }

  if (rr.skippedDeadRoleSteps) {
    const skippedDeadRoleSteps = [...new Set([
      ...(lr.skippedDeadRoleSteps ?? []),
      ...rr.skippedDeadRoleSteps,
    ])];
    if (skippedDeadRoleSteps.length !== (lr.skippedDeadRoleSteps?.length ?? 0)) {
      next.skippedDeadRoleSteps = skippedDeadRoleSteps;
      changed = true;
    }
  }

  if (!changed) return null;
  const rounds = [...local.rounds];
  rounds[rounds.length - 1] = next;
  return { ...local, rounds, witchItems };
}

export interface HunterShotResolution {
  deaths: string[];
  shots: Record<string, string>;
  unresolvedHunterIds: string[];
}

/**
 * Áp dụng lựa chọn chết cùng của Thợ săn, gồm cả chuỗi Thợ săn bắn trúng
 * Thợ săn khác. Dữ liệu cũ chưa có lựa chọn được trả về để Quản trò xử lý tay.
 */
export function resolveHunterShots(
  initialDeaths: string[],
  round: Pick<Round, 'hunterTargets'>,
  players: Player[],
): HunterShotResolution {
  const deaths = new Set(initialDeaths);
  const pendingDeaths = [...initialDeaths];
  const shots: Record<string, string> = {};
  const unresolvedHunterIds: string[] = [];

  while (pendingDeaths.length > 0) {
    const deadPlayerId = pendingDeaths.shift();
    const deadPlayer = players.find(player => player.id === deadPlayerId);
    if (!deadPlayer || deadPlayer.role !== 'hunter') continue;

    const targetId = round.hunterTargets?.[deadPlayer.id];
    if (targetId === undefined) {
      unresolvedHunterIds.push(deadPlayer.id);
      continue;
    }
    if (targetId === 'none' || targetId === deadPlayer.id) continue;

    const target = players.find(player => player.id === targetId);
    if (!target || !target.alive) continue;

    shots[deadPlayer.id] = targetId;
    if (!deaths.has(targetId)) {
      deaths.add(targetId);
      pendingDeaths.push(targetId);
    }
  }

  return { deaths: [...deaths], shots, unresolvedHunterIds };
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
    const maxTargets = players ? getWolfTargetLimit(players) : round.wolfTargets.length;
    for (const target of round.wolfTargets) {
      if (wolfBites.length >= maxTargets) break;
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
