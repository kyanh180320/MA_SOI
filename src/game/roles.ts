import type { Role, Player } from "./types";
import { RULES } from "./config";

export interface AssignRolesOptions {
  previousPlayers?: ReadonlyArray<Pick<Player, "id" | "role">>;
  random?: () => number;
}

export function getRoleDistribution(n: number, options?: { randomize?: boolean }): Record<Role, number> {
  if (n < RULES.minPlayers || n > RULES.maxPlayers) {
    throw new Error(`Số lượng người chơi phải từ ${RULES.minPlayers} đến ${RULES.maxPlayers}`);
  }

  // Nếu không yêu cầu ngẫu nhiên cân bằng, trả về phân bổ cơ bản mặc định
  if (!options?.randomize) {
    const wolves = n <= 5 ? 1 : Math.max(2, Math.floor(n / 3));
    const seer = 1;
    const detective = 0;
    const witch = n >= 7 ? 1 : 0;
    const guard = n >= 9 ? 1 : 0;
    const villager = n - wolves - seer - detective - witch - guard;

    return {
      wolf: wolves,
      wolf_demon: 0,
      wolf_seer: 0,
      seer,
      detective,
      witch,
      guard,
      hunter: 0,
      villager
    };
  }

  // Thuật toán cân bằng linh hoạt: Không nhất thiết phải có đủ mọi role
  // 1. Phân bổ phe Sói
  let wolfDemonCount = 0;
  let wolfSeerCount = 0;
  let normalWolfCount = n <= 5 ? 1 : Math.max(2, Math.floor(n / 3));

  // Giữ tổng tỉ lệ Sói đặc biệt ở 40%, rồi chia đều giữa Sói Quỷ và Sói Tiên Tri.
  if (n >= 8 && Math.random() < 0.4) {
    if (Math.random() < 0.5) wolfDemonCount = 1;
    else wolfSeerCount = 1;
    normalWolfCount = Math.max(1, normalWolfCount - 1);
  }

  const totalWolves = wolfDemonCount + wolfSeerCount + normalWolfCount;

  // 2. Phân bổ phe Dân đặc biệt (Tiên tri, Thám tử, Phù thủy, Bảo vệ, Thợ săn)
  // Số lượng vai đặc biệt được chọn tùy theo số người và sự hiện diện của Sói quỷ
  let specialCount = 1;
  if (n >= 7 && n <= 8) specialCount = wolfDemonCount > 0 ? 3 : 2;
  else if (n >= 9 && n <= 11) specialCount = wolfDemonCount > 0 ? 3 : (Math.random() < 0.5 ? 2 : 3);
  else if (n >= 12 && n <= 15) specialCount = Math.random() < 0.5 ? 3 : 4;
  else if (n > 15) specialCount = 4;

  // Đảm bảo còn ít nhất 1 dân làng thường
  const maxSpecialAllowed = Math.max(1, n - totalWolves - 1);
  specialCount = Math.min(specialCount, maxSpecialAllowed);

  // Xáo trộn danh sách vai đặc biệt để chọn ra subset (sẽ có role bị thiếu để game đa dạng)
  const specialPool: Role[] = ["seer", "detective", "witch", "guard", "hunter"];
  // Shuffle pool
  for (let i = specialPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [specialPool[i], specialPool[j]] = [specialPool[j], specialPool[i]];
  }

  const selectedSpecials = new Set(specialPool.slice(0, specialCount));

  const seer = selectedSpecials.has("seer") ? 1 : 0;
  const detective = selectedSpecials.has("detective") ? 1 : 0;
  const witch = selectedSpecials.has("witch") ? 1 : 0;
  const guard = selectedSpecials.has("guard") ? 1 : 0;
  const hunter = selectedSpecials.has("hunter") ? 1 : 0;

  const villager = n - totalWolves - seer - detective - witch - guard - hunter;

  return {
    wolf: normalWolfCount,
    wolf_demon: wolfDemonCount,
    wolf_seer: wolfSeerCount,
    seer,
    detective,
    witch,
    guard,
    hunter,
    villager
  };
}

function shuffleRoles(roles: Role[], random: () => number): Role[] {
  const shuffled = [...roles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Tìm cách chia có số người trùng đúng vai ván trước thấp nhất. Khi có nhiều
 * phương án cùng tối ưu, chọn ngẫu nhiên để người chơi không đoán được quy luật.
 */
function assignRolesWithMinimumRepeats(
  players: Omit<Player, "role" | "alive">[],
  roles: Role[],
  previousRoles: ReadonlyMap<string, Role>,
  random: () => number,
): Role[] {
  const roleTypes = [...new Set(roles)];
  const initialCounts = roleTypes.map(role => roles.filter(candidate => candidate === role).length);
  const memo = new Map<string, number>();

  const getMinimumRepeats = (playerIndex: number, counts: number[]): number => {
    if (playerIndex >= players.length) return 0;
    const key = `${playerIndex}|${counts.join(',')}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;

    let minimum = Number.POSITIVE_INFINITY;
    for (let roleIndex = 0; roleIndex < roleTypes.length; roleIndex++) {
      if (counts[roleIndex] === 0) continue;
      const nextCounts = [...counts];
      nextCounts[roleIndex] -= 1;
      const repeated = previousRoles.get(players[playerIndex].id) === roleTypes[roleIndex] ? 1 : 0;
      minimum = Math.min(minimum, repeated + getMinimumRepeats(playerIndex + 1, nextCounts));
    }

    memo.set(key, minimum);
    return minimum;
  };

  const assignedRoles: Role[] = [];
  const remainingCounts = [...initialCounts];

  for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
    const currentMinimum = getMinimumRepeats(playerIndex, remainingCounts);
    const optimalRoleIndexes: number[] = [];

    for (let roleIndex = 0; roleIndex < roleTypes.length; roleIndex++) {
      if (remainingCounts[roleIndex] === 0) continue;
      const nextCounts = [...remainingCounts];
      nextCounts[roleIndex] -= 1;
      const repeated = previousRoles.get(players[playerIndex].id) === roleTypes[roleIndex] ? 1 : 0;
      if (repeated + getMinimumRepeats(playerIndex + 1, nextCounts) === currentMinimum) {
        optimalRoleIndexes.push(roleIndex);
      }
    }

    const selectedIndex = optimalRoleIndexes[Math.floor(random() * optimalRoleIndexes.length)];
    assignedRoles.push(roleTypes[selectedIndex]);
    remainingCounts[selectedIndex] -= 1;
  }

  return assignedRoles;
}

// Fisher-Yates cho ván đầu; tối ưu số lần trùng vai nếu có dữ liệu ván trước.
export function assignRoles(
  players: Omit<Player, "role" | "alive">[],
  distribution: Record<Role, number>,
  options?: AssignRolesOptions,
): Player[] {
  const rolesArray: Role[] = [];
  for (const [role, count] of Object.entries(distribution)) {
    for (let i = 0; i < count; i++) {
      rolesArray.push(role as Role);
    }
  }

  if (rolesArray.length !== players.length) {
    throw new Error("Số lượng vai không khớp với số lượng người chơi");
  }

  const random = options?.random ?? Math.random;
  const previousRoles = new Map(options?.previousPlayers?.map(player => [player.id, player.role]));
  const rolesToAssign = previousRoles.size > 0
    ? assignRolesWithMinimumRepeats(players, rolesArray, previousRoles, random)
    : shuffleRoles(rolesArray, random);

  return players.map((p, index) => ({
    ...p,
    role: rolesToAssign[index],
    alive: true,
  }));
}
