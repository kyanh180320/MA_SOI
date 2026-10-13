import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const isFanMode = totalCards >= 13;
  const isCompactGrid = totalCards >= 9 && totalCards <= 12;
  const visibleCardCount = isFanMode ? 7 : isCompactGrid ? 8 : totalCards;
  const cardList = Array.from({ length: visibleCardCount });
  const hiddenCardCount = totalCards - visibleCardCount;

  // Giai đoạn: 'dealing' (chia bài) -> 'chosen' (đã chọn 1 lá) -> 'revealed' (lật mở vai trò) -> 'closing' (đóng màn hình)
  const [stage, setStage] = useState<'dealing' | 'chosen' | 'revealed' | 'closing'>('dealing');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedCardOrigin, setSelectedCardOrigin] = useState<{ x: number; y: number; scale: number } | null>(null);
  const [countdown, setCountdown] = useState<number>(4);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFinish = useCallback(() => {
    if (finishTimerRef.current) return;
    setStage('closing');
    finishTimerRef.current = setTimeout(onComplete, 550);
  }, [onComplete]);

  // Xử lý khi người chơi bấm chọn một lá bài
  const handleSelectCard = (index: number, element: HTMLElement) => {
    if (stage !== 'dealing') return;

    const rect = element.getBoundingClientRect();
    const targetWidth = Math.min(190, Math.max(150, window.innerWidth * 0.42));

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 30, 60]);
    }

    setSelectedCardOrigin({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      scale: rect.width / targetWidth,
    });
    setSelectedIndex(index);
    setStage('chosen');

    // Chờ lá bài về đúng tâm rồi mới lật để chuyển động không bị teleport/giật.
    revealTimerRef.current = setTimeout(() => {
      setStage('revealed');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(80);
      }
    }, 760);
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
  }, [stage, handleFinish]);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    };
  }, []);

  return (
    <div className={`${styles.ritualOverlay} ${stage === 'closing' ? styles.closing : ''}`}>
      {/* KHÔNG GIAN SƯƠNG MÙ HUYỀN BÍ */}
      <div className={styles.ambientFog} />

      {/* HEADER GỢI Ý & TIÊU ĐỀ */}
      <div className={styles.ritualHeader}>
        <div className={styles.moonIcon}>🌕</div>
        <h2 className={styles.ritualTitle}>
          {stage === 'revealed'
            ? '✦ SỐ PHẬN ĐÃ ĐỊNH ✦'
            : stage === 'chosen'
              ? '✦ SỐ PHẬN ĐANG THỨC GIẤC ✦'
              : 'ĐÊM ĐỊNH MỆNH BẮT ĐẦU'}
        </h2>
        <p className={styles.ritualSubtitle}>
          {stage === 'revealed'
            ? 'Hãy ghi nhớ kỹ thân phận bí mật và nhiệm vụ của bạn!'
            : stage === 'chosen'
              ? 'Lá bài đang đáp lại lựa chọn của bạn...'
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
        {(stage === 'dealing' || stage === 'chosen') && (
          isFanMode ? (
            /* Nhóm đông: chỉ hiện 7 lá xòe trên chồng bài, tổng số vẫn được thể hiện bằng badge. */
            <div className={`${styles.deckRitual} ${stage === 'chosen' ? styles.isChoosing : ''}`}>
              <div className={styles.deckCountBadge}>
                <span className={styles.deckCountNumber}>{totalCards}</span>
                <span>LÁ BÀI ĐỊNH MỆNH</span>
              </div>
              <p className={styles.deckInstruction}>Chọn một lá trong quạt bài để rút số phận</p>

              <div className={styles.cardsFan}>
                <div className={styles.deckStack} aria-hidden="true">
                  <img src={CARD_BACK_IMAGE} alt="" />
                  <img src={CARD_BACK_IMAGE} alt="" />
                  <img src={CARD_BACK_IMAGE} alt="" />
                </div>

                {cardList.map((_, idx) => {
                  const middleIndex = Math.floor(visibleCardCount / 2);
                  const distanceFromCenter = idx - middleIndex;
                  const isSelected = selectedIndex === idx;
                  const isDismissed = selectedIndex !== null && !isSelected;

                  return (
                    <button
                      type="button"
                      key={idx}
                      className={`
                        ${styles.cardSlot}
                        ${styles.fanCardSlot}
                        ${isSelected ? styles.selectedOrigin : ''}
                        ${isDismissed ? styles.cardDismiss : ''}
                      `}
                      style={{
                        '--fan-x': `${distanceFromCenter * 34}px`,
                        '--fan-y': `${Math.abs(distanceFromCenter) * 10}px`,
                        '--fan-angle': `${distanceFromCenter * 6}deg`,
                        '--fan-delay': `${idx * 65}ms`,
                        zIndex: 20 - Math.abs(distanceFromCenter),
                        transitionDelay: isDismissed ? `${Math.abs(distanceFromCenter) * 25}ms` : '0ms',
                      } as React.CSSProperties}
                      onClick={(event) => handleSelectCard(idx, event.currentTarget)}
                      aria-label={`Chọn lá bài định mệnh số ${idx + 1}`}
                    >
                      <div className={styles.cardInner}>
                        <img
                          src={CARD_BACK_IMAGE}
                          alt="Mặt sau lá bài Ma Sói"
                          className={styles.cardBackImg}
                          loading="eager"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Nhóm nhỏ/vừa: grid đầy đủ hoặc grid gọn tối đa 8 lá. */
            <div className={styles.gridRitual}>
              {hiddenCardCount > 0 && (
                <div className={styles.compactDeckBadge}>
                  {totalCards} lá trong bộ · chọn 1 trong 8 lá đang hiện
                </div>
              )}
              <div className={`${styles.cardsGrid} ${isCompactGrid ? styles.compactGrid : ''} ${stage === 'chosen' ? styles.isChoosing : ''}`}>
                {cardList.map((_, idx) => {
                  const isSelected = selectedIndex === idx;
                  const isDismissed = selectedIndex !== null && !isSelected;

                  return (
                    <button
                      type="button"
                      key={idx}
                      className={`
                        ${styles.cardSlot}
                        ${styles.cardSlotEntrance}
                        ${isSelected ? styles.selectedOrigin : ''}
                        ${isDismissed ? styles.cardDismiss : ''}
                      `}
                      style={{
                        animationDelay: `${Math.min(idx * 0.1, 0.55)}s`,
                        transitionDelay: isDismissed ? `${(idx % 4) * 0.035}s` : '0s'
                      }}
                      onClick={(event) => handleSelectCard(idx, event.currentTarget)}
                      aria-label={`Chọn lá bài số ${idx + 1}`}
                    >
                      <div className={styles.cardInner}>
                        <img
                          src={CARD_BACK_IMAGE}
                          alt="Mặt sau lá bài Ma Sói"
                          className={styles.cardBackImg}
                          loading="eager"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )
        )}

        {/* Cùng một lá bài bay từ vị trí click về tâm rồi mới lật, không thay layout giữa chừng. */}
        {selectedCardOrigin && selectedIndex !== null && (stage === 'chosen' || stage === 'revealed') && (
          <div
            className={`${styles.spotlightCardContainer} ${stage === 'chosen' ? styles.cardConverging : styles.cardCentered}`}
            style={{
              '--card-start-x': `${selectedCardOrigin.x}px`,
              '--card-start-y': `${selectedCardOrigin.y}px`,
              '--card-start-scale': selectedCardOrigin.scale,
            } as React.CSSProperties}
          >
            <div className={styles.spotlightCardMotion}>
              <div className={`${styles.goldenBurst} ${stage === 'revealed' ? styles.effectVisible : ''}`} />
              {stage === 'revealed' && (
                <>
                  <div className={styles.revealFlash} />
                  <div className={styles.revealShockwave} />
                  <div className={styles.revealParticles} aria-hidden="true">
                    {Array.from({ length: 12 }, (_, index) => (
                      <span
                        key={index}
                        className={styles.revealParticle}
                        style={{
                          '--particle-angle': `${index * 30}deg`,
                          '--particle-delay': `${(index % 3) * 45}ms`,
                        } as React.CSSProperties}
                      />
                    ))}
                  </div>
                </>
              )}

              <div className={`${styles.spotlightCardFlip} ${stage === 'revealed' ? styles.isRevealed : ''}`}>
                <div className={styles.spotlightInner}>
                  {/* Mặt sau (úp) */}
                  <div className={`${styles.faceFace} ${styles.faceBack}`}>
                    <img
                      src={CARD_BACK_IMAGE}
                      alt="Mặt sau lá bài"
                      className={styles.faceImg}
                    />
                  </div>

                  {/* Mặt trước được preload ngay khi lá bài đang bay về tâm. */}
                  <div className={`${styles.faceFace} ${styles.faceFront}`}>
                    <img
                      src={ROLE_CARD_IMAGES[myRole] || CARD_BACK_IMAGE}
                      alt={roleInfo.name}
                      className={styles.faceImg}
                    />
                  </div>
                </div>
              </div>
            </div>

            {stage === 'revealed' && (
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
            )}
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
