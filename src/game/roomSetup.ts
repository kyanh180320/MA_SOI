import type { Role, RoleDistribution, RoomSetupConfig } from './types';

const ALL_ROLES: Role[] = [
  'wolf',
  'wolf_demon',
  'villager',
  'seer',
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
    const count = distribution?.[role];
    if (!Number.isInteger(count) || count < 0) return false;
    totalRoles += count;
  }

  const totalWolves = distribution.wolf + distribution.wolf_demon;
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
  if (!isValidRoleDistribution(config.distribution, actualPlayerCount)) return null;
  return { ...config.distribution };
}
