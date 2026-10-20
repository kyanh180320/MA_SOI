import { useEffect, useState } from 'react';
import {
  DEFAULT_DISCUSSION_MINUTES,
  formatDiscussionTime,
  getRemainingSeconds,
  sanitizeDiscussionMinutes,
} from '../../game/discussionTimer';
import styles from './DiscussionTimer.module.css';

const DURATION_STORAGE_KEY = 'werewolf_discussion_minutes';

interface DiscussionTimerProps {
  gameId: string;
  roundNumber: number;
}

interface TimerState {
  durationMinutes: number;
  remainingSeconds: number;
  deadline: number | null;
}

function getRoundTimerKey(gameId: string, roundNumber: number): string {
  return `werewolf_discussion_timer:${gameId}:${roundNumber}`;
}

function readDurationMinutes(): number {
  try {
    const stored = window.localStorage.getItem(DURATION_STORAGE_KEY);
    return stored === null
      ? DEFAULT_DISCUSSION_MINUTES
      : sanitizeDiscussionMinutes(Number(stored));
  } catch {
    return DEFAULT_DISCUSSION_MINUTES;
  }
}

function readInitialTimer(gameId: string, roundNumber: number): TimerState {
  const durationMinutes = readDurationMinutes();
  const fallbackSeconds = durationMinutes * 60;

  try {
    const raw = window.sessionStorage.getItem(getRoundTimerKey(gameId, roundNumber));
    if (raw) {
      const stored = JSON.parse(raw) as Partial<TimerState>;
      const storedDuration = sanitizeDiscussionMinutes(Number(stored.durationMinutes));
      const storedRemaining = Math.max(0, Math.floor(Number(stored.remainingSeconds) || 0));
      const storedDeadline = typeof stored.deadline === 'number' ? stored.deadline : null;
      return {
        durationMinutes: storedDuration,
        remainingSeconds: storedDeadline === null
          ? storedRemaining
          : getRemainingSeconds(storedDeadline, Date.now()),
        deadline: storedDeadline !== null && storedDeadline > Date.now() ? storedDeadline : null,
      };
    }
  } catch {
    // Storage không khả dụng vẫn không được chặn bộ đếm trong ván hiện tại.
  }

  return {
    durationMinutes,
    remainingSeconds: fallbackSeconds,
    deadline: Date.now() + fallbackSeconds * 1000,
  };
}

export function DiscussionTimer({ gameId, roundNumber }: DiscussionTimerProps) {
  const timerKey = getRoundTimerKey(gameId, roundNumber);
  const [timer, setTimer] = useState<TimerState>(() => readInitialTimer(gameId, roundNumber));
  const isRunning = timer.deadline !== null && timer.remainingSeconds > 0;
  const isFinished = timer.remainingSeconds === 0;
  const isUrgent = timer.remainingSeconds > 0 && timer.remainingSeconds <= 30;

  useEffect(() => {
    try {
      window.sessionStorage.setItem(timerKey, JSON.stringify(timer));
    } catch {
      // Session storage có thể bị khoá ở chế độ riêng tư; timer vẫn chạy bằng state.
    }
  }, [timer, timerKey]);

  useEffect(() => {
    if (timer.deadline === null) return;

    const deadline = timer.deadline;
    const tick = () => {
      const remainingSeconds = getRemainingSeconds(deadline, Date.now());
      setTimer(current => {
        if (current.deadline !== deadline || current.remainingSeconds === remainingSeconds) return current;
        return {
          ...current,
          remainingSeconds,
          deadline: remainingSeconds === 0 ? null : deadline,
        };
      });
    };

    tick();
    const intervalId = window.setInterval(tick, 500);
    return () => window.clearInterval(intervalId);
  }, [timer.deadline]);

  const setDuration = (minutes: number) => {
    const durationMinutes = sanitizeDiscussionMinutes(minutes);
    const remainingSeconds = durationMinutes * 60;
    try {
      window.localStorage.setItem(DURATION_STORAGE_KEY, String(durationMinutes));
    } catch {
      // Không lưu được cấu hình vẫn áp dụng ngay cho round hiện tại.
    }
    setTimer(current => ({
      durationMinutes,
      remainingSeconds,
      deadline: current.deadline === null ? null : Date.now() + remainingSeconds * 1000,
    }));
  };

  const toggleTimer = () => {
    setTimer(current => {
      if (current.deadline !== null) {
        return {
          ...current,
          remainingSeconds: getRemainingSeconds(current.deadline, Date.now()),
          deadline: null,
        };
      }

      const remainingSeconds = current.remainingSeconds > 0
        ? current.remainingSeconds
        : current.durationMinutes * 60;
      return {
        ...current,
        remainingSeconds,
        deadline: Date.now() + remainingSeconds * 1000,
      };
    });
  };

  const resetTimer = () => {
    setTimer(current => {
      const remainingSeconds = current.durationMinutes * 60;
      return {
        ...current,
        remainingSeconds,
        deadline: Date.now() + remainingSeconds * 1000,
      };
    });
  };

  return (
    <section className={`${styles.timer} ${isUrgent ? styles.urgent : ''} ${isFinished ? styles.finished : ''}`}>
      <div className={styles.headingRow}>
        <div>
          <span className={styles.eyebrow}>THẢO LUẬN • VÒNG {roundNumber}</span>
          <h3>⏳ Bộ đếm thời gian</h3>
        </div>
        <span className={styles.stateLabel}>
          {isFinished ? 'HẾT GIỜ' : isRunning ? 'ĐANG CHẠY' : 'TẠM DỪNG'}
        </span>
      </div>

      <div
        className={styles.clock}
        role="timer"
        aria-label={`Thời gian thảo luận còn ${formatDiscussionTime(timer.remainingSeconds)}`}
      >
        {formatDiscussionTime(timer.remainingSeconds)}
      </div>

      {isFinished && (
        <p className={styles.finishedMessage} role="alert">
          🔔 Đã hết thời gian thảo luận — quản trò có thể tiến hành bỏ phiếu.
        </p>
      )}

      <div className={styles.controls}>
        <div className={styles.durationControl}>
          <button
            type="button"
            onClick={() => setDuration(timer.durationMinutes - 1)}
            disabled={timer.durationMinutes <= 1}
            aria-label="Giảm một phút"
          >
            −
          </button>
          <label>
            <span>Thời lượng</span>
            <input
              type="number"
              min="1"
              max="30"
              inputMode="numeric"
              value={timer.durationMinutes}
              onChange={event => setDuration(Number(event.target.value))}
              aria-label="Số phút thảo luận"
            />
            <b>phút</b>
          </label>
          <button
            type="button"
            onClick={() => setDuration(timer.durationMinutes + 1)}
            disabled={timer.durationMinutes >= 30}
            aria-label="Tăng một phút"
          >
            +
          </button>
        </div>

        <div className={styles.actionButtons}>
          <button type="button" className={styles.secondaryAction} onClick={resetTimer}>
            ↻ Đặt lại
          </button>
          <button type="button" className={styles.primaryAction} onClick={toggleTimer}>
            {isRunning ? 'Ⅱ Tạm dừng' : '▶ Bắt đầu'}
          </button>
        </div>
      </div>
    </section>
  );
}
