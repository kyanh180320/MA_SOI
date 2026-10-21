import React, { useEffect, useRef, useState } from 'react';
import type { GameRoom, AppUser, Role, Player } from '../game/types';
import { Button, Panel, Badge, RoleCard, PlayerTile, Modal } from './ui';
import {
  submitGuardAction,
  submitHunterAction,
  submitSeerAction,
  submitWitchAction,
  submitWolfAction,
  submitWolfVotes,
} from '../services/roomService';
import { isWolfTeam } from '../game/win';
import { ROLE_CARD_IMAGES, CARD_BACK_IMAGE, NIGHT_ROLE_PROGRESS_ITEMS } from '../constants/assets';
import styles from './PlayerLiveView.module.css';
import { LazyCardSelectionRitual } from './LazyCardSelectionRitual';
import { getConfiguredNightRoleSteps, getNightStep, getWolfPackSelection } from '../game/night';
import { useDialog } from './dialog';

interface PlayerLiveViewProps {
  room: GameRoom;
  user: AppUser | null;
  onLeave: () => void;
}

export const ROLE_DETAILS: Record<Role, {
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
    description: "Mỗi đêm chọn trước 1 người sẽ chết cùng bạn. Nếu bạn bị Sói cắn, trúng độc hoặc bị dân làng treo cổ trong vòng đó, phát súng cuối sẽ tự động hạ mục tiêu đã chọn.",
    actionHint: "🌙 Ban đêm: Thức dậy chọn trước người sẽ chết cùng nếu bạn bị loại trong vòng."
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

export const PHASE_STEPS = [
  { id: 'night', label: 'Ban Đêm', icon: '🌙' },
  { id: 'day', label: 'Ban Ngày', icon: '☀️' },
  { id: 'vote', label: 'Bỏ Phiếu', icon: '⚖️' },
  { id: 'ended', label: 'Kết Quả', icon: '☠️' }
];

export const PlayerLiveView: React.FC<PlayerLiveViewProps> = ({ room, user, onLeave }) => {
  const { showAlert } = useDialog();
  const game = room.gameData;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States dành cho thao tác của các vai trò
  const [selectedWolfTargets, setSelectedWolfTargets] = useState<string[]>([]);
  const [wolfWarningMsg, setWolfWarningMsg] = useState<string | null>(null);

  const [selectedGuardTarget, setSelectedGuardTarget] = useState<string | null>(null);

  const [selectedSeerTarget, setSelectedSeerTarget] = useState<string | null>(null);
  const [seerResultModal, setSeerResultModal] = useState<{ target: Player; isWolf: boolean } | null>(null);

  const [witchSaveActive, setWitchSaveActive] = useState(false);
  const [selectedWitchPoison, setSelectedWitchPoison] = useState<string | null>(null);
  const [selectedHunterTarget, setSelectedHunterTarget] = useState<string | null>(null);
  const wolfVoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (wolfVoteTimerRef.current) clearTimeout(wolfVoteTimerRef.current);
  }, []);

  // Khai báo hook trước nhánh loading để thứ tự hook luôn ổn định khi gameData được đồng bộ.
  const ritualKey = `werewolf_ritual_seen_${game?.id || 'pending'}_${user?.uid || 'guest'}`;
  const [showRitual, setShowRitual] = useState<boolean>(() => {
    return !sessionStorage.getItem(ritualKey);
  });

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
  const configuredNightRoleSteps = getConfiguredNightRoleSteps(game.players);
  const nightStep = getNightStep(currentRound, game.players);
  const currentNightRoleItem = nightStep !== 'done' && nightStep !== 'wait'
    ? NIGHT_ROLE_PROGRESS_ITEMS[nightStep]
    : null;

  // Tìm người chơi ứng với tài khoản user hiện tại:
  const myPlayer: Player = (() => {
    if (user) {
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

      // 3. Khớp theo thứ tự thành viên (không tính Quản trò) trong phòng
      const memberIndex = (room.members || []).filter(m => !m.isHost).findIndex(m => m.uid === user.uid);
      if (memberIndex >= 0 && memberIndex < game.players.length) {
        return game.players[memberIndex];
      }
    }

    return game.players[0];
  })();

  const roleInfo = ROLE_DETAILS[myPlayer.role] || ROLE_DETAILS['villager'];

  const handleRitualComplete = () => {
    sessionStorage.setItem(ritualKey, 'true');
    setShowRitual(false);
  };
  const alivePlayers = game.players.filter(p => p.alive);

  // Tính tiến độ thanh tiến trình
  const nightStepIndex = nightStep === 'done'
    ? configuredNightRoleSteps.length
    : configuredNightRoleSteps.indexOf(nightStep as (typeof configuredNightRoleSteps)[number]);

  const currentPhaseIndex = PHASE_STEPS.findIndex(s => s.id === currentPhase);
  const phaseProgressPercent = currentPhaseIndex >= 0 
    ? (currentPhaseIndex / (PHASE_STEPS.length - 1)) * 100 
    : 0;

  const nightProgressPercent = nightStep === 'done'
    ? 100
    : configuredNightRoleSteps.length <= 1
      ? 0
      : Math.max(0, (nightStepIndex / (configuredNightRoleSteps.length - 1)) * 100);

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
  const myWolfTargets = selectedWolfTargets.length > 0
    ? selectedWolfTargets
    : wolfVotesMap[myPlayer.id] ?? [];

  const queueWolfVote = (targetIds: string[]) => {
    if (!myPlayer || aliveWolves.length <= 1) return;

    const votes: Record<string, string[]> = { [myPlayer.id]: targetIds };
    aliveWolves.forEach(wolf => {
      const isBot = wolf.id.startsWith('bot_') || room.members?.find(member => member.uid === wolf.id)?.isBot;
      if (isBot) votes[wolf.id] = targetIds;
    });

    if (wolfVoteTimerRef.current) clearTimeout(wolfVoteTimerRef.current);
    wolfVoteTimerRef.current = setTimeout(() => {
      submitWolfVotes(room.id, game.id, roundNumber, votes).catch(error => {
        console.error('Lỗi cập nhật vote bầy sói:', error);
      });
    }, 180);
  };

  // Xử lý khi Sói bấm chọn mục tiêu
  const handleSelectWolfTarget = (targetId: string) => {
    setWolfWarningMsg(null);

    const targetPlayer = game.players.find(p => p.id === targetId);
    if (targetPlayer && isWolfTeam(targetPlayer.role)) {
      setWolfWarningMsg("⚠️ Sói không thể cắn đồng đội trong phe Sói!");
      return;
    }

    // TRƯỜNG HỢP 1: CÓ SÓI QUỶ (Tối đa 2 người)
    if (hasDemonWolf) {
      if (myWolfTargets.includes(targetId)) {
        const nextTargets = myWolfTargets.filter(id => id !== targetId);
        setSelectedWolfTargets(nextTargets);
        queueWolfVote(nextTargets);
      } else {
        if (myWolfTargets.length >= 2) {
          const message = 'Bầy Sói có Sói Quỷ cũng chỉ được cắn tối đa 2 người trong một đêm. Hãy bỏ chọn một mục tiêu trước khi đổi người.';
          setWolfWarningMsg(`⚠️ ${message}`);
          void showAlert({
            title: 'Vượt giới hạn cắn',
            message,
            tone: 'warning',
          });
          return;
        }
        const nextTargets = [...myWolfTargets, targetId];
        setSelectedWolfTargets(nextTargets);
        queueWolfVote(nextTargets);
      }
      return;
    }

    // TRƯỜNG HỢP 2: CHỈ CÓ SÓI THƯỜNG (Bắt buộc chọn 1 người và đồng thuận nếu có nhiều sói)
    setSelectedWolfTargets([targetId]);
    queueWolfVote([targetId]);
  };

  // Xác nhận cắn người của Bầy Sói
  const handleConfirmWolfBite = async () => {
    setIsSubmitting(true);
    try {
      let finalTargets: string[] = [];

      if (aliveWolves.length > 1) {
        const selection = getWolfPackSelection(game.players, {
          ...wolfVotesMap,
          [myPlayer.id]: myWolfTargets,
        });

        if (!selection.allWolvesVoted) {
          await showAlert({
            title: 'Chưa đủ lựa chọn',
            message: 'Cần chờ tất cả Sói còn sống chọn mục tiêu trước khi xác nhận.',
            tone: 'warning',
          });
          return;
        }

        if (selection.exceedsLimit) {
          await showAlert({
            title: 'Bầy Sói chọn quá số người',
            message: selection.maxTargets === 1
              ? 'Bầy chỉ có Sói thường nên tất cả Sói phải thống nhất cắn cùng 1 người.'
              : `Bầy có Sói Quỷ nhưng chỉ được cắn tối đa 2 người. Hiện các Sói đang chọn ${selection.targetIds.length} người khác nhau.`,
            tone: 'danger',
          });
          return;
        }

        finalTargets = selection.targetIds;
      } else {
        finalTargets = selectedWolfTargets;
      }

      const validTargets = finalTargets.filter(id => {
        const p = game.players.find(player => player.id === id);
        return p && !isWolfTeam(p.role);
      });
      if (wolfVoteTimerRef.current) {
        clearTimeout(wolfVoteTimerRef.current);
        wolfVoteTimerRef.current = null;
      }
      await submitWolfAction(room.id, game.id, roundNumber, validTargets);
      setSelectedWolfTargets([]);
    } catch (e) {
      console.error("Lỗi xác nhận cắn người:", e);
      await showAlert({
        title: 'Mất kết nối với phòng',
        message: 'Không thể xác nhận mục tiêu cắn. Lựa chọn của bạn chưa được gửi, vui lòng thử lại.',
        tone: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bỏ qua không cắn ai
  const handleSkipWolfBite = async () => {
    setIsSubmitting(true);
    try {
      if (wolfVoteTimerRef.current) {
        clearTimeout(wolfVoteTimerRef.current);
        wolfVoteTimerRef.current = null;
      }
      await submitWolfAction(room.id, game.id, roundNumber, []);
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
      await submitGuardAction(room.id, game.id, roundNumber, targetId || 'none');
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
      await submitSeerAction(room.id, game.id, roundNumber, {
        target: seerResultModal.target.id,
        isWolf: seerResultModal.isWolf,
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
      const newItems = { ...game.witchItems };
      if (witchSaveActive) newItems.saveLeft = Math.max(0, newItems.saveLeft - 1);

      const isTargetWitch = selectedWitchPoison && (
        selectedWitchPoison === myPlayer?.id ||
        game.players.some(p => p.id === selectedWitchPoison && p.role === 'witch')
      );
      const validPoisonTarget = isTargetWitch ? null : selectedWitchPoison;
      if (validPoisonTarget) newItems.poisonLeft = Math.max(0, newItems.poisonLeft - 1);

      await submitWitchAction(room.id, game.id, roundNumber, {
        saved: witchSaveActive,
        savedTarget: witchSaveActive ? currentWolfVictims[0] : undefined,
        poisonTarget: validPoisonTarget || undefined,
        witchItems: newItems,
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
      await submitWitchAction(room.id, game.id, roundNumber, {
        saved: false,
        witchItems: game.witchItems,
      });
      setWitchSaveActive(false);
      setSelectedWitchPoison(null);
    } catch (e) {
      console.error("Lỗi bỏ qua phù thủy:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // XỬ LÝ LOGIC CỦA THỢ SĂN
  // -------------------------------------------------------------
  const myHunterChoice = currentRound?.hunterTargets?.[myPlayer.id];

  const handleConfirmHunterTarget = async (targetId: string | null) => {
    setIsSubmitting(true);
    try {
      await submitHunterAction(
        room.id,
        game.id,
        roundNumber,
        myPlayer.id,
        targetId || 'none',
      );
      setSelectedHunterTarget(null);
    } catch (error) {
      console.error('Lỗi lưu lựa chọn Thợ săn:', error);
      await showAlert({
        title: 'Chưa lưu được lựa chọn',
        message: 'Mục tiêu của Thợ săn chưa được gửi. Hãy kiểm tra kết nối và thử lại.',
        tone: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      {(room.syncState === 'offline' || room.syncState === 'syncing' || isSubmitting) && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'sticky',
            top: '8px',
            zIndex: 30,
            alignSelf: 'center',
            padding: '7px 12px',
            borderRadius: '999px',
            border: '1px solid rgba(225, 188, 102, 0.45)',
            background: 'rgba(17, 13, 10, 0.92)',
            color: 'var(--gold-100)',
            fontSize: '12px',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
          }}
        >
          {room.syncState === 'offline'
            ? '📶 Mạng yếu — thao tác đã lưu trên máy, sẽ tự gửi lại'
            : '↻ Đang đồng bộ thao tác…'}
        </div>
      )}

      {/* HIỆU ỨNG RÚT BÀI ĐỊNH MỆNH KHI QUẢN TRÒ BẮT ĐẦU VÁN */}
      {showRitual && myPlayer && roleInfo && (
        <LazyCardSelectionRitual
          myRole={myPlayer.role}
          roleInfo={roleInfo}
          onComplete={handleRitualComplete}
        />
      )}

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
                {currentNightRoleItem && (
                  <span className={styles.phaseRoleName}>
                    <img
                      className={styles.phaseRoleIcon}
                      src={currentNightRoleItem.iconUrl}
                      alt=""
                    />
                    {currentNightRoleItem.label}
                  </span>
                )}
                {nightStep === 'done' && '✨ Chờ Bình Minh'}
              </>
            )}
            {currentPhase === 'day' && '☀️ Ban Ngày'}
            {currentPhase === 'vote' && '⚖️ Bỏ Phiếu Treo Cổ'}
            {currentPhase === 'ended' && '🏁 Trận Đấu Kết Thúc'}
          </div>
        </div>

        {/* Danh sách icon cố định theo cấu hình đầu ván; role chết chỉ mất quyền thao tác */}
        {currentPhase === 'night' ? (
          <div className={styles.stepper}>
            <div className={styles.stepLine}>
              <div 
                className={styles.stepLineProgress} 
                style={{ width: `${nightProgressPercent}%` }} 
              />
            </div>

            {configuredNightRoleSteps.map((stepId, idx) => {
              const step = NIGHT_ROLE_PROGRESS_ITEMS[stepId];
              const isPassed = idx < nightStepIndex || nightStep === 'done';
              const isActive = idx === nightStepIndex && nightStep !== 'done';

              return (
                <div 
                  key={stepId}
                  className={`
                    ${styles.stepItem} 
                    ${isActive ? styles.stepItemRoleActive : ''} 
                    ${isPassed ? styles.stepItemPassed : ''}
                  `}
                >
                  <div className={styles.stepCircle}>
                    {isPassed
                      ? '✓'
                      : <img className={styles.stepRoleIcon} src={step.iconUrl} alt={step.label} />}
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
                          ⚠️ Các Sói đang chọn khác người! Tất cả Sói thường phải thống nhất chọn CÙNG 1 NGƯỜI mới cắn được!
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
                  const isSelected = myWolfTargets.includes(p.id);

                  return (
                    <PlayerTile
                      key={p.id}
                      name={p.name}
                      avatarUrl={p.avatar}
                      badgeLabel={isSelected ? '🎯 Cắn' : (isWolf ? '🐺 Phe Sói' : undefined)}
                      badgeVariant={isSelected ? 'red' : 'ash'}
                      isSelected={isSelected}
                      disabled={isWolf}
                      onClick={() => {
                        if (isWolf) {
                          setWolfWarningMsg("⚠️ Sói không thể cắn đồng đội trong phe Sói!");
                          return;
                        }
                        handleSelectWolfTarget(p.id);
                      }}
                    />
                  );
                })}
              </div>

              {/* CÁC NÚT XÁC NHẬN BẦY SÓI */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)', marginTop: 'var(--s-2)' }}>
                {hasDemonWolf ? (
                  <Button
                    variant="danger"
                    pulse={myWolfTargets.length > 0}
                    disabled={isSubmitting || myWolfTargets.length === 0}
                    onClick={handleConfirmWolfBite}
                  >
                    {myWolfTargets.length > 0
                      ? `✓ Kiểm tra và xác nhận (${myWolfTargets.map(id => game.players.find(p => p.id === id)?.name).join(', ')})`
                      : 'Hãy chọn ít nhất 1 nạn nhân'}
                  </Button>
                ) : (
                  aliveWolves.length > 1 ? (
                    <Button
                      variant="danger"
                      pulse={isWolfConsensus}
                      disabled={isSubmitting || myWolfTargets.length === 0}
                      onClick={handleConfirmWolfBite}
                    >
                      {isWolfConsensus && consensusPlayer
                        ? `✓ Xác Nhận Cắn Đồng Thuận: ${consensusPlayer.name}`
                        : '⚠️ Kiểm tra lựa chọn của cả bầy'}
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
                      name={p.name}
                      avatarUrl={p.avatar}
                      badgeLabel={isSelected ? '🛡️ Bảo vệ' : (isPrevProtected ? '🔒 Đêm trước' : undefined)}
                      badgeVariant={isSelected ? 'gold' : 'ash'}
                      isSelected={isSelected}
                      disabled={isPrevProtected}
                      onClick={() => {
                        if (isPrevProtected) {
                          void showAlert({
                            title: 'Mục tiêu không hợp lệ',
                            message: 'Bảo Vệ không thể bảo vệ cùng một người trong hai đêm liên tiếp.',
                            tone: 'warning',
                          });
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
                      const isSelf = p.id === myPlayer?.id || p.role === 'witch';
                      const isPoisonSelected = selectedWitchPoison === p.id;
                      return (
                        <PlayerTile
                          key={p.id}
                          name={p.name}
                          avatarUrl={p.avatar}
                          badgeLabel={isPoisonSelected ? '☠️ Độc' : (isSelf ? '🧪 Bản thân' : undefined)}
                          badgeVariant={isPoisonSelected ? 'red' : 'ash'}
                          isSelected={isPoisonSelected}
                          disabled={isSelf}
                          onClick={() => {
                            if (isSelf) {
                              void showAlert({
                                title: 'Không thể dùng bình độc',
                                message: 'Phù Thủy không thể dùng bình độc lên chính mình.',
                                tone: 'warning',
                              });
                              return;
                            }
                            setSelectedWitchPoison(prev => prev === p.id ? null : p.id);
                          }}
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

          {/* E. THAO TÁC CỦA THỢ SĂN */}
          {nightStep === 'hunter' && myPlayer.role === 'hunter' && (
            <div className={styles.actionPanel}>
              <div className={styles.actionHeader}>
                <h3 className={styles.actionTitle} style={{ color: 'var(--orange-400)' }}>
                  🏹 THỢ SĂN CHỌN NGƯỜI CHẾT CÙNG
                </h3>
                <Badge variant="gold">Thợ Săn</Badge>
              </div>

              {myHunterChoice !== undefined ? (
                <div className={styles.wolfAlertConsensus}>
                  ✓ Bạn đã chọn:{' '}
                  <strong>
                    {myHunterChoice === 'none'
                      ? 'Không bắn ai'
                      : game.players.find(player => player.id === myHunterChoice)?.name || 'Mục tiêu đã chọn'}
                  </strong>. Đang chờ Thợ săn khác hoàn tất lượt.
                </div>
              ) : (
                <>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)' }}>
                    Chọn trước 1 người. Nếu bạn chết trong vòng này, người đó sẽ bị kéo theo ngay lập tức.
                  </p>

                  <div className={styles.targetSelectionGrid}>
                    {alivePlayers.filter(player => player.id !== myPlayer.id).map(player => {
                      const isSelected = selectedHunterTarget === player.id;
                      return (
                        <PlayerTile
                          key={player.id}
                          name={player.name}
                          avatarUrl={player.avatar}
                          badgeLabel={isSelected ? '🎯 Chết cùng' : undefined}
                          badgeVariant="red"
                          isSelected={isSelected}
                          onClick={() => setSelectedHunterTarget(previous => previous === player.id ? null : player.id)}
                        />
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)', marginTop: 'var(--s-2)' }}>
                    <Button
                      variant="danger"
                      pulse={!!selectedHunterTarget}
                      disabled={!selectedHunterTarget || isSubmitting}
                      onClick={() => handleConfirmHunterTarget(selectedHunterTarget)}
                    >
                      {selectedHunterTarget
                        ? `✓ Chọn chết cùng: ${game.players.find(player => player.id === selectedHunterTarget)?.name}`
                        : 'Hãy chọn 1 người chết cùng'}
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={isSubmitting}
                      onClick={() => handleConfirmHunterTarget(null)}
                      style={{ fontSize: '12px' }}
                    >
                      Không bắn ai nếu chết (Bỏ qua)
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* F. DÀNH CHO CÁC VAI TRÒ KHÁC KHI ĐANG NGỦ TRONG ĐÊM */}
          {((nightStep === 'guard' && myPlayer.role !== 'guard') ||
            (nightStep === 'wolf' && !isWolfTeam(myPlayer.role)) ||
            (nightStep === 'seer' && myPlayer.role !== 'seer') ||
            (nightStep === 'witch' && myPlayer.role !== 'witch') ||
            (nightStep === 'hunter' && myPlayer.role !== 'hunter') ||
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
                  {nightStep === 'hunter' && '🏹 THỢ SĂN'}
                  {nightStep === 'done' && '✨ CHỜ BÌNH MINH'}
                </strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. THẺ BÀI VAI TRÒ CỦA NGƯỜI CHƠI */}
      {myPlayer && roleInfo ? (
        <div className={styles.cardSection}>
          <div className={styles.cardHint}>
            <div className={styles.cardHintTitle}>
              👁️ VAI TRÒ BÍ MẬT CỦA BẠN
            </div>
            <button
              type="button"
              onClick={() => setShowRitual(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--gold-300)',
                fontSize: '11px',
                cursor: 'pointer',
                marginTop: '4px',
                textDecoration: 'underline'
              }}
              title="Xem lại hiệu ứng chia và rút bài định mệnh"
            >
              ✨ Xem lại hiệu ứng rút bài
            </button>
          </div>

          {/* LÁ BÀI 3D VỚI NGHỆ THUẬT VAI TRÒ LUÔN MỞ SẴN */}
          <div className={styles.cardWrapper}>
            <RoleCard
              roleName={roleInfo.name}
              teamName={roleInfo.team}
              artUrl={myPlayer?.role ? ROLE_CARD_IMAGES[myPlayer.role] : undefined}
              cardBackUrl={CARD_BACK_IMAGE}
              icon={roleInfo.icon}
              faceDown={false}
              flipped={false}
              spawnAnimation={false}
              interactive={false}
            />
          </div>

          {/* BẢNG GIẢI THÍCH CHI TIẾT VAI TRÒ */}
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
