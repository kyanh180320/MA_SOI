import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  runTransaction,
  updateDoc,
  FieldPath,
  deleteField,
  query,
  where,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import type { GameRoom, RoomMember, AppUser, Game, LiveNightActions } from "../game/types";
import { mergeRemoteNightActions } from "../game/night";
import {
  applyLiveNightActions,
  createLiveNightActionsBaseline,
  sanitizeGameForSync,
  sanitizeMembersForSync,
  sanitizeRoomAvatar,
} from "../game/onlineSync";

/** Danh sách người chơi thật sự trong phòng (chủ phòng là Quản trò nên KHÔNG tính) */
export const getPlayerMembers = (members?: RoomMember[]): RoomMember[] =>
  (members || []).filter(m => !m.isHost);

export async function createRoom(roomName: string, maxPlayers: number = 20, user?: AppUser | null): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Bạn cần đăng nhập để tạo phòng.");
  const playerUid = user?.uid || currentUser.uid;

  // Tạo mã phòng 6 chữ số ngẫu nhiên
  const roomId = `${Math.floor(100000 + Math.random() * 900000)}`;
  const roomRef = doc(db, "rooms", roomId);

  const hostAvatar = sanitizeRoomAvatar(user?.avatar || user?.photoURL || currentUser.photoURL || "");
  const hostDisplayName = user?.displayName || currentUser.displayName || "Quản trò";

  const hostMember: RoomMember = {
    uid: playerUid,
    displayName: hostDisplayName,
    avatar: hostAvatar,
    isHost: true,
    joinedAt: Date.now()
  };

  const newRoom: GameRoom = {
    id: roomId,
    name: roomName.trim() || `Phòng của ${hostDisplayName}`,
    hostUid: playerUid,
    hostName: hostDisplayName,
    hostAvatar: hostAvatar,
    maxPlayers: Math.min(20, Math.max(4, maxPlayers)),
    status: "waiting",
    members: [hostMember],
    createdAt: Date.now()
  };

  await setDoc(roomRef, newRoom);
  return roomId;
}

export function subscribeRooms(callback: (rooms: GameRoom[]) => void): () => void {
  const colRef = collection(db, "rooms");
  // Không tải các room đã kết thúc (thường chứa gameData lớn) về trang chủ.
  const activeRoomsQuery = query(colRef, where("status", "in", ["waiting", "setup", "playing"]));
  return onSnapshot(activeRoomsQuery, (snapshot) => {
    const list: GameRoom[] = [];
    const now = Date.now();
    const MAX_ROOM_AGE = 4 * 60 * 60 * 1000; // 4 tiếng

    snapshot.forEach(docSnap => {
      const data = docSnap.data() as GameRoom;
      
      // Tự động dọn dẹp các phòng quá cũ (trên 4 tiếng) bị bỏ quên
      if (data.createdAt && now - data.createdAt > MAX_ROOM_AGE) {
        deleteDoc(docSnap.ref).catch(() => {});
        return;
      }

      // Bỏ qua và xoá "phòng ma" (thiếu chủ phòng/thành viên hoặc chủ phòng không còn trong members)
      if (!data.hostUid || !data.members || data.members.length === 0 || !data.members.some(m => m.uid === data.hostUid)) {
        deleteDoc(docSnap.ref).catch(() => {});
        return;
      }

      if (data.status === "waiting" || data.status === "setup" || data.status === "playing") {
        list.push({ ...data, id: docSnap.id });
      }
    });
    list.sort((a, b) => b.createdAt - a.createdAt);
    callback(list);
  }, (err) => {
    console.error("Lỗi khi lắng nghe danh sách phòng:", err);
    callback([]);
  });
}

export function subscribeRoom(roomId: string, callback: (room: GameRoom | null) => void): () => void {
  const roomRef = doc(db, "rooms", roomId);
  return onSnapshot(roomRef, { includeMetadataChanges: true }, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as GameRoom;
      const gameData = data.gameData
        ? applyLiveNightActions(data.gameData, data.liveNightActions)
        : undefined;
      callback({
        ...data,
        id: docSnap.id,
        gameData,
        syncState: docSnap.metadata.fromCache
          ? "offline"
          : docSnap.metadata.hasPendingWrites
            ? "syncing"
            : "synced",
      });
    } else {
      callback(null);
    }
  }, (err) => {
    console.error(`Lỗi khi lắng nghe phòng ${roomId}:`, err);
    // Lỗi mạng tạm thời không có nghĩa là chủ phòng đã giải tán phòng.
    // Giữ snapshot gần nhất trên UI thay vì đẩy tất cả người chơi ra ngoài.
  });
}

export async function joinRoom(roomId: string, user?: AppUser | null): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Bạn cần đăng nhập để tham gia phòng.");
  const playerUid = user?.uid || currentUser.uid;

  const roomRef = doc(db, "rooms", roomId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(roomRef);
    if (!snap.exists()) {
      throw new Error("Phòng không tồn tại hoặc đã bị giải tán.");
    }

    const room = snap.data() as GameRoom;
    const currentMembers = room.members || [];
    const isAlreadyMember = currentMembers.some(m => m.uid === playerUid);

    if (isAlreadyMember) {
      return;
    }

    if (getPlayerMembers(currentMembers).length >= room.maxPlayers) {
      throw new Error(`Phòng đã đầy (${room.maxPlayers}/${room.maxPlayers} người).`);
    }

    const newMember: RoomMember = {
      uid: playerUid,
      displayName: user?.displayName || currentUser.displayName || "Người chơi",
      avatar: sanitizeRoomAvatar(user?.avatar || user?.photoURL || currentUser.photoURL || ""),
      isHost: false,
      joinedAt: Date.now()
    };

    transaction.update(roomRef, {
      members: sanitizeMembersForSync([...currentMembers, newMember])
    });
  });
}

export async function leaveRoom(roomId: string, stablePlayerUid?: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;
  const playerUid = stablePlayerUid || currentUser.uid;

  const roomRef = doc(db, "rooms", roomId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(roomRef);
    if (!snap.exists()) return;

    const room = snap.data() as GameRoom;
    const currentMembers = room.members || [];

    if (room.hostUid === playerUid) {
      // Chủ phòng rời đi: XOÁ PHÒNG HOÀN TOÀN, toàn bộ người chơi khác sẽ tự động bị kích ra ngoài
      transaction.delete(roomRef);
    } else {
      // Người chơi thông thường rời đi: loại bỏ người đó khỏi danh sách phòng
      const remainingMembers = currentMembers.filter(m => m.uid !== playerUid);
      // Nếu không còn ai hoặc chủ phòng không còn trong phòng, xoá phòng luôn
      if (remainingMembers.length === 0 || !remainingMembers.some(m => m.uid === room.hostUid)) {
        transaction.delete(roomRef);
      } else {
        transaction.update(roomRef, {
          members: remainingMembers
        });
      }
    }
  });
}

export async function closeRoom(roomId: string): Promise<void> {
  const roomRef = doc(db, "rooms", roomId);
  await deleteDoc(roomRef);
}

const BOT_NAMES = [
  "Bot Alpha 🤖", "Bot Beta 🤖", "Bot Charlie 🤖", "Bot Delta 🤖", 
  "Bot Echo 🤖", "Bot Fox 🤖", "Bot Ghost 🤖", "Bot Hunter 🤖",
  "Bot Iron 🤖", "Bot Joker 🤖", "Bot Knight 🤖", "Bot Luna 🤖",
  "Bot Max 🤖", "Bot Nova 🤖", "Bot Omega 🤖", "Bot Pixel 🤖",
  "Bot Quasar 🤖", "Bot Radar 🤖", "Bot Shadow 🤖", "Bot Titan 🤖"
];

export async function addBotToRoom(roomId: string): Promise<void> {
  const roomRef = doc(db, "rooms", roomId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(roomRef);
    if (!snap.exists()) throw new Error("Phòng không tồn tại.");

    const room = snap.data() as GameRoom;
    const currentMembers = room.members || [];

    if (getPlayerMembers(currentMembers).length >= room.maxPlayers) {
      throw new Error(`Phòng đã đầy (${room.maxPlayers}/${room.maxPlayers} người).`);
    }

    const usedNames = new Set(currentMembers.map(m => m.displayName));
    const availableName = BOT_NAMES.find(n => !usedNames.has(n)) || `Bot #${currentMembers.length + 1} 🤖`;

    const botMember: RoomMember = {
      uid: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      displayName: availableName,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(availableName)}`,
      isHost: false,
      isBot: true,
      joinedAt: Date.now()
    };

    transaction.update(roomRef, {
      members: [...currentMembers, botMember]
    });
  });
}

export async function addBotsUntil(roomId: string, targetTotal: number = 6): Promise<void> {
  const roomRef = doc(db, "rooms", roomId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(roomRef);
    if (!snap.exists()) throw new Error("Phòng không tồn tại.");

    const room = snap.data() as GameRoom;
    const currentMembers = [...(room.members || [])];
    const maxLimit = Math.min(room.maxPlayers, targetTotal);

    if (getPlayerMembers(currentMembers).length >= maxLimit) {
      return;
    }

    const usedNames = new Set(currentMembers.map(m => m.displayName));
    let availableIndex = 0;

    while (getPlayerMembers(currentMembers).length < maxLimit) {
      while (availableIndex < BOT_NAMES.length && usedNames.has(BOT_NAMES[availableIndex])) {
        availableIndex++;
      }
      const botName = availableIndex < BOT_NAMES.length 
        ? BOT_NAMES[availableIndex] 
        : `Bot #${currentMembers.length + 1} 🤖`;
      usedNames.add(botName);

      const botMember: RoomMember = {
        uid: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        displayName: botName,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(botName)}`,
        isHost: false,
        isBot: true,
        joinedAt: Date.now()
      };
      currentMembers.push(botMember);
    }

    transaction.update(roomRef, {
      members: currentMembers
    });
  });
}

export async function removeBotFromRoom(roomId: string, botUid?: string): Promise<void> {
  const roomRef = doc(db, "rooms", roomId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(roomRef);
    if (!snap.exists()) return;

    const room = snap.data() as GameRoom;
    const currentMembers = room.members || [];

    let updatedMembers = [...currentMembers];
    if (botUid) {
      updatedMembers = updatedMembers.filter(m => m.uid !== botUid);
    } else {
      const lastBotIndex = [...updatedMembers].reverse().findIndex(m => m.isBot);
      if (lastBotIndex !== -1) {
        const actualIndex = updatedMembers.length - 1 - lastBotIndex;
        updatedMembers.splice(actualIndex, 1);
      }
    }

    transaction.update(roomRef, {
      members: updatedMembers
    });
  });
}

export async function syncRoomGame(roomId: string, game: Game): Promise<void> {
  const roomRef = doc(db, "rooms", roomId);
  // Chỉ cập nhật nếu phòng còn tồn tại, tuyệt đối không tạo lại phòng đã bị chủ phòng xoá
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(roomRef);
    if (!snap.exists()) return;
    const room = snap.data() as GameRoom;
    const remote = room.gameData
      ? applyLiveNightActions(room.gameData, room.liveNightActions)
      : undefined;
    // Giữ lại hành động ban đêm người chơi vừa ghi lên mà Quản trò chưa kịp nhận, tránh bị ghi đè
    const toWrite = sanitizeGameForSync(mergeRemoteNightActions(game, remote) ?? game);
    // Loại bỏ hoàn toàn các trường undefined vì Firestore SDK sẽ văng lỗi Unsupported field value: undefined
    const cleanGameData = JSON.parse(JSON.stringify(toWrite));
    transaction.update(roomRef, {
      status: toWrite.phase === 'ended' ? 'ended' : 'playing',
      gameData: cleanGameData,
      members: sanitizeMembersForSync(room.members),
      liveNightActions: createLiveNightActionsBaseline(toWrite),
    });
  });
}

type LiveField = { path: string[]; value: unknown };

/**
 * Ghi các field nhỏ, không transaction: UI nhận local snapshot ngay cả khi mạng yếu
 * và Firestore tự xếp hàng đợi để đồng bộ lại.
 */
async function updateLiveNightFields(
  roomId: string,
  gameId: string,
  roundNumber: number,
  fields: LiveField[],
): Promise<void> {
  const roomRef = doc(db, "rooms", roomId);
  const allFields: LiveField[] = [
    { path: ["liveNightActions", "gameId"], value: gameId },
    { path: ["liveNightActions", "roundNumber"], value: roundNumber },
    ...fields,
  ];
  const [first, ...rest] = allFields;
  const remainingArgs = rest.flatMap(field => [new FieldPath(...field.path), field.value]);
  await updateDoc(
    roomRef,
    new FieldPath(...first.path),
    first.value,
    ...remainingArgs,
  );
}

export function submitGuardAction(
  roomId: string,
  gameId: string,
  roundNumber: number,
  targetId: string,
): Promise<void> {
  return updateLiveNightFields(roomId, gameId, roundNumber, [
    { path: ["liveNightActions", "guardProtectTarget"], value: targetId },
  ]);
}

export function submitWolfVotes(
  roomId: string,
  gameId: string,
  roundNumber: number,
  votes: Record<string, string[]>,
): Promise<void> {
  return updateLiveNightFields(
    roomId,
    gameId,
    roundNumber,
    Object.entries(votes).map(([playerId, targets]) => ({
      path: ["liveNightActions", "wolfVotes", playerId],
      value: targets,
    })),
  );
}

export function submitWolfAction(
  roomId: string,
  gameId: string,
  roundNumber: number,
  targetIds: string[],
): Promise<void> {
  const safeTargets = targetIds.length > 0 ? targetIds : ["none"];
  return updateLiveNightFields(roomId, gameId, roundNumber, [
    { path: ["liveNightActions", "wolfTarget"], value: safeTargets[0] },
    { path: ["liveNightActions", "wolfTargets"], value: safeTargets },
  ]);
}

export function submitSeerAction(
  roomId: string,
  gameId: string,
  roundNumber: number,
  seerCheck: NonNullable<LiveNightActions["seerCheck"]>,
): Promise<void> {
  return updateLiveNightFields(roomId, gameId, roundNumber, [
    { path: ["liveNightActions", "seerCheck"], value: seerCheck },
  ]);
}

export function submitWitchAction(
  roomId: string,
  gameId: string,
  roundNumber: number,
  action: {
    saved: boolean;
    savedTarget?: string;
    poisonTarget?: string;
    witchItems: Game["witchItems"];
  },
): Promise<void> {
  return updateLiveNightFields(roomId, gameId, roundNumber, [
    { path: ["liveNightActions", "witchSaved"], value: action.saved },
    {
      path: ["liveNightActions", "witchSavedTarget"],
      value: action.savedTarget ?? deleteField(),
    },
    {
      path: ["liveNightActions", "witchPoisonTarget"],
      value: action.poisonTarget ?? deleteField(),
    },
    { path: ["liveNightActions", "witchItems"], value: action.witchItems },
  ]);
}
