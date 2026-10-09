import React from 'react';
import styles from './Badge.module.css';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'red' | 'gold' | 'green' | 'ash';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'red',
  className = '',
  children,
  ...props
}) => {
  const classNames = [styles.badge, styles[variant], className].filter(Boolean).join(' ');

  return (
    <span className={classNames} {...props}>
      {children}
    </span>
  );
};

export default Badge;
