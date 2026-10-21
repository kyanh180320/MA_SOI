import type { GameRoom } from './types';

/** Thành viên cũ luôn được vào lại; người mới chỉ được vào khi phòng còn chờ. */
export function canEnterRoom(room: GameRoom, userId?: string): boolean {
  if (userId && (room.hostUid === userId || room.members.some(member => member.uid === userId))) {
    return true;
  }

  const playerCount = room.members.filter(member => !member.isHost).length;
  const acceptsNewPlayers = room.status === 'waiting' || room.status === 'setup';
  return acceptsNewPlayers && playerCount < room.maxPlayers;
}
