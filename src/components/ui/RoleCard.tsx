import React, { useState } from 'react';
import styles from './RoleCard.module.css';

export interface RoleCardProps {
  roleName: string;
  teamName?: string;
  artUrl?: string;
  cardBackUrl?: string;
  icon?: string;
  flipped?: boolean;
  faceDown?: boolean;
  spawnAnimation?: boolean;
  interactive?: boolean;
  onFlip?: (flipped: boolean) => void;
  className?: string;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  roleName,
  teamName = 'Dân Làng',
  artUrl,
  cardBackUrl,
  icon = '🐺',
  flipped: controlledFlipped,
  faceDown = false,
  spawnAnimation = false,
  interactive = true,
  onFlip,
  className = ''
}) => {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const isFlipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped;

  const handleClick = () => {
    if (!interactive) return;
    const next = !isFlipped;
    setInternalFlipped(next);
    if (onFlip) {
      onFlip(next);
    }
  };

  const artStyle = artUrl ? ({ '--art': `url(${artUrl})` } as React.CSSProperties) : undefined;
  const backStyle = cardBackUrl ? ({ '--art-card-back': `url(${cardBackUrl})` } as React.CSSProperties) : undefined;

  return (
    <div
      className={`${styles.flip} ${faceDown ? styles.faceDown : ''} ${isFlipped ? styles.isFlipped : ''} ${spawnAnimation ? styles.spawnAnimation : ''} ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`Lá bài ${roleName}`}
    >
      <div className={styles.flipInner}>
        {/* Mặt trước */}
        <div className={`${styles.flipFace} ${styles.cardFront}`}>
          <div className={styles.cardTitle}>{roleName}</div>
          <div className={styles.cardArt} style={artStyle}>
            {!artUrl && <div className={styles.placeholderIcon}>{icon}</div>}
          </div>
          <div className={styles.cardFooter}>{teamName}</div>
        </div>

        {/* Mặt sau */}
        <div className={`${styles.flipFace} ${styles.cardBack}`} style={backStyle}>
          <div className={styles.backEmblem}>
            <div className={styles.backIcon}>✦</div>
            <div className={styles.backText}>MA SÓI</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleCard;
