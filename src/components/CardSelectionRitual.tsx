import React, { useState, useEffect } from 'react';
import type { Role } from '../game/types';
import { CARD_BACK_IMAGE, ROLE_CARD_IMAGES } from '../constants/assets';
import styles from './CardSelectionRitual.module.css';

export interface CardSelectionRitualProps {
  playerCount: number;
  myRole: Role;
  roleInfo: {
    name: string;
    team: string;
    icon: string;
    color: string;
    description: string;
    actionHint: string;
  };
  onComplete: () => void;
}

export const CardSelectionRitual: React.FC<CardSelectionRitualProps> = ({
  playerCount,
  myRole,
  roleInfo,
  onComplete,
}) => {
  // Số lượng lá bài = số người chơi (không tính quản trò, tối thiểu 4)
  const totalCards = Math.max(4, playerCount);
  const cardList = Array.from({ length: totalCards });

  // Giai đoạn: 'dealing' (chia bài) -> 'chosen' (đã chọn 1 lá) -> 'revealed' (lật mở vai trò) -> 'closing' (đóng màn hình)
  const [stage, setStage] = useState<'dealing' | 'chosen' | 'revealed' | 'closing'>('dealing');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(4);

  // Xử lý khi người chơi bấm chọn một lá bài
  const handleSelectCard = (index: number) => {
    if (stage !== 'dealing') return;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 30, 60]);
    }

    setSelectedIndex(index);
    setStage('chosen');

    // Sau 550ms: Các lá bài khác đã biến mất, lá bài tiến về giữa và lật mở 3D
    setTimeout(() => {
      setStage('revealed');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(80);
      }
    }, 550);
  };

  // Đếm ngược tự động chuyển vào trận sau khi đã mở bài
  useEffect(() => {
    if (stage !== 'revealed') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [stage]);

  const handleFinish = () => {
    setStage('closing');
    setTimeout(() => {
      onComplete();
    }, 550);
  };

  return (
    <div className={`${styles.ritualOverlay} ${stage === 'closing' ? styles.closing : ''}`}>
      {/* KHÔNG GIAN SƯƠNG MÙ HUYỀN BÍ */}
      <div className={styles.ambientFog} />

      {/* HEADER GỢI Ý & TIÊU ĐỀ */}
      <div className={styles.ritualHeader}>
        <div className={styles.moonIcon}>🌕</div>
        <h2 className={styles.ritualTitle}>
          {stage === 'revealed' ? '✦ SỐ PHẬN ĐÃ ĐỊNH ✦' : 'ĐÊM ĐỊNH MỆNH BẮT ĐẦU'}
        </h2>
        <p className={styles.ritualSubtitle}>
          {stage === 'revealed'
            ? 'Hãy ghi nhớ kỹ thân phận bí mật và nhiệm vụ của bạn!'
            : `Quản trò đang chia ${totalCards} lá bài cho ${totalCards} người chơi.`}
        </p>
        {stage === 'dealing' && (
          <div className={styles.ritualHint}>
            👉 Chạm vào 1 lá bài bất kỳ để chọn số phận của bạn
          </div>
        )}
      </div>

      {/* VÙNG CHỨA CÁC LÁ BÀI */}
      <div className={styles.cardsContainer}>
        {stage !== 'revealed' ? (
          /* GIAI ĐOẠN 1 & 2: CÁC LÁ BÀI ÚP XUẤT HIỆN LẦN LƯỢT */
          <div className={styles.cardsGrid}>
            {cardList.map((_, idx) => {
              const isSelected = selectedIndex === idx;
              const isDismissed = selectedIndex !== null && !isSelected;

              return (
                <div
                  key={idx}
                  className={`
                    ${styles.cardSlot} 
                    ${styles.cardSlotEntrance} 
                    ${isDismissed ? styles.cardDismiss : ''}
                  `}
                  style={{
                    animationDelay: `${idx * 0.14}s`,
                    transitionDelay: isDismissed ? `${(idx % 3) * 0.05}s` : '0s'
                  }}
                  onClick={() => handleSelectCard(idx)}
                >
                  <div className={styles.cardInner}>
                    <img
                      src={CARD_BACK_IMAGE}
                      alt="Mặt sau lá bài Ma Sói"
                      className={styles.cardBackImg}
                      loading="eager"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* GIAI ĐOẠN 3: LÁ BÀI CHỌN TIẾN VỀ TRUNG TÂM VÀ LẬT MỞ 3D */
          <div className={styles.spotlightCardContainer}>
            <div className={styles.goldenBurst} />

            <div className={`${styles.spotlightCardFlip} ${styles.isRevealed}`}>
              <div className={styles.spotlightInner}>
                {/* Mặt sau (úp) */}
                <div className={`${styles.faceFace} ${styles.faceBack}`}>
                  <img
                    src={CARD_BACK_IMAGE}
                    alt="Mặt sau lá bài"
                    className={styles.faceImg}
                  />
                </div>

                {/* Mặt trước (lật mở vai trò bí mật) */}
                <div className={`${styles.faceFace} ${styles.faceFront}`}>
                  <img
                    src={ROLE_CARD_IMAGES[myRole] || CARD_BACK_IMAGE}
                    alt={roleInfo.name}
                    className={styles.faceImg}
                  />
                </div>
              </div>
            </div>

            {/* THÔNG TIN VAI TRÒ */}
            <div className={styles.revealedRoleInfo}>
              <div className={styles.revealedBadge}>✦ BẠN LÀ ✦</div>
              <h3 className={styles.revealedRoleName}>
                {roleInfo.icon} {roleInfo.name}
              </h3>
              <div
                className={styles.revealedTeamTag}
                style={{
                  background: roleInfo.team.includes('Sói') ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 197, 94, 0.25)',
                  color: roleInfo.color,
                  border: `1px solid ${roleInfo.color}`
                }}
              >
                {roleInfo.team}
              </div>
              <p className={styles.revealedDesc}>
                {roleInfo.actionHint}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER ĐIỀU HƯỚNG */}
      <div className={styles.ritualFooter}>
        {stage === 'revealed' ? (
          <button
            type="button"
            className={styles.enterGameBtn}
            onClick={handleFinish}
          >
            VÀO TRẬN ĐẤU ({countdown}s) ➔
          </button>
        ) : (
          <div style={{ height: '48px' }} />
        )}
      </div>
    </div>
  );
};

export default CardSelectionRitual;
