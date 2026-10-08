import type { Role, Player } from "./types";
import { RULES } from "./config";

export function getRoleDistribution(n: number): Record<Role, number> {
  if (n < RULES.minPlayers || n > RULES.maxPlayers) {
    throw new Error(`Số lượng người chơi phải từ ${RULES.minPlayers} đến ${RULES.maxPlayers}`);
  }
  const wolves = Math.max(2, Math.floor(n / 3));
  const seer = 1; // n >= 6 always true here
  const witch = n >= 7 ? 1 : 0;
  const guard = n >= 9 ? 1 : 0;
  const villager = n - wolves - seer - witch - guard;

  return { wolf: wolves, seer, witch, guard, villager };
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
