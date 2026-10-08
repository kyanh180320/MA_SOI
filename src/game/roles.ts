import type { Role, Player } from "./types";
import { RULES } from "./config";

export function getRoleDistribution(n: number, options?: { randomize?: boolean }): Record<Role, number> {
  if (n < RULES.minPlayers || n > RULES.maxPlayers) {
    throw new Error(`Số lượng người chơi phải từ ${RULES.minPlayers} đến ${RULES.maxPlayers}`);
  }

  // Nếu không yêu cầu ngẫu nhiên cân bằng, trả về phân bổ cơ bản mặc định
  if (!options?.randomize) {
    const wolves = Math.max(2, Math.floor(n / 3));
    const seer = 1;
    const witch = n >= 7 ? 1 : 0;
    const guard = n >= 9 ? 1 : 0;
    const villager = n - wolves - seer - witch - guard;

    return {
      wolf: wolves,
      wolf_demon: 0,
      seer,
      witch,
      guard,
      hunter: 0,
      villager
    };
  }

  // Thuật toán cân bằng linh hoạt: Không nhất thiết phải có đủ mọi role
  // 1. Phân bổ phe Sói
  let wolfDemonCount = 0;
  let normalWolfCount = Math.max(2, Math.floor(n / 3));

  // Sói quỷ có thể xuất hiện khi từ 8 người trở lên (tỉ lệ 40%)
  if (n >= 8 && Math.random() < 0.4) {
    wolfDemonCount = 1;
    normalWolfCount = Math.max(1, normalWolfCount - 1);
  }

  const totalWolves = wolfDemonCount + normalWolfCount;

  // 2. Phân bổ phe Dân đặc biệt (Tiên tri, Phù thủy, Bảo vệ, Thợ săn)
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
  const specialPool: (Role)[] = ["seer", "witch", "guard", "hunter"];
  // Shuffle pool
  for (let i = specialPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [specialPool[i], specialPool[j]] = [specialPool[j], specialPool[i]];
  }

  const selectedSpecials = new Set(specialPool.slice(0, specialCount));

  const seer = selectedSpecials.has("seer") ? 1 : 0;
  const witch = selectedSpecials.has("witch") ? 1 : 0;
  const guard = selectedSpecials.has("guard") ? 1 : 0;
  const hunter = selectedSpecials.has("hunter") ? 1 : 0;

  const villager = n - totalWolves - seer - witch - guard - hunter;

  return {
    wolf: normalWolfCount,
    wolf_demon: wolfDemonCount,
    seer,
    witch,
    guard,
    hunter,
    villager
  };
}

// Fisher-Yates shuffle algorithm
export function assignRoles(players: Omit<Player, "role" | "alive">[], distribution: Record<Role, number>): Player[] {
  const rolesArray: Role[] = [];
  for (const [role, count] of Object.entries(distribution)) {
    for (let i = 0; i < count; i++) {
      rolesArray.push(role as Role);
    }
  }

  if (rolesArray.length !== players.length) {
    throw new Error("Số lượng vai không khớp với số lượng người chơi");
  }

  // Khởi tạo clone để không làm thay đổi mảng gốc
  const shuffledRoles = [...rolesArray];

  // Shuffle (Fisher-Yates)
  for (let i = shuffledRoles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledRoles[i], shuffledRoles[j]] = [shuffledRoles[j], shuffledRoles[i]];
  }

  return players.map((p, index) => ({
    ...p,
    role: shuffledRoles[index],
    alive: true,
  }));
}
