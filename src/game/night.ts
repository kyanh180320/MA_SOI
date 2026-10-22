import type { Game, NightRoleStep, Player, Round } from "./types";
import { isWolfAligned } from "./win";
import { normalizeNightRoleOrder } from './nightRoleOrder';

export type { NightRoleStep } from "./types";
export type NightStep = NightRoleStep | 'done' | 'wait';

export function getWolfTargetLimit(players: readonly Player[]): 1 | 2 {
  return players.some(player => player.alive && player.role === 'wolf_demon') ? 2 : 1;
}

/**
 * Các lượt thực sự cần gọi trong đêm, dựa trên những vai còn sống.
 * Mọi vai phe Sói cùng dùng lượt "wolf"; Sói Tiên Tri có thêm lượt soi riêng.
 */
export function getActiveNightRoleSteps(
  players: Player[],
  roleOrder?: readonly NightRoleStep[],
): NightRoleStep[] {
  return normalizeNightRoleOrder(roleOrder).filter(step => hasLivingNightRole(players, step));
}

export function hasLivingNightRole(players: Player[], step: NightRoleStep): boolean {
  if (step === 'wolf') {
    return players.some(player => player.alive && isWolfAligned(player));
  }
  return players.some(player => player.alive && player.role === step);
}

/**
 * Danh sách icon cố định theo cấu hình đầu ván. Trạng thái sống/chết không được
 * làm mất icon vì điều đó sẽ vô tình tiết lộ role của người vừa bị loại.
 */
export function getConfiguredNightRoleSteps(
  players: Player[],
  roleOrder?: readonly NightRoleStep[],
): NightRoleStep[] {
  return normalizeNightRoleOrder(roleOrder).filter(step => {
    if (step === 'wolf') {
      return players.some(player => isWolfAligned(player));
    }
    return players.some(player => player.role === step);
  });
}

/**
 * Tìm lượt ban đêm kế tiếp. Role đã cấu hình nhưng không còn người sống vẫn
 * dừng lại cho đến khi Quản trò xác nhận đã gọi giả để không lộ thông tin.
 */
export function getNightStep(
  currentRound: Round | undefined,
  players: Player[],
  roleOrder?: readonly NightRoleStep[],
): NightStep {
  if (!currentRound) return 'wait';

  for (const step of getConfiguredNightRoleSteps(players, roleOrder)) {
    if (!hasLivingNightRole(players, step)) {
      if (!currentRound.skippedDeadRoleSteps?.includes(step)) return step;
      continue;
    }
    if (step === 'guard' && currentRound.guardProtectTarget === undefined) return step;
    if (step === 'half_wolf') {
      const aliveHalfWolves = players.filter(player => player.alive && player.role === 'half_wolf');
      if (aliveHalfWolves.some(player => !currentRound.halfWolfAcknowledgements?.includes(player.id))) return step;
    }
    if (step === 'wolf' && currentRound.wolfTargets === undefined && currentRound.wolfTarget === undefined) return step;
    if (step === 'wolf_seer') {
      const aliveWolfSeers = players.filter(player => player.alive && player.role === 'wolf_seer');
      if (aliveWolfSeers.some(wolfSeer => currentRound.wolfSeerChecks?.[wolfSeer.id] === undefined)) return step;
    }
    if (step === 'seer' && currentRound.seerCheck === undefined) return step;
    if (step === 'detective') {
      const aliveDetectives = players.filter(player => player.alive && player.role === 'detective');
      if (aliveDetectives.some(detective => currentRound.detectiveChecks?.[detective.id] === undefined)) return step;
    }
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

  if (rr.halfWolfAcknowledgements) {
    const halfWolfAcknowledgements = [...new Set([
      ...(lr.halfWolfAcknowledgements ?? []),
      ...rr.halfWolfAcknowledgements,
    ])];
    if (halfWolfAcknowledgements.length !== (lr.halfWolfAcknowledgements?.length ?? 0)) {
      next.halfWolfAcknowledgements = halfWolfAcknowledgements;
      changed = true;
    }
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

  if (rr.wolfSeerChecks) {
    const mergedWolfSeerChecks = { ...(lr.wolfSeerChecks ?? {}), ...rr.wolfSeerChecks };
    if (JSON.stringify(mergedWolfSeerChecks) !== JSON.stringify(lr.wolfSeerChecks ?? {})) {
      next.wolfSeerChecks = mergedWolfSeerChecks;
      changed = true;
    }
  }

  if (rr.detectiveChecks) {
    const mergedDetectiveChecks = { ...(lr.detectiveChecks ?? {}), ...rr.detectiveChecks };
    if (JSON.stringify(mergedDetectiveChecks) !== JSON.stringify(lr.detectiveChecks ?? {})) {
      next.detectiveChecks = mergedDetectiveChecks;
      changed = true;
    }
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
function getWolfBiteTargets(
  round: Partial<Pick<Round, 'wolfTarget' | 'wolfTargets' | 'witchSaved' | 'witchSavedTarget' | 'witchPoisonTarget' | 'guardProtectTarget'>>,
  players?: readonly Player[],
): string[] {
  const wolfBites: string[] = [];
  if (round.wolfTargets && round.wolfTargets.length > 0) {
    const maxTargets = players ? getWolfTargetLimit(players) : round.wolfTargets.length;
    for (const target of round.wolfTargets) {
      if (wolfBites.length >= maxTargets) break;
      if (target && target !== 'none' && !wolfBites.includes(target)) {
        if (players) {
          const targetPlayer = players.find(p => p.id === target);
          if (targetPlayer && isWolfAligned(targetPlayer)) {
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
      if (targetPlayer && isWolfAligned(targetPlayer)) {
        isValid = false;
      }
    }
    if (isValid) {
      wolfBites.push(round.wolfTarget);
    }
  }

  return wolfBites;
}

export function getSuccessfulWolfBiteTargets(
  round: Partial<Pick<Round, 'wolfTarget' | 'wolfTargets' | 'witchSaved' | 'witchSavedTarget' | 'guardProtectTarget'>>,
  players?: readonly Player[],
): string[] {
  const wolfBites = getWolfBiteTargets(round, players);
  return wolfBites.filter(victimId => {
    const isProtected = round.guardProtectTarget === victimId;
    const isSaved = round.witchSavedTarget
      ? round.witchSavedTarget === victimId
      : Boolean(round.witchSaved && wolfBites.length <= 1);
    return !isProtected && !isSaved;
  });
}

/**
 * Những người thực sự có nguy cơ chết vì cú cắn và được phép hiện cho Phù Thủy.
 * Bán Sói chưa chuyển hóa sống sót để hóa Sói, nên không phải mục tiêu của bình cứu.
 */
export function getWitchRescueCandidates(
  round: Partial<Pick<Round, 'wolfTarget' | 'wolfTargets' | 'guardProtectTarget'>>,
  players: readonly Player[],
): string[] {
  return getWolfBiteTargets(round, players).filter(victimId => {
    const victim = players.find(player => player.id === victimId);
    if (!victim?.alive || round.guardProtectTarget === victimId) return false;
    return victim.role !== 'half_wolf' || isWolfAligned(victim);
  });
}

export function resolveNight(
  round: Partial<Pick<Round, 'wolfTarget' | 'wolfTargets' | 'witchSaved' | 'witchSavedTarget' | 'witchPoisonTarget' | 'guardProtectTarget'>>,
  players?: Player[]
): string[] {
  const deaths = new Set<string>();

  // Bán Sói sống sót qua cú cắn thành công và sẽ chuyển hóa ở cuối đêm.
  const successfulWolfBites = getSuccessfulWolfBiteTargets(round, players);
  for (const victimId of successfulWolfBites) {
    const victim = players?.find(player => player.id === victimId);
    if (victim?.role !== 'half_wolf' || isWolfAligned(victim)) deaths.add(victimId);
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
