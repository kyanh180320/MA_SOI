import React from 'react';
import styles from './Toast.module.css';

export interface ToastProps {
  message: string;
  variant?: 'info' | 'success' | 'danger';
  icon?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  variant = 'info',
  icon,
  className = '',
  style
}) => {
  const defaultIcon = variant === 'danger' ? '⚠️' : variant === 'success' ? '✨' : '📜';
  const classNames = [styles.toast, styles[variant], className].filter(Boolean).join(' ');

  return (
    <div className={classNames} style={style} role="status">
      <span className={styles.icon}>{icon || defaultIcon}</span>
      <span className={styles.message}>{message}</span>
    </div>
  );
};

export default Toast;
