import type { GameRoom } from './types';

/** Cache trống khi offline chưa đủ để kết luận phòng đã bị xoá trên server. */
export function isRoomDeletionConfirmed(snapshotExists: boolean, fromCache: boolean): boolean {
  return !snapshotExists && !fromCache;
}

/**
 * Thành viên hiện tại hoặc người đã có trong đội hình ván đang chạy luôn được
 * vào lại. Người mới chỉ được vào khi phòng còn chờ và còn chỗ.
 */
export function canEnterRoom(room: GameRoom, userId?: string): boolean {
  const isCurrentMember = Boolean(userId && room.members.some(member => member.uid === userId));
  const isGamePlayer = Boolean(userId && room.gameData?.players.some(player => player.id === userId));

  if (userId && (room.hostUid === userId || isCurrentMember || isGamePlayer)) {
    return true;
  }

  const playerCount = room.members.filter(member => !member.isHost).length;
  const acceptsNewPlayers = room.status === 'waiting' || room.status === 'setup';
  return acceptsNewPlayers && playerCount < room.maxPlayers;
}
