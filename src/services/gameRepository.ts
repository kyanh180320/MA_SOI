import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  createLeaderboardGameSummary,
  createLocalLeaderboardSummaries,
} from "../game/leaderboard";
import { canDeleteGameHistory } from "../game/historyAccess";
import { ensureFirebaseSession } from "./authService";
import type { AppUser, Game, LeaderboardGameSummary } from "../game/types";

const GAMES_KEY = "werewolf_games";
const LEADERBOARD_GAMES_LIMIT = 500;
const HISTORY_GAMES_LIMIT = 100;

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
 * Lưu local ngay để UI phản hồi tức thì, sau đó tạo phiên ẩn danh nếu cần và
 * đồng bộ cùng một gameId lên lịch sử chung.
 */
export async function saveGame(game: Game): Promise<void> {
  saveGameLocal(game);

  try {
    const currentUser = await ensureFirebaseSession();
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

/**
 * Đọc một tập hữu hạn các bản tóm tắt thay vì tải toàn bộ gameData.
 * Cloud là nguồn chung. Local chỉ dùng khi mất mạng để ván đã xóa trên cloud
 * không bị dữ liệu cũ của một thiết bị đưa trở lại bảng xếp hạng.
 */
export async function getLeaderboardData(): Promise<LeaderboardLoadResult> {
  const localSummaries = createLocalLeaderboardSummaries(getLocalGames());

  try {
    await ensureFirebaseSession();
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
      summaries: cloudSummaries,
      source: "cloud",
      limited: snap.size >= LEADERBOARD_GAMES_LIMIT,
    };
  } catch (err) {
    console.warn("Không thể tải bảng xếp hạng cloud, sử dụng dữ liệu cục bộ:", err);
    return { summaries: localSummaries, source: "local-fallback", limited: false };
  }
}

/**
 * Lịch sử là dữ liệu chung của cả nhóm. Chỉ lấy một tập hữu hạn các ván gần
 * nhất để màn hình không tải vô hạn gameData khi collection tăng lên.
 */
export async function getCloudGames(): Promise<Game[]> {
  try {
    await ensureFirebaseSession();
    const gamesRef = collection(db, "games");
    const q = query(gamesRef, orderBy("createdAt", "desc"), limit(HISTORY_GAMES_LIMIT));

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

export async function deleteGameHistory(gameId: string, actor?: AppUser | null): Promise<void> {
  if (!canDeleteGameHistory(actor)) {
    throw new Error('Bạn không có quyền xóa lịch sử ván đấu.');
  }

  await ensureFirebaseSession();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'games', gameId));
  batch.delete(doc(db, 'leaderboardGames', gameId));
  await batch.commit();

  const remainingLocalGames = getLocalGames().filter(game => game.id !== gameId);
  localStorage.setItem(GAMES_KEY, JSON.stringify(remainingLocalGames));
}
