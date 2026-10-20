import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { buildLeaderboard, createLocalLeaderboardSummaries } from '../game/leaderboard';
import type { LeaderboardEntry } from '../game/types';
import { getLeaderboardData, getLocalGames } from '../services/gameRepository';
import styles from './LeaderboardPage.module.css';

type DataSource = 'cloud' | 'local' | 'local-fallback';

const MEDALS = ['🥇', '🥈', '🥉'];

function winRate(entry: LeaderboardEntry): number {
  return entry.gamesPlayed > 0 ? Math.round((entry.wins / entry.gamesPlayed) * 100) : 0;
}

function PlayerAvatar({ entry }: { entry: LeaderboardEntry }) {
  if (entry.avatar) {
    return (
      <img
        className={styles.avatar}
        src={entry.avatar}
        alt=""
        width="64"
        height="64"
        loading="lazy"
      />
    );
  }

  return (
    <div className={`${styles.avatar} ${styles.avatarFallback}`} aria-hidden="true">
      {entry.displayName.charAt(0).toLocaleUpperCase('vi-VN') || '?'}
    </div>
  );
}

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.uid;
  const localSummaries = createLocalLeaderboardSummaries(getLocalGames());
  const [entries, setEntries] = useState<LeaderboardEntry[]>(() => buildLeaderboard(localSummaries));
  const [gameCount, setGameCount] = useState(localSummaries.length);
  const [source, setSource] = useState<DataSource>(user ? 'cloud' : 'local');
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [isLimited, setIsLimited] = useState(false);
  const isLoading = Boolean(userId) && loadedForUserId !== userId;

  useEffect(() => {
    let isActive = true;

    void getLeaderboardData(userId).then(result => {
      if (!isActive) return;
      setEntries(buildLeaderboard(result.summaries));
      setGameCount(result.summaries.length);
      setSource(result.source);
      setIsLimited(result.limited);
      setLoadedForUserId(userId ?? null);
    });

    return () => {
      isActive = false;
    };
  }, [userId]);

  const topThree = entries.slice(0, 3);
  const remaining = entries.slice(3);
  const currentPlayerKey = userId ? `uid:${userId}` : null;

  return (
    <main className={styles.page}>
      <div className={styles.ambientGlow} aria-hidden="true" />
      <section className={styles.board}>
        <header className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate('/')} aria-label="Về trang chủ">
            ←
          </button>
          <div>
            <p className={styles.eyebrow}>ĐẠI SẢNH VINH DANH</p>
            <h1>BẢNG XẾP HẠNG</h1>
          </div>
          <div className={styles.trophy} aria-hidden="true">🏆</div>
        </header>

        <div className={styles.statusBar} role="status">
          <span className={`${styles.statusDot} ${isLoading ? styles.syncing : ''}`} />
          <span>
            {isLoading
              ? 'Đang đồng bộ bảng xếp hạng…'
              : source === 'cloud'
                ? `BXH nhóm • ${gameCount} ván đã ghi nhận`
                : source === 'local-fallback'
                  ? `Mất kết nối • đang hiển thị ${gameCount} ván trên thiết bị`
                  : `BXH trên thiết bị • ${gameCount} ván đã ghi nhận`}
          </span>
        </div>

        {entries.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyCrest} aria-hidden="true">♛</div>
            <h2>Chưa có nhà vô địch</h2>
            <p>Kết thúc và lưu một ván chơi để những người thuộc phe thắng xuất hiện tại đây.</p>
            <button className={styles.primaryButton} onClick={() => navigate('/setup')}>
              TẠO VÁN MỚI
            </button>
          </div>
        ) : (
          <>
            <div className={styles.podium} aria-label="Ba người dẫn đầu">
              {topThree.map((entry, index) => {
                const rank = index + 1;
                return (
                  <article
                    key={entry.playerKey}
                    className={`${styles.podiumCard} ${styles[`rank${rank}`]} ${entry.playerKey === currentPlayerKey ? styles.currentPlayer : ''}`}
                  >
                    <span className={styles.medal}>{MEDALS[index]}</span>
                    <PlayerAvatar entry={entry} />
                    <h2 title={entry.displayName}>{entry.displayName}</h2>
                    <strong>{entry.wins} trận thắng</strong>
                    <span>{winRate(entry)}% • {entry.gamesPlayed} trận</span>
                  </article>
                );
              })}
            </div>

            {remaining.length > 0 && (
              <section className={styles.rankingList} aria-label="Bảng xếp hạng đầy đủ">
                <div className={styles.listHeader}>
                  <span>HẠNG</span>
                  <span>NGƯỜI CHƠI</span>
                  <span>THẮNG</span>
                </div>
                {remaining.map((entry, index) => (
                  <article
                    key={entry.playerKey}
                    className={`${styles.rankRow} ${entry.playerKey === currentPlayerKey ? styles.currentPlayer : ''}`}
                  >
                    <span className={styles.rankNumber}>{index + 4}</span>
                    <div className={styles.playerCell}>
                      <PlayerAvatar entry={entry} />
                      <div>
                        <strong>{entry.displayName}</strong>
                        <span>{entry.gamesPlayed} trận • tỷ lệ {winRate(entry)}%</span>
                      </div>
                    </div>
                    <strong className={styles.winCount}>{entry.wins}</strong>
                  </article>
                ))}
              </section>
            )}

            <section className={styles.legend}>
              <div><span>🏘️</span><strong>Thắng phe Dân</strong><b>{entries.reduce((sum, entry) => sum + entry.villagerWins, 0)}</b></div>
              <div><span>🐺</span><strong>Thắng phe Sói</strong><b>{entries.reduce((sum, entry) => sum + entry.wolfWins, 0)}</b></div>
            </section>
          </>
        )}

        {isLimited && (
          <p className={styles.limitNote}>BXH đang tính trên 500 ván gần nhất để giữ tốc độ tải nhanh trên điện thoại.</p>
        )}
        {!user && (
          <p className={styles.limitNote}>Đăng nhập để xem và đồng bộ bảng xếp hạng chung của cả nhóm.</p>
        )}
      </section>
    </main>
  );
}
