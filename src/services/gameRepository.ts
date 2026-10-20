import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import {
  createLeaderboardGameSummary,
  createLocalLeaderboardSummaries,
  mergeLeaderboardSummaries,
} from "../game/leaderboard";
import type { Game, LeaderboardGameSummary } from "../game/types";

const GAMES_KEY = "werewolf_games";
const LEADERBOARD_GAMES_LIMIT = 500;

export interface LeaderboardLoadResult {
  summaries: LeaderboardGameSummary[];
  source: "cloud" | "local" | "local-fallback";
  limited: boolean;
}

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
      const batch = writeBatch(db);
      batch.set(gameRef, {
        ...game,
        userId: currentUser.uid,
        userEmail: currentUser.email || "",
        userName: currentUser.displayName || "",
        updatedAt: Date.now()
      });

      const leaderboardSummary = createLeaderboardGameSummary(game);
      if (leaderboardSummary && leaderboardSummary.players.length > 0) {
        // gameId làm document id nên retry/double tap chỉ ghi đè, không cộng chiến thắng hai lần.
        batch.set(doc(db, "leaderboardGames", game.id), leaderboardSummary);
      }

      await batch.commit();
    } catch (err) {
      console.warn("Không thể lưu lên Cloud Firestore, đã lưu tạm offline:", err);
    }
  }
}

/**
 * Đọc một tập hữu hạn các bản tóm tắt thay vì tải toàn bộ gameData.
 * Dữ liệu local được gộp để các ván cũ trên thiết bị và write đang chờ mạng vẫn hiện ngay.
 */
export async function getLeaderboardData(userId?: string): Promise<LeaderboardLoadResult> {
  const localSummaries = createLocalLeaderboardSummaries(getLocalGames());
  if (!userId) {
    return { summaries: localSummaries, source: "local", limited: false };
  }

  try {
    const leaderboardQuery = query(
      collection(db, "leaderboardGames"),
      orderBy("createdAt", "desc"),
      limit(LEADERBOARD_GAMES_LIMIT),
    );
    const snap = await getDocs(leaderboardQuery);
    const cloudSummaries: LeaderboardGameSummary[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data() as LeaderboardGameSummary;
      if (
        typeof data.gameId === "string"
        && typeof data.createdAt === "number"
        && (data.winner === "wolf" || data.winner === "villager")
        && Array.isArray(data.players)
      ) {
        cloudSummaries.push(data);
      }
    });

    return {
      summaries: mergeLeaderboardSummaries(localSummaries, cloudSummaries),
      source: "cloud",
      limited: snap.size >= LEADERBOARD_GAMES_LIMIT,
    };
  } catch (err) {
    console.warn("Không thể tải bảng xếp hạng cloud, sử dụng dữ liệu cục bộ:", err);
    return { summaries: localSummaries, source: "local-fallback", limited: false };
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
