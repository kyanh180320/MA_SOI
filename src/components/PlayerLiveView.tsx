import React, { useState } from 'react';
import type { GameRoom, AppUser, Role, Player, Round } from '../game/types';
import { Button, Panel, Badge, RoleCard, PlayerTile, Modal } from './ui';
import { updateRoomGame } from '../services/roomService';
import { isWolfTeam } from '../game/win';
import { ROLE_CARD_IMAGES, CARD_BACK_IMAGE } from '../constants/assets';
import styles from './PlayerLiveView.module.css';

interface PlayerLiveViewProps {
  room: GameRoom;
  user: AppUser | null;
  onLeave: () => void;
}

const ROLE_DETAILS: Record<Role, {
  name: string;
  team: string;
  icon: string;
  color: string;
  description: string;
  actionHint: string;
}> = {
  wolf: {
    name: "MA SÓI",
    team: "Phe Ma Sói",
    icon: "🐺",
    color: "var(--red-300)",
    description: "Ban đêm thức dậy cùng đồng bọn thống nhất chọn 1 nạn nhân cắn chết. Ban ngày giả làm dân làng trà trộn để không bị phát hiện.",
    actionHint: "🌙 Ban đêm: Thức dậy khi Quản trò gọi để cùng bầy sói cắn người."
  },
  wolf_demon: {
    name: "SÓI QUỶ",
    team: "Phe Ma Sói",
    icon: "😈",
    color: "var(--red-300)",
    description: "Chúa tể loài sói tàn bạo! Khi thức dậy cùng bầy sói, có quyền năng cắn tới 2 người trong 1 đêm. Hiểm họa tột cùng cho dân làng.",
    actionHint: "🌙 Ban đêm: Thức dậy cùng sói và có thể cắn tới 2 nạn nhân."
  },
  seer: {
    name: "TIÊN TRI",
    team: "Phe Dân Làng",
    icon: "🔮",
    color: "var(--purple-400)",
    description: "Mỗi đêm thức dậy chỉ định 1 người chơi để soi danh tính bí mật, biết được người đó thuộc Phe Ma Sói hay Phe Dân Làng.",
    actionHint: "🌙 Ban đêm: Thức dậy khi Quản trò gọi để soi thân phận 1 người."
  },
  witch: {
    name: "PHÙ THỦY",
    team: "Phe Dân Làng",
    icon: "🧪",
    color: "var(--teal-500)",
    description: "Sở hữu 2 bình thuốc thần kỳ: 1 bình cứu sống người bị sói cắn đêm nay, và 1 bình độc tiêu diệt bất kỳ ai bạn muốn (mỗi bình dùng 1 lần trong ván).",
    actionHint: "🌙 Ban đêm: Biết ai bị sói cắn, quyết định cứu hoặc dùng bình thuốc độc."
  },
  guard: {
    name: "BẢO VỆ",
    team: "Phe Dân Làng",
    icon: "🛡️",
    color: "var(--blue-400)",
    description: "Mỗi đêm thức dậy chọn 1 người (kể cả bản thân) để bảo vệ an toàn khỏi nanh vuốt Ma Sói. Không được bảo vệ cùng 1 người 2 đêm liên tiếp.",
    actionHint: "🌙 Ban đêm: Thức dậy khi Quản trò gọi để bảo vệ 1 người."
  },
  hunter: {
    name: "THỢ SĂN",
    team: "Phe Dân Làng",
    icon: "🏹",
    color: "var(--orange-400)",
    description: "Khi bạn bị loại khỏi cuộc chơi (dù bị sói cắn hay bị dân làng bỏ phiếu treo cổ), bạn có quyền bắn 1 phát súng kéo theo 1 người bất kỳ chết cùng.",
    actionHint: "🏹 Khi bị chết: Chọn 1 người bất kỳ để bắn hạ cùng bạn."
  },
  villager: {
    name: "DÂN LÀNG",
    team: "Phe Dân Làng",
    icon: "👨‍🌾",
    color: "var(--green-400)",
    description: "Người dân hiền lành không có kỹ năng ban đêm. Ban ngày cùng thảo luận, quan sát biểu cảm, tìm sơ hở của Ma Sói và bỏ phiếu treo cổ.",
    actionHint: "☀️ Ban ngày: Lắng nghe, tranh luận, suy đoán và bỏ phiếu tìm Ma Sói."
  }
};

// 4 VAI TRÒ GỌI TRONG GIAI ĐOẠN ĐÊM THEO THỨ TỰ
export const NIGHT_ROLE_STEPS = [
  { id: 'guard', label: 'Bảo Vệ', icon: '🛡️', role: 'guard' },
  { id: 'wolf', label: 'Ma Sói', icon: '🐺', role: 'wolf' },
  { id: 'seer', label: 'Tiên Tri', icon: '🔮', role: 'seer' },
  { id: 'witch', label: 'Phù Thủy', icon: '🧪', role: 'witch' }
];

export const PHASE_STEPS = [
  { id: 'night', label: 'Ban Đêm', icon: '🌙' },
  { id: 'day', label: 'Ban Ngày', icon: '☀️' },
  { id: 'vote', label: 'Bỏ Phiếu', icon: '⚖️' },
  { id: 'ended', label: 'Kết Quả', icon: '☠️' }
];

export const getNightStep = (currentRound?: Round): 'guard' | 'wolf' | 'seer' | 'witch' | 'done' => {
  if (!currentRound) return 'guard';
  if (currentRound.guardProtectTarget === undefined) return 'guard';
  if (currentRound.wolfTargets === undefined && currentRound.wolfTarget === undefined) return 'wolf';
  if (currentRound.seerCheck === undefined) return 'seer';
  if (currentRound.witchSaved === undefined && currentRound.witchSavedTarget === undefined) return 'witch';
  return 'done';
};

export const PlayerLiveView: React.FC<PlayerLiveViewProps> = ({ room, user, onLeave }) => {
  const game = room.gameData;
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States dành cho thao tác của các vai trò
  const [selectedWolfTargets, setSelectedWolfTargets] = useState<string[]>([]);
  const [wolfWarningMsg, setWolfWarningMsg] = useState<string | null>(null);

  const [selectedGuardTarget, setSelectedGuardTarget] = useState<string | null>(null);

  const [selectedSeerTarget, setSelectedSeerTarget] = useState<string | null>(null);
  const [seerResultModal, setSeerResultModal] = useState<{ target: Player; isWolf: boolean } | null>(null);

  const [witchSaveActive, setWitchSaveActive] = useState(false);
  const [selectedWitchPoison, setSelectedWitchPoison] = useState<string | null>(null);

  if (!game) {
    return (
      <div className={styles.container}>
        <Panel>
          <p style={{ textAlign: 'center', margin: 0 }}>Đang đồng bộ dữ liệu ván đấu từ Quản trò...</p>
        </Panel>
      </div>
    );
  }

  const currentRound = game.rounds[game.rounds.length - 1];
  const previousRound = game.rounds.length > 1 ? game.rounds[game.rounds.length - 2] : null;
  const roundNumber = currentRound ? currentRound.number : 1;
  const currentPhase = game.phase;

  // Xác định bước vai trò ban đêm hiện tại
  const nightStep = getNightStep(currentRound);

  // Tìm người chơi ứng với tài khoản user hiện tại:
  const myPlayer: Player | undefined = (() => {
    if (!user) return undefined;

    // 1. Khớp theo UID
    const byId = game.players.find(p => p.id === user.uid);
    if (byId) return byId;

    // 2. Khớp theo tên hiển thị
    if (user.displayName) {
      const byName = game.players.find(p => 
        p.name.trim().toLowerCase() === user.displayName.trim().toLowerCase()
      );
      if (byName) return byName;
    }

    // 3. Khớp theo thứ tự thành viên trong phòng
    const memberIndex = room.members?.findIndex(m => m.uid === user.uid);
    if (memberIndex !== undefined && memberIndex >= 0 && memberIndex < game.players.length) {
      return game.players[memberIndex];
    }

    return undefined;
  })();

  const roleInfo = myPlayer ? ROLE_DETAILS[myPlayer.role] : null;
  const alivePlayers = game.players.filter(p => p.alive);

  // Tính tiến độ thanh tiến trình
  const nightStepIndex = (() => {
    if (nightStep === 'guard') return 0;
    if (nightStep === 'wolf') return 1;
    if (nightStep === 'seer') return 2;
    if (nightStep === 'witch') return 3;
    return 4; // Hoàn thành đêm
  })();

  const currentPhaseIndex = PHASE_STEPS.findIndex(s => s.id === currentPhase);
  const phaseProgressPercent = currentPhaseIndex >= 0 
    ? (currentPhaseIndex / (PHASE_STEPS.length - 1)) * 100 
    : 0;

  const nightProgressPercent = Math.min(100, (nightStepIndex / 3) * 100);

  const handleToggleFlip = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(25);
    }
    setIsFlipped(prev => !prev);
  };

  // Nạn nhân đêm qua (nếu ở phase ban ngày)
  const nightVictims = currentRound?.nightDeaths?.map(id => {
    const victim = game.players.find(p => p.id === id);
    return victim ? victim.name : id;
  }) || [];

  // -------------------------------------------------------------
  // XỬ LÝ LOGIC RIÊNG CỦA BẦY SÓI (Consensus & Sói Quỷ)
  // -------------------------------------------------------------
  const aliveWolves = game.players.filter(p => p.alive && isWolfTeam(p.role));
  const hasDemonWolf = aliveWolves.some(p => p.role === 'wolf_demon');
  const wolfVotesMap = currentRound?.wolfVotes || {};

  // Kiểm tra đồng thuận giữa các sói thường
  const allAliveWolvesVoted = aliveWolves.length > 0 && aliveWolves.every(w => (wolfVotesMap[w.id]?.length || 0) > 0);
  const votedTargetIds = aliveWolves.map(w => wolfVotesMap[w.id]?.[0]).filter(Boolean);
  const isWolfConsensus = allAliveWolvesVoted && votedTargetIds.length === aliveWolves.length && new Set(votedTargetIds).size === 1;
  const consensusTargetId = isWolfConsensus ? votedTargetIds[0] : null;
  const consensusPlayer = consensusTargetId ? game.players.find(p => p.id === consensusTargetId) : null;

  // Xử lý khi Sói bấm chọn mục tiêu
  const handleSelectWolfTarget = async (targetId: string) => {
    setWolfWarningMsg(null);

    // TRƯỜNG HỢP 1: CÓ SÓI QUỶ (Tối đa 2 người)
    if (hasDemonWolf) {
      if (selectedWolfTargets.includes(targetId)) {
        setSelectedWolfTargets(prev => prev.filter(id => id !== targetId));
      } else {
        if (selectedWolfTargets.length >= 2) {
          setWolfWarningMsg("⚠️ Có Sói Quỷ chỉ được chọn tối đa 2 người! Bạn đã chọn đủ 2 người rồi, hãy bấm bỏ chọn 1 người trước nếu muốn đổi mục tiêu.");
          return;
        }
        setSelectedWolfTargets(prev => [...prev, targetId]);
      }
      return;
    }

    // TRƯỜNG HỢP 2: CHỈ CÓ SÓI THƯỜNG (Bắt buộc chọn 1 người và đồng thuận nếu có nhiều sói)
    setSelectedWolfTargets([targetId]);

    // Nếu có từ 2 sói thường trở lên, đồng bộ ngay vote của sói này lên Firestore
    if (myPlayer && aliveWolves.length > 1) {
      try {
        await updateRoomGame(room.id, (g) => {
          const rounds = [...g.rounds];
          const last = rounds.length - 1;
          const votes = { ...(rounds[last].wolfVotes || {}) };
          votes[myPlayer.id] = [targetId];

          // Nếu có bot trong bầy sói, bot tự động theo vote của người chơi để ván không bị kẹt
          aliveWolves.forEach(w => {
            const isBot = w.id.startsWith('bot_') || room.members?.find(m => m.uid === w.id)?.isBot;
            if (isBot) {
              votes[w.id] = [targetId];
            }
          });

          rounds[last] = { ...rounds[last], wolfVotes: votes };
          return { ...g, rounds };
        });
      } catch (e) {
        console.error("Lỗi cập nhật vote bầy sói:", e);
      }
    }
  };

  // Xác nhận cắn người của Bầy Sói
  const handleConfirmWolfBite = async () => {
    setIsSubmitting(true);
    try {
      let finalTargets: string[] = [];

      if (hasDemonWolf) {
        finalTargets = selectedWolfTargets;
      } else {
        if (aliveWolves.length > 1) {
          if (!consensusTargetId) return;
          finalTargets = [consensusTargetId];
        } else {
          finalTargets = selectedWolfTargets;
        }
      }

      await updateRoomGame(room.id, (g) => {
        const rounds = [...g.rounds];
        const last = rounds.length - 1;
        rounds[last] = {
          ...rounds[last],
          wolfTarget: finalTargets[0] || 'none',
          wolfTargets: finalTargets.length > 0 ? finalTargets : ['none']
        };
        return { ...g, rounds };
      });
      setSelectedWolfTargets([]);
    } catch (e) {
      console.error("Lỗi xác nhận cắn người:", e);
      alert("Lỗi kết nối phòng khi xác nhận cắn người!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bỏ qua không cắn ai
  const handleSkipWolfBite = async () => {
    setIsSubmitting(true);
    try {
      await updateRoomGame(room.id, (g) => {
        const rounds = [...g.rounds];
        const last = rounds.length - 1;
        rounds[last] = {
          ...rounds[last],
          wolfTarget: 'none',
          wolfTargets: ['none']
        };
        return { ...g, rounds };
      });
      setSelectedWolfTargets([]);
    } catch (e) {
      console.error("Lỗi bỏ qua lượt sói:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // XỬ LÝ LOGIC CỦA BẢO VỆ
  // -------------------------------------------------------------
  const prevProtectedId = previousRound?.guardProtectTarget && previousRound.guardProtectTarget !== 'none' 
    ? previousRound.guardProtectTarget 
    : null;

  const handleConfirmGuardProtect = async (targetId: string | null) => {
    setIsSubmitting(true);
    try {
      await updateRoomGame(room.id, (g) => {
        const rounds = [...g.rounds];
        const last = rounds.length - 1;
        rounds[last] = {
          ...rounds[last],
          guardProtectTarget: targetId || 'none'
        };
        return { ...g, rounds };
      });
      setSelectedGuardTarget(null);
    } catch (e) {
      console.error("Lỗi bảo vệ:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // XỬ LÝ LOGIC CỦA TIÊN TRI
  // -------------------------------------------------------------
  const handleTriggerSeerInspect = () => {
    if (!selectedSeerTarget) return;
    const targetPlayer = game.players.find(p => p.id === selectedSeerTarget);
    if (!targetPlayer) return;

    const isWolf = isWolfTeam(targetPlayer.role);
    setSeerResultModal({ target: targetPlayer, isWolf });
  };

  const handleFinishSeerCheck = async () => {
    if (!seerResultModal) return;
    setIsSubmitting(true);
    try {
      await updateRoomGame(room.id, (g) => {
        const rounds = [...g.rounds];
        const last = rounds.length - 1;
        rounds[last] = {
          ...rounds[last],
          seerCheck: {
            target: seerResultModal.target.id,
            isWolf: seerResultModal.isWolf
          }
        };
        return { ...g, rounds };
      });
      setSeerResultModal(null);
      setSelectedSeerTarget(null);
    } catch (e) {
      console.error("Lỗi lưu kết quả tiên tri:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // XỬ LÝ LOGIC CỦA PHÙ THỦY
  // -------------------------------------------------------------
  const currentWolfVictims = currentRound?.wolfTargets?.filter(t => t !== 'none') || 
    (currentRound?.wolfTarget && currentRound.wolfTarget !== 'none' ? [currentRound.wolfTarget] : []);

  const victimPlayers = currentWolfVictims.map(id => game.players.find(p => p.id === id)).filter(Boolean) as Player[];

  const handleConfirmWitchAction = async () => {
    setIsSubmitting(true);
    try {
      await updateRoomGame(room.id, (g) => {
        const rounds = [...g.rounds];
        const last = rounds.length - 1;
        const newItems = { ...g.witchItems };

        if (witchSaveActive) {
          newItems.saveLeft = Math.max(0, newItems.saveLeft - 1);
        }
        if (selectedWitchPoison) {
          newItems.poisonLeft = Math.max(0, newItems.poisonLeft - 1);
        }

        rounds[last] = {
          ...rounds[last],
          witchSaved: witchSaveActive,
          witchSavedTarget: witchSaveActive && currentWolfVictims[0] ? currentWolfVictims[0] : undefined,
          witchPoisonTarget: selectedWitchPoison || undefined
        };

        return { ...g, rounds, witchItems: newItems };
      });
      setWitchSaveActive(false);
      setSelectedWitchPoison(null);
    } catch (e) {
      console.error("Lỗi lưu hành động phù thủy:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipWitch = async () => {
    setIsSubmitting(true);
    try {
      await updateRoomGame(room.id, (g) => {
        const rounds = [...g.rounds];
        const last = rounds.length - 1;
        rounds[last] = {
          ...rounds[last],
          witchSaved: false
        };
        return { ...g, rounds };
      });
      setWitchSaveActive(false);
      setSelectedWitchPoison(null);
    } catch (e) {
      console.error("Lỗi bỏ qua phù thủy:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* 1. THANH ĐIỀU HƯỚNG TRÊN CÙNG */}
      <div className={styles.header}>
        <Button
          variant="secondary"
          onClick={onLeave}
          style={{ minHeight: '40px', padding: '0 var(--s-3)', fontSize: '13px' }}
        >
          ← Rời phòng
        </Button>
        <div className={styles.roomMeta}>
          <h2 className={styles.roomTitle}>{room.name}</h2>
          <div className={styles.liveIndicator}>
            <span className={styles.pulseDot} />
            <span>TRỰC TIẾP TỪ QUẢN TRÒ 👑 {room.hostName}</span>
          </div>
        </div>
        <div style={{ width: '40px' }} />
      </div>

      {/* 2. THANH TIẾN TRÌNH ROUND & GIAI ĐOẠN / VAI TRÒ ĐANG GỌI */}
      <div className={styles.timelinePanel}>
        <div className={styles.roundHeader}>
          <div className={styles.roundNumber}>
            <span>⏳</span>
            <span>VÒNG {roundNumber}</span>
          </div>

          <div className={`
            ${styles.phaseBadge} 
            ${currentPhase === 'night' ? styles.phaseNight : ''} 
            ${currentPhase === 'day' ? styles.phaseDay : ''} 
            ${currentPhase === 'vote' ? styles.phaseVote : ''} 
            ${currentPhase === 'ended' ? styles.phaseEnded : ''}
          `}>
            {currentPhase === 'night' && (
              <>
                🌙 Đêm:{' '}
                {nightStep === 'guard' && '🛡️ Bảo Vệ'}
                {nightStep === 'wolf' && '🐺 Ma Sói'}
                {nightStep === 'seer' && '🔮 Tiên Tri'}
                {nightStep === 'witch' && '🧪 Phù Thủy'}
                {nightStep === 'done' && '✨ Chờ Bình Minh'}
              </>
            )}
            {currentPhase === 'day' && '☀️ Ban Ngày'}
            {currentPhase === 'vote' && '⚖️ Bỏ Phiếu Treo Cổ'}
            {currentPhase === 'ended' && '🏁 Trận Đấu Kết Thúc'}
          </div>
        </div>

        {/* STEPPER TIẾN ĐỘ: NẾU BAN ĐÊM -> HIỆN 4 VAI TRÒ VỚI VỊ TRÍ ĐANG GỌI PHÁT SÁNG */}
        {currentPhase === 'night' ? (
          <div className={styles.stepper}>
            <div className={styles.stepLine}>
              <div 
                className={styles.stepLineProgress} 
                style={{ width: `${nightProgressPercent}%` }} 
              />
            </div>

            {NIGHT_ROLE_STEPS.map((step, idx) => {
              const isPassed = idx < nightStepIndex;
              const isActive = idx === nightStepIndex;

              return (
                <div 
                  key={step.id} 
                  className={`
                    ${styles.stepItem} 
                    ${isActive ? styles.stepItemRoleActive : ''} 
                    ${isPassed ? styles.stepItemPassed : ''}
                  `}
                >
                  <div className={styles.stepCircle}>
                    {isPassed ? '✓' : step.icon}
                  </div>
                  <span className={styles.stepLabel}>
                    {step.label}
                    {isActive && ' (Đang gọi)'}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          /* STEPPER CHO CÁC GIAI ĐOẠN NGÀY / BỎ PHIẾU / KẾT QUẢ */
          <div className={styles.stepper}>
            <div className={styles.stepLine}>
              <div 
                className={styles.stepLineProgress} 
                style={{ width: `${phaseProgressPercent}%` }} 
              />
            </div>

            {PHASE_STEPS.map((step, idx) => {
              const isPassed = idx < currentPhaseIndex;
              const isActive = idx === currentPhaseIndex;

              return (
                <div 
                  key={step.id} 
                  className={`
                    ${styles.stepItem} 
                    ${isActive ? styles.stepItemActive : ''} 
                    ${isPassed ? styles.stepItemPassed : ''}
                  `}
                >
                  <div className={styles.stepCircle}>
                    {isPassed ? '✓' : step.icon}
                  </div>
                  <span className={styles.stepLabel}>{step.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* MÔ TẢ GIAI ĐOẠN BAN NGÀY / KẾT THÚC */}
        {currentPhase === 'day' && (
          <>
            <div className={styles.phaseCallout}>
              ☀️ <strong>Bình minh đã đến:</strong> Dân làng tỉnh giấc. Hãy thảo luận, đối chất và tìm kiếm những kẻ khả nghi!
            </div>
            {nightVictims.length > 0 ? (
              <div className={styles.nightVictimAlert}>
                <span style={{ fontSize: '18px' }}>☠️</span>
                <div>
                  <strong>Nạn nhân đêm qua: </strong>
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>{nightVictims.join(', ')}</span>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--green-400)', fontWeight: 600 }}>
                ✨ Một đêm bình yên! Không có ai bị thiệt mạng đêm qua.
              </div>
            )}
          </>
        )}

        {currentPhase === 'vote' && (
          <div className={styles.phaseCallout} style={{ borderLeftColor: 'var(--red-300)' }}>
            ⚖️ <strong>Phiên bỏ phiếu:</strong> Cả làng đang tiến hành biểu quyết treo cổ kẻ tình nghi. Hãy theo dõi quyết định của Quản trò.
          </div>
        )}

        {currentPhase === 'ended' && (
          <div className={styles.phaseCallout} style={{ borderLeftColor: 'var(--gold-300)' }}>
            🏆 <strong>Chiến thắng:</strong>{' '}
            {game.winner === 'wolf' ? '🐺 Phe Ma Sói đã chiến thắng!' : '👨‍🌾 Phe Dân Làng đã quét sạch Ma Sói!'}
          </div>
        )}
      </div>

      {/* 3. KHU VỰC THAO TÁC TRONG ĐÊM KHI ĐẾN LƯỢT VAI TRÒ CỦA BẢN THÂN */}
      {currentPhase === 'night' && myPlayer && myPlayer.alive && (
        <div className={styles.nightActionSection}>
          {/* A. THAO TÁC CỦA BẦY MA SÓI */}
          {nightStep === 'wolf' && isWolfTeam(myPlayer.role) && (
            <div className={`${styles.actionPanel} ${styles.actionPanelWolf}`}>
              <div className={styles.actionHeader}>
                <h3 className={styles.actionTitle} style={{ color: 'var(--red-300)' }}>
                  🐺 BẦY SÓI ĐI SĂN ĐÊM
                </h3>
                <Badge variant="red">
                  {hasDemonWolf ? '😈 Có Sói Quỷ (Cắn 2)' : '🐺 Sói Thường (Cắn 1)'}
                </Badge>
              </div>

              {/* Thông báo nếu có lỗi hoặc chọn quá số lượng */}
              {wolfWarningMsg && (
                <div className={styles.wolfAlertDisagreement}>
                  {wolfWarningMsg}
                </div>
              )}

              {/* CÓ SÓI QUỶ: CHỌN TỐI ĐA 2 NGƯỜI */}
              {hasDemonWolf ? (
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)' }}>
                  Bầy sói có <strong>Sói Quỷ</strong>! Được chọn tối đa <strong>2 người</strong> để cắn đêm nay (Đã chọn: {selectedWolfTargets.length}/2):
                </p>
              ) : (
                /* CHỈ CÓ SÓI THƯỜNG: BẮT BUỘC CHỌN CÙNG 1 NGƯỜI NẾU CÓ >= 2 SÓI */
                <>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)' }}>
                    Chọn 1 người để cắn. {aliveWolves.length > 1 && 'Bắt buộc tất cả sói phải chọn cùng 1 người mới cắn được!'}
                  </p>

                  {/* BẢNG THEO DÕI ĐỒNG THUẬN CỦA BẦY SÓI NẾU CÓ TỪ 2 SÓI */}
                  {aliveWolves.length > 1 && (
                    <div className={styles.wolfConsensusBox}>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>
                        Ý KIẾN CỦA BẦY SÓI:
                      </span>
                      {aliveWolves.map(w => {
                        const targetId = wolfVotesMap[w.id]?.[0];
                        const targetPlayer = targetId ? game.players.find(p => p.id === targetId) : null;
                        const isMe = w.id === myPlayer.id;

                        return (
                          <div key={w.id} className={styles.wolfConsensusRow}>
                            <span>{w.role === 'wolf_demon' ? '😈' : '🐺'} {w.name} {isMe ? '(Bạn)' : ''}:</span>
                            <span className={targetPlayer ? styles.wolfTargetSelected : ''}>
                              {targetPlayer ? `👉 ${targetPlayer.name}` : '⏳ Chưa chọn'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* THÔNG BÁO TRẠNG THÁI ĐỒNG THUẬN */}
                  {aliveWolves.length > 1 && (
                    <>
                      {isWolfConsensus && consensusPlayer && (
                        <div className={styles.wolfAlertConsensus}>
                          🎉 Cả bầy sói đã ĐỒNG THUẬN chọn cắn: <strong>{consensusPlayer.name}</strong>!
                        </div>
                      )}
                      {allAliveWolvesVoted && !isWolfConsensus && (
                        <div className={styles.wolfAlertDisagreement}>
                          ⚠️ 2 Sói đang chọn khác người! Bắt buộc tất cả sói thường phải thống nhất chọn CÙNG 1 NGƯỜI mới cắn được!
                        </div>
                      )}
                      {!allAliveWolvesVoted && (
                        <div style={{ fontSize: '12px', color: 'var(--gold-300)', fontStyle: 'italic' }}>
                          ⏳ Đang đợi các sói khác bỏ phiếu... ({votedTargetIds.length}/{aliveWolves.length} đã chọn)
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* LƯỚI CHỌN MỤC TIÊU CẮN (NGƯỜI CÒN SỐNG TRỪ PHE SÓI) */}
              <div className={styles.targetSelectionGrid}>
                {alivePlayers.map(p => {
                  const isWolf = isWolfTeam(p.role);
                  const isSelected = selectedWolfTargets.includes(p.id) || (aliveWolves.length > 1 && !hasDemonWolf && wolfVotesMap[myPlayer.id]?.[0] === p.id);

                  return (
                    <PlayerTile
                      key={p.id}
                      name={p.name}
                      avatarUrl={p.avatar}
                      badgeLabel={isSelected ? '🎯 Cắn' : (isWolf ? 'Phe Sói' : undefined)}
                      badgeVariant={isSelected ? 'red' : 'ash'}
                      isSelected={isSelected}
                      onClick={() => handleSelectWolfTarget(p.id)}
                    />
                  );
                })}
              </div>

              {/* CÁC NÚT XÁC NHẬN BẦY SÓI */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)', marginTop: 'var(--s-2)' }}>
                {hasDemonWolf ? (
                  <Button
                    variant="danger"
                    pulse={selectedWolfTargets.length > 0}
                    disabled={selectedWolfTargets.length === 0 || isSubmitting}
                    onClick={handleConfirmWolfBite}
                  >
                    {selectedWolfTargets.length > 0 
                      ? `✓ Xác Nhận Cắn (${selectedWolfTargets.map(id => game.players.find(p => p.id === id)?.name).join(', ')})`
                      : 'Hãy chọn ít nhất 1 nạn nhân'}
                  </Button>
                ) : (
                  aliveWolves.length > 1 ? (
                    <Button
                      variant="danger"
                      pulse={isWolfConsensus}
                      disabled={!isWolfConsensus || isSubmitting}
                      onClick={handleConfirmWolfBite}
                    >
                      {isWolfConsensus && consensusPlayer
                        ? `✓ Xác Nhận Cắn Đồng Thuận: ${consensusPlayer.name}`
                        : '🔒 Cần cả 2 sói chọn cùng 1 người'}
                    </Button>
                  ) : (
                    <Button
                      variant="danger"
                      pulse={selectedWolfTargets.length === 1}
                      disabled={selectedWolfTargets.length !== 1 || isSubmitting}
                      onClick={handleConfirmWolfBite}
                    >
                      {selectedWolfTargets.length === 1
                        ? `✓ Xác Nhận Cắn: ${game.players.find(p => p.id === selectedWolfTargets[0])?.name}`
                        : 'Hãy chọn 1 người để cắn'}
                    </Button>
                  )
                )}

                <Button
                  variant="ghost"
                  disabled={isSubmitting}
                  onClick={handleSkipWolfBite}
                  style={{ fontSize: '12px' }}
                >
                  Không cắn ai đêm nay (Bỏ qua)
                </Button>
              </div>
            </div>
          )}

          {/* B. THAO TÁC CỦA BẢO VỆ */}
          {nightStep === 'guard' && myPlayer.role === 'guard' && (
            <div className={styles.actionPanel}>
              <div className={styles.actionHeader}>
                <h3 className={styles.actionTitle} style={{ color: 'var(--blue-400)' }}>
                  🛡️ BẢO VỆ ĐÊM NAY
                </h3>
                <Badge variant="gold">Bảo vệ</Badge>
              </div>

              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)' }}>
                Chọn 1 người (kể cả bản thân) để bảo vệ khỏi Ma Sói. Không thể bảo vệ cùng 1 người 2 đêm liên tiếp:
              </p>

              <div className={styles.targetSelectionGrid}>
                {alivePlayers.map(p => {
                  const isPrevProtected = p.id === prevProtectedId;
                  const isSelected = selectedGuardTarget === p.id;

                  return (
                    <PlayerTile
                      key={p.id}
                      name={p.name + (isPrevProtected ? ' (Đêm trước)' : '')}
                      avatarUrl={p.avatar}
                      badgeLabel={isSelected ? '🛡️ Bảo vệ' : (isPrevProtected ? '🔒 Khóa' : undefined)}
                      badgeVariant={isSelected ? 'gold' : 'ash'}
                      isSelected={isSelected}
                      onClick={() => {
                        if (isPrevProtected) {
                          alert("Không thể bảo vệ cùng một người 2 đêm liên tiếp!");
                          return;
                        }
                        setSelectedGuardTarget(prev => prev === p.id ? null : p.id);
                      }}
                    />
                  );
                })}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)', marginTop: 'var(--s-2)' }}>
                <Button
                  variant="primary"
                  pulse={!!selectedGuardTarget}
                  disabled={!selectedGuardTarget || isSubmitting}
                  onClick={() => handleConfirmGuardProtect(selectedGuardTarget)}
                >
                  {selectedGuardTarget 
                    ? `✓ Xác Nhận Bảo Vệ: ${game.players.find(p => p.id === selectedGuardTarget)?.name}`
                    : 'Hãy chọn 1 người cần bảo vệ'}
                </Button>

                <Button
                  variant="ghost"
                  disabled={isSubmitting}
                  onClick={() => handleConfirmGuardProtect(null)}
                  style={{ fontSize: '12px' }}
                >
                  Không bảo vệ ai đêm nay (Bỏ qua)
                </Button>
              </div>
            </div>
          )}

          {/* C. THAO TÁC CỦA TIÊN TRI */}
          {nightStep === 'seer' && myPlayer.role === 'seer' && (
            <div className={`${styles.actionPanel} ${styles.actionPanelSeer}`}>
              <div className={styles.actionHeader}>
                <h3 className={styles.actionTitle} style={{ color: 'var(--purple-400)' }}>
                  🔮 TIÊN TRI SOI THÂN PHẬN
                </h3>
                <Badge variant="gold">Tiên Tri</Badge>
              </div>

              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)' }}>
                Chọn 1 người chơi để soi xem người đó thuộc <strong>Phe Sói</strong> hay <strong>Phe Dân</strong>:
              </p>

              <div className={styles.targetSelectionGrid}>
                {alivePlayers.filter(p => p.id !== myPlayer.id).map(p => {
                  const isSelected = selectedSeerTarget === p.id;

                  return (
                    <PlayerTile
                      key={p.id}
                      name={p.name}
                      avatarUrl={p.avatar}
                      badgeLabel={isSelected ? '🔮 Sẽ soi' : undefined}
                      badgeVariant="gold"
                      isSelected={isSelected}
                      onClick={() => setSelectedSeerTarget(prev => prev === p.id ? null : p.id)}
                    />
                  );
                })}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)', marginTop: 'var(--s-2)' }}>
                <Button
                  variant="primary"
                  pulse={!!selectedSeerTarget}
                  disabled={!selectedSeerTarget || isSubmitting}
                  onClick={handleTriggerSeerInspect}
                >
                  {selectedSeerTarget
                    ? `👁️ Soi Danh Tính: ${game.players.find(p => p.id === selectedSeerTarget)?.name}`
                    : 'Hãy chọn 1 người để soi'}
                </Button>
              </div>
            </div>
          )}

          {/* D. THAO TÁC CỦA PHÙ THỦY */}
          {nightStep === 'witch' && myPlayer.role === 'witch' && (
            <div className={`${styles.actionPanel} ${styles.actionPanelWitch}`}>
              <div className={styles.actionHeader}>
                <h3 className={styles.actionTitle} style={{ color: 'var(--teal-500)' }}>
                  🧪 PHÙ THỦY DÙNG THUỐC
                </h3>
                <Badge variant="gold">Phù Thủy</Badge>
              </div>

              {/* Thông tin nạn nhân bị sói cắn đêm nay */}
              <div className={styles.wolfConsensusBox} style={{ borderColor: 'var(--teal-500)' }}>
                {victimPlayers.length > 0 ? (
                  <div>
                    <span style={{ fontSize: '13px', color: '#ff9eaf', fontWeight: 700 }}>
                      🐺 Nạn nhân bị Sói cắn đêm nay:{' '}
                    </span>
                    <strong style={{ color: '#fff' }}>
                      {victimPlayers.map(p => p.name).join(', ')}
                    </strong>
                  </div>
                ) : (
                  <div style={{ color: 'var(--green-400)', fontSize: '13px', fontWeight: 600 }}>
                    ✨ Đêm nay bầy sói không cắn ai!
                  </div>
                )}
              </div>

              {/* 1. Bình giải dược */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>💚 Bình Cứu Người: </strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                    (Còn {game.witchItems.saveLeft} bình)
                  </span>
                </div>
                {game.witchItems.saveLeft > 0 && victimPlayers.length > 0 ? (
                  <Button
                    variant={witchSaveActive ? "primary" : "secondary"}
                    onClick={() => setWitchSaveActive(prev => !prev)}
                    style={{ minHeight: '36px', fontSize: '12px' }}
                  >
                    {witchSaveActive ? '✓ Đang cứu' : 'Cứu nạn nhân'}
                  </Button>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--ash)' }}>Không khả dụng</span>
                )}
              </div>

              {/* 2. Bình thuốc độc */}
              <div>
                <div style={{ marginBottom: '6px' }}>
                  <strong>☠️ Bình Độc: </strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                    (Còn {game.witchItems.poisonLeft} bình) - Chọn 1 người để đầu độc:
                  </span>
                </div>

                {game.witchItems.poisonLeft > 0 ? (
                  <div className={styles.targetSelectionGrid}>
                    {alivePlayers.map(p => {
                      const isPoisonSelected = selectedWitchPoison === p.id;
                      return (
                        <PlayerTile
                          key={p.id}
                          name={p.name}
                          avatarUrl={p.avatar}
                          badgeLabel={isPoisonSelected ? '☠️ Độc' : undefined}
                          badgeVariant="red"
                          isSelected={isPoisonSelected}
                          onClick={() => setSelectedWitchPoison(prev => prev === p.id ? null : p.id)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--ash)' }}>
                    Đã hết bình thuốc độc trong ván này.
                  </p>
                )}
              </div>

              {/* Các nút bấm xác nhận Phù Thủy */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)', marginTop: 'var(--s-2)' }}>
                <Button
                  variant="primary"
                  pulse
                  disabled={isSubmitting}
                  onClick={handleConfirmWitchAction}
                >
                  ✓ Xác Nhận Hành Động Phù Thủy
                </Button>
                <Button
                  variant="ghost"
                  disabled={isSubmitting}
                  onClick={handleSkipWitch}
                  style={{ fontSize: '12px' }}
                >
                  Không dùng bình nào đêm nay (Bỏ qua)
                </Button>
              </div>
            </div>
          )}

          {/* E. DÀNH CHO CÁC VAI TRÒ KHÁC KHI ĐANG NGỦ TRONG ĐÊM */}
          {((nightStep === 'guard' && myPlayer.role !== 'guard') ||
            (nightStep === 'wolf' && !isWolfTeam(myPlayer.role)) ||
            (nightStep === 'seer' && myPlayer.role !== 'seer') ||
            (nightStep === 'witch' && myPlayer.role !== 'witch') ||
            nightStep === 'done') && (
            <div className={styles.sleepingCard}>
              <div className={styles.sleepingMoon}>🌙 ✨ 💤</div>
              <h3 className={styles.sleepingTitle}>CẢ LÀNG ĐANG NGỦ SAY</h3>
              <p className={styles.sleepingSub}>
                Màn đêm bao trùm ngôi làng. Bạn đang nhắm mắt ngủ say, vui lòng giữ yên lặng và quan sát thanh tiến trình phía trên!
              </p>
              <div className={styles.sleepingCurrentRole}>
                <span>Quản trò đang bí mật gọi: </span>
                <strong>
                  {nightStep === 'guard' && '🛡️ BẢO VỆ'}
                  {nightStep === 'wolf' && '🐺 BẦY MA SÓI'}
                  {nightStep === 'seer' && '🔮 TIÊN TRI'}
                  {nightStep === 'witch' && '🧪 PHÙ THỦY'}
                  {nightStep === 'done' && '✨ CHỜ BÌNH MINH'}
                </strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. THẺ BÀI BÍ MẬT DÀNH CHO NGƯỜI CHƠI (CHẾ ĐỘ ÚP & HIỆU ỨNG LẬT) */}
      {myPlayer && roleInfo ? (
        <div className={styles.cardSection}>
          <div className={styles.cardHint}>
            <div className={styles.cardHintTitle}>
              {isFlipped ? '👁️ VAI TRÒ BÍ MẬT CỦA BẠN' : '✦ THẺ BÀI BÍ MẬT'}
            </div>
            <div className={styles.cardHintSub}>
              {isFlipped 
                ? 'Chạm vào thẻ bài hoặc nút bên dưới để úp lại (bảo mật khi chơi)'
                : 'Chạm vào lá bài để mở lật xem thân phận của bạn'}
            </div>
          </div>

          {/* LÁ BÀI 3D VỚI HIỆU ỨNG XUẤT HIỆN & CHẾ ĐỘ ÚP */}
          <div 
            className={styles.cardWrapper} 
            onClick={handleToggleFlip}
            title={isFlipped ? "Chạm để úp thẻ lại" : "Chạm để lật mở thẻ"}
          >
            <RoleCard
              roleName={roleInfo.name}
              teamName={roleInfo.team}
              artUrl={myPlayer?.role ? ROLE_CARD_IMAGES[myPlayer.role] : undefined}
              cardBackUrl={CARD_BACK_IMAGE}
              icon={roleInfo.icon}
              faceDown={true}
              flipped={isFlipped}
              spawnAnimation={true}
              interactive={false}
            />
          </div>

          {/* NÚT THAO TÁC ÚP / MỞ TIỆN LỢI */}
          <Button
            variant={isFlipped ? "secondary" : "primary"}
            pulse={!isFlipped}
            onClick={handleToggleFlip}
            style={{ minHeight: '44px', width: '220px', fontSize: '13px' }}
          >
            {isFlipped ? '🔒 ÚP BÀI LẠI (GIẤU ĐI)' : '👁️ MỞ LẬT XEM VAI TRÒ'}
          </Button>

          {/* BẢNG GIẢI THÍCH CHI TIẾT VAI TRÒ KHI ĐÃ LẬT MỞ */}
          {isFlipped && (
            <div className={styles.roleDetailCard}>
              <div className={styles.roleDetailHeader}>
                <span className={styles.roleDetailTitle}>
                  {roleInfo.icon} {roleInfo.name}
                </span>
                <Badge variant={roleInfo.team === 'Phe Ma Sói' ? 'red' : 'gold'}>
                  {roleInfo.team}
                </Badge>
              </div>

              <p className={styles.roleDesc}>{roleInfo.description}</p>

              <div className={styles.roleActionHint}>
                {roleInfo.actionHint}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* CHẾ ĐỘ KHÁN GIẢ (NẾU VÀO PHÒNG SAU KHI GAME BẮT ĐẦU) */
        <Panel style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '4px' }}>👁️</div>
          <h3 style={{ margin: '0 0 4px 0', color: 'var(--gold-100)' }}>Chế Độ Khán Giả</h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-dim)' }}>
            Ván chơi đã bắt đầu trước khi bạn tham gia. Bạn đang quan sát tiến trình trận đấu trực tiếp.
          </p>
        </Panel>
      )}

      {/* 5. TRẠNG THÁI SỐNG / CHẾT CỦA BẢN THÂN */}
      {myPlayer && (
        <div className={styles.playerStatusBox}>
          <div className={styles.playerInfo}>
            {myPlayer.avatar ? (
              <img src={myPlayer.avatar} alt={myPlayer.name} className={styles.playerAvatar} />
            ) : (
              <div className={styles.playerAvatar} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                👤
              </div>
            )}
            <div>
              <div className={styles.playerName}>{myPlayer.name} (Bạn)</div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                {myPlayer.alive ? 'Đang tham gia ván đấu' : 'Đã bị loại khỏi ván ☠️'}
              </div>
            </div>
          </div>

          <Badge variant={myPlayer.alive ? 'green' : 'ash'}>
            {myPlayer.alive ? '💚 BẠN CÒN SỐNG' : '☠️ ĐÃ BỊ LOẠI'}
          </Badge>
        </div>
      )}

      {/* 6. TÌNH HÌNH CẢ PHÒNG (LƯỚI 3 CỘT ĐÚNG TIÊU CHUẨN MOBILE) */}
      <Panel>
        <div className={styles.gridTitle}>
          <span>TÌNH HÌNH NGƯỜI CHƠI</span>
          <Badge variant="gold">
            {alivePlayers.length}/{game.players.length} Còn sống
          </Badge>
        </div>

        <div className={styles.playersGrid}>
          {game.players.map((p) => {
            const isMe = user && p.id === user.uid;
            return (
              <PlayerTile
                key={p.id}
                name={p.name + (isMe ? ' (Bạn)' : '')}
                avatarUrl={p.avatar}
                role={p.alive ? 'Đang chơi' : 'Đã chết ☠️'}
                badgeLabel={p.alive ? 'Sống' : 'Chết'}
                badgeVariant={p.alive ? 'green' : 'ash'}
                isAlive={p.alive}
                layout="grid"
              />
            );
          })}
        </div>
      </Panel>

      {/* MODAL KẾT QUẢ TIÊN TRI SOI THÂN PHẬN */}
      {seerResultModal && (
        <Modal
          isOpen={true}
          onClose={handleFinishSeerCheck}
          title="🔮 KẾT QUẢ SOI DANH TÍNH"
          footer={
            <Button
              variant="primary"
              fullWidth
              disabled={isSubmitting}
              onClick={handleFinishSeerCheck}
            >
              ✓ Đã Rõ - Hoàn Tất Lượt Soi
            </Button>
          }
        >
          <div className={styles.seerModalContent}>
            <div className={styles.seerCrystalBall}>🔮</div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Người chơi được soi:</div>
              <h3 className={styles.seerTargetName}>{seerResultModal.target.name}</h3>
            </div>

            <div className={`
              ${styles.seerRoleBadge} 
              ${seerResultModal.isWolf ? styles.seerWolfBadge : styles.seerVillagerBadge}
            `}>
              {seerResultModal.isWolf ? '🐺 THUỘC PHE MA SÓI' : '👨‍🌾 THUỘC PHE DÂN LÀNG'}
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.4 }}>
              {seerResultModal.isWolf 
                ? '⚠️ Cẩn thận! Người này là Ma Sói đang trà trộn trong dân làng.' 
                : '✨ Người này thuộc Phe Dân Làng hiền lành và an toàn.'}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PlayerLiveView;
