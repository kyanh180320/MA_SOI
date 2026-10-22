import React from 'react';
import type { NightRoleStep } from '../../game/types';
import type { NightStep } from '../../game/night';
import styles from './NightActionStage.module.css';

const NIGHT_ACTION_TITLES: Record<NightRoleStep, string> = {
  guard: 'BẢO VỆ TUẦN ĐÊM',
  half_wolf: 'BÁN SÓI THỨC GIẤC',
  wolf: 'BẦY SÓI ĐI SĂN',
  wolf_seer: 'SÓI TIÊN TRI SOI XÉT',
  seer: 'TIÊN TRI THỨC GIẤC',
  detective: 'THÁM TỬ ĐIỀU TRA',
  witch: 'PHÙ THỦY PHA CHẾ',
  hunter: 'THỢ SĂN RÌNH MỒI',
};

export interface NightActionStageProps {
  step: NightStep;
  children: React.ReactNode;
  className?: string;
}

export const NightActionStage: React.FC<NightActionStageProps> = ({
  step,
  children,
  className = '',
}) => {
  const title = step === 'done'
    ? 'CHỜ ĐÓN BÌNH MINH'
    : step === 'wait'
      ? 'MÀN ĐÊM BUÔNG XUỐNG'
      : NIGHT_ACTION_TITLES[step];

  return (
    <section className={[styles.stage, className].filter(Boolean).join(' ')}>
      <div className={styles.ambientGlow} aria-hidden="true" />
      <header className={styles.banner}>
        <h2>{title}</h2>
      </header>
      <div className={styles.content}>{children}</div>
    </section>
  );
};

export default NightActionStage;
