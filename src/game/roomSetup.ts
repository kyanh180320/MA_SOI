import type { Role, RoleDistribution, RoomSetupConfig } from './types';

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
