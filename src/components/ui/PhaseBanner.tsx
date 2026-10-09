import React from 'react';
import styles from './PhaseBanner.module.css';

export interface PhaseBannerProps {
  phase: 'night' | 'day' | 'vote';
  title?: string;
  subtitle?: string;
  icon?: string;
  artUrl?: string;
  className?: string;
}

export const PhaseBanner: React.FC<PhaseBannerProps> = ({
  phase,
  title,
  subtitle,
  icon,
  artUrl,
  className = ''
}) => {
  const defaultTitle =
    phase === 'night' ? 'BAN ĐÊM' : phase === 'day' ? 'BAN NGÀY' : 'BỎ PHIẾU TREO CỔ';
  const defaultIcon =
    phase === 'night' ? '🌙' : phase === 'day' ? '☀️' : '⚖️';

  const artStyle = artUrl
    ? ({
        [phase === 'night' ? '--art-banner-night' : '--art-banner-day']: `url(${artUrl})`
      } as React.CSSProperties)
    : undefined;

  const classNames = [styles.banner, styles[phase], className].filter(Boolean).join(' ');

  return (
    <div className={classNames} style={artStyle}>
      <span className={styles.phaseIcon}>{icon || defaultIcon}</span>
      <h2 className={styles.title}>{title || defaultTitle}</h2>
      {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
    </div>
  );
};

export default PhaseBanner;
