import { describe, expect, it } from 'vitest';
import { canEnterRoom } from './roomAccess';
import type { GameRoom } from './types';

function createRoom(status: GameRoom['status'], maxPlayers = 1): GameRoom {
  return {
    id: '123456',
    name: 'Test room',
    hostUid: 'host',
    hostName: 'Host',
    maxPlayers,
    status,
    createdAt: 1,
    members: [
      { uid: 'host', displayName: 'Host', isHost: true, joinedAt: 1 },
      { uid: 'player', displayName: 'Player', isHost: false, joinedAt: 2 },
    ],
  };
}

describe('canEnterRoom', () => {
  it('allows the host and an existing player to recover a full running room', () => {
    const room = createRoom('playing');
    expect(canEnterRoom(room, 'host')).toBe(true);
    expect(canEnterRoom(room, 'player')).toBe(true);
  });

  it('allows existing members back into an ended room but blocks outsiders', () => {
    const room = createRoom('ended');
    expect(canEnterRoom(room, 'player')).toBe(true);
    expect(canEnterRoom(room, 'outsider')).toBe(false);
  });

  it('allows an outsider only while a waiting room has capacity', () => {
    expect(canEnterRoom(createRoom('waiting', 2), 'outsider')).toBe(true);
    expect(canEnterRoom(createRoom('waiting', 1), 'outsider')).toBe(false);
  });
});
