import { RULES } from './config';
import { assignRoles } from './roles';
import { normalizeNightRoleOrder } from './nightRoleOrder';
import type { Game, Role } from './types';

function getPreviousRoleDistribution(game: Game): Record<Role, number> {
  const distribution: Record<Role, number> = {
    wolf: 0,
    wolf_demon: 0,
    villager: 0,
    seer: 0,
    witch: 0,
    guard: 0,
    hunter: 0,
  };

  for (const player of game.players) {
    distribution[player.role] += 1;
  }

  return distribution;
}

/**
 * Tạo ván kế tiếp trong cùng phòng: giữ nguyên người chơi và cấu hình số lượng
 * từng vai, nhưng xáo lại vai và loại bỏ toàn bộ trạng thái của ván cũ.
 */
export function createRematchGame(previousGame: Game, now = Date.now()): Game {
  const players = previousGame.players.map(player => ({
    id: player.id,
    name: player.name,
    avatar: player.avatar,
  }));
  const assignedPlayers = assignRoles(players, getPreviousRoleDistribution(previousGame), {
    previousPlayers: previousGame.players,
  });

  return {
    id: `game_${now}`,
    createdAt: now,
    nightRoleOrder: normalizeNightRoleOrder(previousGame.nightRoleOrder),
    players: assignedPlayers,
    rounds: [{ number: 1, nightDeaths: [] }],
    phase: 'night',
    witchItems: {
      saveLeft: RULES.witch.saveCount,
      poisonLeft: RULES.witch.poisonCount,
    },
    roomId: previousGame.roomId,
  };
}
