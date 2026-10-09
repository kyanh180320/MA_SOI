import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  runTransaction 
} from "firebase/firestore";
import { db, auth } from "./firebase";
import type { GameRoom, RoomMember, AppUser } from "../game/types";

export async function createRoom(roomName: string, maxPlayers: number = 20, user?: AppUser | null): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Bạn cần đăng nhập để tạo phòng.");

  // Tạo mã phòng 6 chữ số ngẫu nhiên
  const roomId = `${Math.floor(100000 + Math.random() * 900000)}`;
  const roomRef = doc(db, "rooms", roomId);

  const hostAvatar = user?.avatar || user?.photoURL || currentUser.photoURL || "";
  const hostDisplayName = user?.displayName || currentUser.displayName || "Quản trò";

  const hostMember: RoomMember = {
    uid: currentUser.uid,
    displayName: hostDisplayName,
    avatar: hostAvatar,
    isHost: true,
    joinedAt: Date.now()
  };

  const newRoom: GameRoom = {
    id: roomId,
    name: roomName.trim() || `Phòng của ${hostDisplayName}`,
    hostUid: currentUser.uid,
    hostName: hostDisplayName,
    hostAvatar: hostAvatar,
    maxPlayers: Math.min(20, Math.max(6, maxPlayers)),
    status: "waiting",
    members: [hostMember],
    createdAt: Date.now()
  };

  await setDoc(roomRef, newRoom);
  return roomId;
}

export function subscribeRooms(callback: (rooms: GameRoom[]) => void): () => void {
  const colRef = collection(db, "rooms");
  return onSnapshot(colRef, (snapshot) => {
    const list: GameRoom[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as GameRoom;
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
  return onSnapshot(roomRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ ...(docSnap.data() as GameRoom), id: docSnap.id });
    } else {
      callback(null);
    }
  }, (err) => {
    console.error(`Lỗi khi lắng nghe phòng ${roomId}:`, err);
    callback(null);
  });
}

export async function joinRoom(roomId: string, user?: AppUser | null): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Bạn cần đăng nhập để tham gia phòng.");

  const roomRef = doc(db, "rooms", roomId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(roomRef);
    if (!snap.exists()) {
      throw new Error("Phòng không tồn tại hoặc đã bị giải tán.");
    }

    const room = snap.data() as GameRoom;
    const currentMembers = room.members || [];
    const isAlreadyMember = currentMembers.some(m => m.uid === currentUser.uid);

    if (isAlreadyMember) {
      return;
    }

    if (currentMembers.length >= room.maxPlayers) {
      throw new Error(`Phòng đã đầy (${room.maxPlayers}/${room.maxPlayers} người).`);
    }

    const newMember: RoomMember = {
      uid: currentUser.uid,
      displayName: user?.displayName || currentUser.displayName || "Người chơi",
      avatar: user?.avatar || user?.photoURL || currentUser.photoURL || "",
      isHost: false,
      joinedAt: Date.now()
    };

    transaction.update(roomRef, {
      members: [...currentMembers, newMember]
    });
  });
}

export async function leaveRoom(roomId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const roomRef = doc(db, "rooms", roomId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(roomRef);
    if (!snap.exists()) return;

    const room = snap.data() as GameRoom;
    const currentMembers = room.members || [];

    if (room.hostUid === currentUser.uid) {
      // Host rời phòng: nếu còn người thì chuyển Host, nếu hết người thì xóa phòng
      const remainingMembers = currentMembers.filter(m => m.uid !== currentUser.uid);
      if (remainingMembers.length > 0) {
        remainingMembers[0].isHost = true;
        transaction.update(roomRef, {
          hostUid: remainingMembers[0].uid,
          hostName: remainingMembers[0].displayName,
          hostAvatar: remainingMembers[0].avatar || "",
          members: remainingMembers
        });
      } else {
        transaction.delete(roomRef);
      }
    } else {
      const remainingMembers = currentMembers.filter(m => m.uid !== currentUser.uid);
      transaction.update(roomRef, {
        members: remainingMembers
      });
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

    if (currentMembers.length >= room.maxPlayers) {
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

    if (currentMembers.length >= maxLimit) {
      return;
    }

    const usedNames = new Set(currentMembers.map(m => m.displayName));
    let availableIndex = 0;

    while (currentMembers.length < maxLimit) {
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
