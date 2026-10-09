import React from 'react';
import styles from './PlayerTile.module.css';
import { Badge } from './Badge';

export interface PlayerTileProps {
  name: string;
  avatarUrl?: string;
  role?: string;
  isAlive?: boolean;
  isSelected?: boolean;
  votesCount?: number;
  badgeLabel?: string;
  badgeVariant?: 'red' | 'gold' | 'green' | 'ash';
  layout?: 'row' | 'grid';
  onClick?: () => void;
  className?: string;
}

export const PlayerTile: React.FC<PlayerTileProps> = ({
  name,
  avatarUrl,
  role,
  isAlive = true,
  isSelected = false,
  votesCount = 0,
  badgeLabel,
  badgeVariant = 'red',
  layout = 'grid',
  onClick,
  className = ''
}) => {
  const avatarStyle = avatarUrl ? ({ '--art-avatar': `url(${avatarUrl})` } as React.CSSProperties) : undefined;
  const initials = name.slice(0, 2).toUpperCase();

  const isGridLayout = layout === 'grid';
  const classNames = [
    isGridLayout ? styles.tileGrid : styles.tileRow,
    isSelected ? styles.selected : '',
    !isAlive ? styles.dead : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classNames}
      onClick={isAlive ? onClick : undefined}
      role="button"
      tabIndex={isAlive ? 0 : -1}
      aria-label={`${name}${!isAlive ? ' (Đã chết)' : ''}`}
    >
      {/* Huy hiệu số vote hoặc góc trên khi ở dạng Grid */}
      {isGridLayout && votesCount > 0 && (
        <Badge variant="red" className={styles.cornerBadge}>
          {votesCount} 🗳️
        </Badge>
      )}

      {/* Avatar art slot */}
      <div className={styles.avatarWrapper} style={avatarStyle}>
        {!avatarUrl && initials}
      </div>

      <div className={styles.info}>
        <div className={styles.nameRow}>
          <span className={styles.name} title={name}>{name}</span>
          {!isAlive && <span className={styles.skullIcon}>☠</span>}
        </div>
        {role && <span className={styles.roleTag}>{role}</span>}
      </div>

      {/* Trạng thái / Badge */}
      {!isGridLayout && (
        <div className={styles.rightActions}>
          {votesCount > 0 && (
            <Badge variant="red">
              {votesCount} 🗳️
            </Badge>
          )}
          {badgeLabel && (
            <Badge variant={badgeVariant}>
              {badgeLabel}
            </Badge>
          )}
        </div>
      )}

      {isGridLayout && badgeLabel && (
        <div className={styles.bottomActionGrid}>
          <Badge variant={badgeVariant} style={{ fontSize: '10px', height: '18px', padding: '0 4px' }}>
            {badgeLabel}
          </Badge>
        </div>
      )}
    </div>
  );
};

export default PlayerTile;
