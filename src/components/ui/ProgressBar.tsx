import React from 'react';
import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  label?: string;
  timeRemaining?: string | number;
  variant?: 'gold' | 'danger';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  timeRemaining,
  variant = 'gold',
  className = ''
}) => {
  const clamped = Math.max(0, Math.min(100, (value / max) * 100));
  const scale = clamped / 100;

  return (
    <div className={`${styles.container} ${className}`}>
      {(label || timeRemaining !== undefined) && (
        <div className={styles.header}>
          <span>{label}</span>
          {timeRemaining !== undefined && <span>{timeRemaining}</span>}
        </div>
      )}
      <div
        className={`${styles.bar} ${variant === 'danger' ? styles.danger : ''}`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={styles.fill}
          style={{ transform: `scaleX(${scale})` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
