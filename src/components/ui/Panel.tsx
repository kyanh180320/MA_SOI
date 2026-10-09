import React from 'react';
import styles from './Panel.module.css';

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'danger';
  compact?: boolean;
  interactive?: boolean;
  children: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({
  variant = 'default',
  compact = false,
  interactive = false,
  className = '',
  children,
  ...props
}) => {
  const classNames = [
    styles.panel,
    variant === 'danger' ? styles.danger : '',
    compact ? styles.compact : '',
    interactive ? styles.interactive : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames} {...props}>
      {children}
    </div>
  );
};

export default Panel;
