import type { Role, RoleAssignments, RoleDistribution, RoomSetupConfig } from './types';

const ALL_ROLES: Role[] = [
  'wolf',
  'wolf_demon',
  'wolf_seer',
  'villager',
  'seer',
  'detective',
  'witch',
  'guard',
  'hunter',
];

function emptyRoleDistribution(): RoleDistribution {
  return Object.fromEntries(ALL_ROLES.map(role => [role, 0])) as RoleDistribution;
}

export function hasSamePlayerRoster(
  expectedPlayerIds: readonly string[],
  actualPlayerIds: readonly string[],
): boolean {
  if (expectedPlayerIds.length !== actualPlayerIds.length) return false;
  const expectedIds = new Set(expectedPlayerIds);
  const actualIds = new Set(actualPlayerIds);
  return expectedIds.size === expectedPlayerIds.length
    && actualIds.size === actualPlayerIds.length
    && actualPlayerIds.every(playerId => expectedIds.has(playerId));
}

export function getRoleAssignmentDistribution(
  assignments: Readonly<RoleAssignments>,
  playerIds: readonly string[],
): RoleDistribution | null {
  const expectedIds = new Set(playerIds);
  const assignedIds = Object.keys(assignments);
  if (expectedIds.size !== playerIds.length || assignedIds.length !== playerIds.length) return null;
  if (assignedIds.some(id => !expectedIds.has(id))) return null;

  const distribution = emptyRoleDistribution();
  for (const playerId of playerIds) {
    const role = assignments[playerId];
    if (!ALL_ROLES.includes(role)) return null;
    distribution[role] += 1;
  }
  return distribution;
}

export function createRoleAssignmentsFromDistribution(
  playerIds: readonly string[],
  distribution: RoleDistribution,
): RoleAssignments | null {
  if (!isValidRoleDistribution(distribution, playerIds.length)) return null;
  const roles = ALL_ROLES.flatMap(role => Array<Role>(distribution[role]).fill(role));
  return Object.fromEntries(playerIds.map((playerId, index) => [playerId, roles[index]]));
}

function hasSameDistribution(left: RoleDistribution, right: RoleDistribution): boolean {
  return ALL_ROLES.every(role => left[role] === right[role]);
}

export function isValidRoleDistribution(
  distribution: RoleDistribution,
  playerCount: number,
): boolean {
  if (!Number.isInteger(playerCount) || playerCount <= 0) return false;

  let totalRoles = 0;
  for (const role of ALL_ROLES) {
    const count = distribution?.[role] ?? 0;
    if (!Number.isInteger(count) || count < 0) return false;
    totalRoles += count;
  }

  const totalWolves = distribution.wolf + distribution.wolf_demon + distribution.wolf_seer;
  return totalRoles === playerCount && totalWolves > 0 && totalWolves < playerCount;
}

/**
 * Chỉ dùng cấu hình đã lưu khi nó còn khớp chính xác số người hiện tại.
 * Trả về bản sao để việc chia vai không thể mutate snapshot Firestore.
 */
export function getValidRoomSetupDistribution(
  config: RoomSetupConfig | undefined,
  actualPlayerCount: number,
): RoleDistribution | null {
  if (!config || config.playerCount !== actualPlayerCount) return null;
  const normalizedDistribution: RoleDistribution = {
    wolf: config.distribution.wolf ?? 0,
    wolf_demon: config.distribution.wolf_demon ?? 0,
    wolf_seer: config.distribution.wolf_seer ?? 0,
    villager: config.distribution.villager ?? 0,
    seer: config.distribution.seer ?? 0,
    detective: config.distribution.detective ?? 0,
    witch: config.distribution.witch ?? 0,
    guard: config.distribution.guard ?? 0,
    hunter: config.distribution.hunter ?? 0,
  };
  if (!isValidRoleDistribution(normalizedDistribution, actualPlayerCount)) return null;
  return normalizedDistribution;
}

/**
 * Chỉ nhận gán vai test khi đủ đúng UID hiện tại và số lượng từng vai vẫn khớp
 * distribution đã lưu. Trả về bản sao để caller không mutate snapshot.
 */
export function getValidRoomTestRoleAssignments(
  config: RoomSetupConfig | undefined,
  actualPlayerIds: readonly string[],
): RoleAssignments | null {
  if (!config?.testRoleAssignments || config.playerCount !== actualPlayerIds.length) return null;
  const distribution = getValidRoomSetupDistribution(config, actualPlayerIds.length);
  const assignmentDistribution = getRoleAssignmentDistribution(
    config.testRoleAssignments,
    actualPlayerIds,
  );
  if (!distribution || !assignmentDistribution || !hasSameDistribution(distribution, assignmentDistribution)) {
    return null;
  }
  return { ...config.testRoleAssignments };
}
