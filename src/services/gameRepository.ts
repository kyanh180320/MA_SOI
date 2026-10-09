import { doc, setDoc, getDocs, collection, query, where, orderBy } from "firebase/firestore";
import { db, auth } from "./firebase";
import type { Game } from "../game/types";

const GAMES_KEY = "werewolf_games";

export function saveGameLocal(game: Game) {
  const games = getLocalGames();
  const existingIndex = games.findIndex(g => g.id === game.id);
  if (existingIndex >= 0) {
    games[existingIndex] = game;
  } else {
    games.push(game);
  }
  games.sort((a, b) => b.createdAt - a.createdAt);
  localStorage.setItem(GAMES_KEY, JSON.stringify(games));
}

export function getLocalGames(): Game[] {
  try {
    const raw = localStorage.getItem(GAMES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Lưu ván chơi: Lưu cả offline (localStorage) và tự động đồng bộ lên Firestore nếu đã đăng nhập
 */
export async function saveGame(game: Game): Promise<void> {
  saveGameLocal(game);

  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const gameRef = doc(db, "games", game.id);
      await setDoc(gameRef, {
        ...game,
        userId: currentUser.uid,
        userEmail: currentUser.email || "",
        userName: currentUser.displayName || "",
        updatedAt: Date.now()
      });
    } catch (err) {
      console.warn("Không thể lưu lên Cloud Firestore, đã lưu tạm offline:", err);
    }
  }
}

/**
 * Lấy danh sách ván chơi từ Cloud Firestore (hỗ trợ lọc theo user hoặc lấy tất cả cho admin)
 */
export async function getCloudGames(userId?: string, isAdmin: boolean = false): Promise<Game[]> {
  try {
    const gamesRef = collection(db, "games");
    let q;
    if (isAdmin) {
      q = query(gamesRef, orderBy("createdAt", "desc"));
    } else if (userId) {
      q = query(gamesRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
    } else {
      return getLocalGames();
    }

    const snap = await getDocs(q);
    const cloudGames: Game[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      cloudGames.push(data as Game);
    });
    return cloudGames;
  } catch (err) {
    console.warn("Lỗi khi tải từ Firestore, sử dụng dữ liệu cục bộ:", err);
    return getLocalGames();
  }
}
