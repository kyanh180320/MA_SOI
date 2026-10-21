import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { resolveHunterShots, resolveNight, mergeRemoteNightActions, getConfiguredNightRoleSteps, getNightStep, getWolfTargetLimit } from '../game/night';
import { checkWinner, isWolfTeam } from '../game/win';
import { createRematchGame } from '../game/rematch';
import { isExpectedGameReady } from '../game/playEntry';
import type { NightRoleStep, Role, Player } from '../game/types';
import {
  closeRoom,
  startRoomRematch,
  submitDeadRoleSkipAction,
  submitGuardAction,
  submitHunterAction,
  submitSeerAction,
  submitWitchAction,
  submitWolfAction,
  subscribeRoom,
  syncRoomGame,
} from '../services/roomService';
import { saveGame } from '../services/gameRepository';
import {
  Button,
  Panel,
  Badge,
  PhaseBanner,
  PlayerTile,
  Toast
} from '../components/ui';
import { DiscussionTimer, NightPhaseController } from '../components/game';
import { NIGHT_ROLE_PROGRESS_ITEMS, PHASE_MEDALLION_ICONS } from '../constants/assets';
import { useDialog } from '../components/dialog';

export default function PlayPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { game, updateGame, updateGameLocally, applyRemoteGame, replaceRemoteGame, undo, canUndo, setGame } = useGame();
  const { user } = useAuth();
  const { showAlert, showConfirm } = useDialog();
  const [showRoles, setShowRoles] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [isSavingGame, setIsSavingGame] = useState(false);
  const [isStartingRematch, setIsStartingRematch] = useState(false);
  const [roomSyncState, setRoomSyncState] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const expectedGameId = (location.state as { expectedGameId?: string } | null)?.expectedGameId;
  const isPlayEntryReady = isExpectedGameReady(game, expectedGameId);

  // States hỗ trợ chọn trước khi xác nhận (Vote & Thợ săn)
  const [selectedVoteTarget, setSelectedVoteTarget] = useState<string | null>(null);
  const [selectedHunterTarget, setSelectedHunterTarget] = useState<string | null>(null);
  const [hunterPendingDeath, setHunterPendingDeath] = useState<{ hunter: Player; from: 'night' | 'vote' } | null>(null);

  // Chế độ online: lắng nghe phòng để nhận hành động ban đêm do người chơi thao tác trên điện thoại,
  // từ đó màn hình Quản trò tự động nhảy sang lượt gọi vai trò tiếp theo.
  const gameRef = useRef(isPlayEntryReady ? game : null);
  const roomDeletedRef = useRef(false);
  useEffect(() => {
    gameRef.current = isPlayEntryReady ? game : null;
  }, [game, isPlayEntryReady]);

  const roomId = isPlayEntryReady ? game?.roomId : undefined;
  useEffect(() => {
    if (!roomId) return;
    roomDeletedRef.current = false;
    const unsubscribe = subscribeRoom(roomId, (room) => {
      if (!room) {
        if (roomDeletedRef.current) return;
        roomDeletedRef.current = true;
        setGame(null);
        void showAlert({
          title: 'Phòng đã bị xoá',
          message: 'Phòng đã bị chủ phòng hoặc người quản lý xoá. Bạn sẽ được đưa về Trang Chủ.',
          tone: 'warning',
          confirmLabel: 'Về Trang Chủ',
        }).then(() => navigate('/', { replace: true }));
        return;
      }

      setRoomSyncState(room.syncState ?? 'synced');
      const local = gameRef.current;
      if (!local || !room.gameData) return;
      const merged = mergeRemoteNightActions(local, room.gameData);
      if (merged) {
        gameRef.current = merged;
        applyRemoteGame(merged);
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  if (expectedGameId && !isPlayEntryReady) {
    return (
      <div className="screen-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p role="status" style={{ color: 'var(--gold-300)', fontSize: '14px', fontWeight: 600 }}>
          Đang đồng bộ đúng cấu hình vai trò…
        </p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="screen-container" style={{ alignItems: 'center', justifyContent: 'center', gap: 'var(--s-4)' }}>
        <Panel>
          <h2 style={{ fontFamily: 'var(--font-title)', color: 'var(--gold-100)', margin: '0 0 var(--s-2) 0' }}>
            Không tìm thấy ván chơi
          </h2>
          <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '14px' }}>
            Ván chơi có thể đã kết thúc hoặc dữ liệu chưa được nạp.
          </p>
        </Panel>
        <Button variant="primary" pulse onClick={() => navigate('/setup')}>
          Tạo Ván Mới
        </Button>
      </div>
    );
  }

  const alivePlayers = game.players.filter(p => p.alive);
  const currentRound = game.rounds[game.rounds.length - 1];
  const currentHunterShotTargetIds = currentRound.hunterShotTargets
    ? [...new Set(Object.values(currentRound.hunterShotTargets))]
    : currentRound.hunterShotTarget
      ? [currentRound.hunterShotTarget]
      : [];

  const handleExit = async () => {
    if (isExiting) return;
    setIsExiting(true);
    const confirmed = await showConfirm({
      title: 'Thoát ván không lưu?',
      message: 'Toàn bộ tiến trình của ván hiện tại sẽ không được lưu vào lịch sử. Bạn có chắc chắn muốn thoát?',
      tone: 'danger',
      confirmLabel: 'Thoát không lưu',
      cancelLabel: 'Tiếp tục chơi',
    });
    if (!confirmed) {
      setIsExiting(false);
      return;
    }

    const exitingRoomId = game.roomId;
    setGame(null);
    navigate('/', { replace: true });

    // Thoát UI ngay, không giữ Quản trò ở màn chơi trong lúc xác minh và xoá
    // phòng. Nếu mất mạng, transaction thất bại và phòng vẫn còn để khôi phục.
    if (exitingRoomId) {
      void closeRoom(exitingRoomId, user).catch((error: unknown) => {
        console.error(`Lỗi khi đóng phòng online ${exitingRoomId}:`, error);
      });
    }
  };

  const handleEndGame = async () => {
    if (isSavingGame) return;
    setIsSavingGame(true);
    const confirmed = await showConfirm({
      title: 'Lưu và kết thúc ván?',
      message: 'Kết quả phe thắng sẽ được lưu vào lịch sử và cập nhật bảng xếp hạng.',
      tone: 'warning',
      confirmLabel: 'Lưu kết quả',
      cancelLabel: 'Quay lại',
    });
    if (!confirmed) {
      setIsSavingGame(false);
      return;
    }

    // Phòng online được giữ lại để cả nhóm có thể vào lại hoặc chơi tiếp.
    // saveGame lưu local trước rồi mới đồng bộ cloud nên kết quả vẫn có khi mạng yếu.
    await saveGame(game);
    setGame(null);
    navigate('/leaderboard');
  };

  const handleRematch = async () => {
    if (!game.roomId || !user || isStartingRematch || isSavingGame) return;

    const confirmed = await showConfirm({
      title: 'Chơi lại cùng phòng?',
      message: 'Kết quả ván này sẽ được lưu. Danh sách người chơi và số lượng từng vai được giữ nguyên, sau đó vai sẽ được xáo lại.',
      tone: 'warning',
      confirmLabel: 'Chia lại vai',
      cancelLabel: 'Ở lại kết quả',
    });
    if (!confirmed) return;

    setIsStartingRematch(true);
    try {
      await saveGame(game);

      // Đẩy trạng thái kết thúc lên trước để transaction rematch kiểm tra đúng
      // ván hiện tại, kể cả khi effect đồng bộ trước đó vẫn đang chờ mạng.
      await syncRoomGame(game.roomId, game);

      const nextGame = createRematchGame(game);
      await startRoomRematch(game.roomId, game.id, nextGame, user.uid);
      replaceRemoteGame(nextGame);
    } catch (error: unknown) {
      console.error(`Không thể chơi lại trong phòng ${game.roomId}:`, error);
      await showAlert({
        title: 'Chưa thể bắt đầu ván mới',
        message: (error as Error).message || 'Hãy kiểm tra kết nối rồi thử lại.',
        tone: 'danger',
      });
    } finally {
      setIsStartingRematch(false);
    }
  };

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case 'wolf': return '🐺 Sói';
      case 'wolf_demon': return '😈 Sói quỷ';
      case 'seer': return '👁 Tiên tri';
      case 'witch': return '🧪 Phù thủy';
      case 'guard': return '🛡 Bảo vệ';
      case 'hunter': return '🏹 Thợ săn';
      default: return '👨 Dân';
    }
  };

  const configuredNightRoleSteps = getConfiguredNightRoleSteps(game.players);
  const nightStep = getNightStep(currentRound, game.players);
  const currentNightRoleItem = nightStep !== 'done' && nightStep !== 'wait'
    ? NIGHT_ROLE_PROGRESS_ITEMS[nightStep]
    : null;
  const nightStepIndex = nightStep === 'done'
    ? configuredNightRoleSteps.length
    : configuredNightRoleSteps.indexOf(nightStep as (typeof configuredNightRoleSteps)[number]);
  const nightProgressPercent = nightStep === 'done'
    ? 100
    : configuredNightRoleSteps.length <= 1
      ? 0
      : Math.max(0, (nightStepIndex / (configuredNightRoleSteps.length - 1)) * 100);

  const syncModeratorNightAction = (label: string, operation: Promise<void>) => {
    void operation.catch((error: unknown) => {
      console.error(`Không thể đồng bộ thao tác ${label} trong phòng ${game.roomId}:`, error);
      void showAlert({
        title: 'Chưa thể đồng bộ thao tác',
        message: `${label} đã được lưu trên máy này nhưng chưa gửi được tới các người chơi. Hãy kiểm tra kết nối rồi thử lại.`,
        tone: 'danger',
      });
    });
  };

  const handleGuardProtect = (targetId: string | null) => {
    const selectedTarget = targetId || 'none';
    updateGameLocally(g => {
      const rounds = [...g.rounds];
      rounds[rounds.length - 1] = { ...rounds[rounds.length - 1], guardProtectTarget: selectedTarget };
      return { ...g, rounds };
    });
    if (game.roomId) {
      syncModeratorNightAction(
        'lựa chọn của Bảo Vệ',
        submitGuardAction(game.roomId, game.id, currentRound.number, selectedTarget),
      );
    }
  };

  const handleWolfTargets = (targetIds: string[]) => {
    const maxTargets = getWolfTargetLimit(game.players);
    const validTargetIds = [...new Set(targetIds)].filter(id => {
      const player = game.players.find(candidate => candidate.id === id);
      return player?.alive && !isWolfTeam(player.role);
    }).slice(0, maxTargets);
    const selectedTargets = validTargetIds.length > 0 ? validTargetIds : ['none'];

    updateGameLocally(g => {
      const rounds = [...g.rounds];
      rounds[rounds.length - 1] = { 
        ...rounds[rounds.length - 1], 
        wolfTarget: selectedTargets[0],
        wolfTargets: selectedTargets,
      };
      return { ...g, rounds };
    });
    if (game.roomId) {
      syncModeratorNightAction(
        'mục tiêu của Bầy Sói',
        submitWolfAction(game.roomId, game.id, currentRound.number, validTargetIds),
      );
    }
  };

  const handleSeerCheck = (targetId: string | null) => {
    const target = targetId ? game.players.find(player => player.id === targetId) : null;
    const seerCheck = targetId
      ? { target: targetId, isWolf: target ? isWolfTeam(target.role) : false }
      : { target: 'none', isWolf: false };

    updateGameLocally(g => {
      const rounds = [...g.rounds];
      rounds[rounds.length - 1] = { 
        ...rounds[rounds.length - 1], 
        seerCheck,
      };
      return { ...g, rounds };
    });
    if (game.roomId) {
      syncModeratorNightAction(
        'kết quả của Tiên Tri',
        submitSeerAction(game.roomId, game.id, currentRound.number, seerCheck),
      );
    }
  };

  const handleWitchAction = (saveTargetId: string | null, poisonTargetId: string | null) => {
    const isSelfPoison = poisonTargetId && game.players.some(player => (
      player.id === poisonTargetId && player.role === 'witch'
    ));
    const validPoisonTargetId = isSelfPoison ? null : poisonTargetId;
    const nextWitchItems = { ...game.witchItems };
    if (saveTargetId) nextWitchItems.saveLeft = Math.max(0, nextWitchItems.saveLeft - 1);
    if (validPoisonTargetId) nextWitchItems.poisonLeft = Math.max(0, nextWitchItems.poisonLeft - 1);

    updateGameLocally(g => {
      const rounds = [...g.rounds];
      rounds[rounds.length - 1] = { 
        ...rounds[rounds.length - 1], 
        witchSaved: !!saveTargetId,
        witchSavedTarget: saveTargetId || undefined,
        witchPoisonTarget: validPoisonTargetId || undefined
      };
      
      return { ...g, rounds, witchItems: nextWitchItems };
    });
    if (game.roomId) {
      syncModeratorNightAction(
        'lựa chọn của Phù Thủy',
        submitWitchAction(game.roomId, game.id, currentRound.number, {
          saved: !!saveTargetId,
          savedTarget: saveTargetId || undefined,
          poisonTarget: validPoisonTargetId || undefined,
          witchItems: nextWitchItems,
        }),
      );
    }
  };

  const handleHunterTarget = (hunterId: string, targetId: string | null) => {
    const selectedTarget = targetId || 'none';
    updateGameLocally(g => {
      const rounds = [...g.rounds];
      const round = rounds[rounds.length - 1];
      rounds[rounds.length - 1] = {
        ...round,
        hunterTargets: {
          ...(round.hunterTargets ?? {}),
          [hunterId]: selectedTarget,
        },
      };
      return { ...g, rounds };
    });
    if (game.roomId) {
      syncModeratorNightAction(
        'lựa chọn của Thợ Săn',
        submitHunterAction(game.roomId, game.id, currentRound.number, hunterId, selectedTarget),
      );
    }
  };

  const handleSkipDeadRole = (step: NightRoleStep) => {
    updateGameLocally(g => {
      const rounds = [...g.rounds];
      const roundIndex = rounds.length - 1;
      const round = rounds[roundIndex];
      if (round.skippedDeadRoleSteps?.includes(step)) return g;

      rounds[roundIndex] = {
        ...round,
        skippedDeadRoleSteps: [...(round.skippedDeadRoleSteps ?? []), step],
      };
      return { ...g, rounds };
    });
    if (game.roomId && !currentRound.skippedDeadRoleSteps?.includes(step)) {
      syncModeratorNightAction(
        `bước gọi role ${step}`,
        submitDeadRoleSkipAction(game.roomId, game.id, currentRound.number, step),
      );
    }
  };

  // Thợ săn bắn người khi chết
  const handleHunterShoot = (targetId: string | null) => {
    if (!hunterPendingDeath) return;
    const { from } = hunterPendingDeath;

    updateGame(g => {
      let newPlayers = [...g.players];
      if (targetId) {
        newPlayers = newPlayers.map(p => p.id === targetId ? { ...p, alive: false } : p);
      }

      const rounds = [...g.rounds];
      if (targetId) {
        rounds[rounds.length - 1] = {
          ...rounds[rounds.length - 1],
          hunterShotTarget: targetId,
          hunterShotTargets: {
            ...(rounds[rounds.length - 1].hunterShotTargets ?? {}),
            [hunterPendingDeath.hunter.id]: targetId,
          },
        };
      }

      const winner = checkWinner(newPlayers);

      if (from === 'night') {
        return {
          ...g,
          players: newPlayers,
          rounds,
          phase: winner ? 'ended' : 'day',
          winner
        };
      } else {
        if (!winner) {
          rounds.push({ number: rounds.length + 1, nightDeaths: [] });
        }
        return {
          ...g,
          players: newPlayers,
          rounds,
          phase: winner ? 'ended' : 'night',
          winner
        };
      }
    });

    setHunterPendingDeath(null);
    setSelectedHunterTarget(null);
  };

  const finishNight = () => {
    const lastRound = game.rounds[game.rounds.length - 1];
    const nightDeaths = resolveNight(lastRound, game.players);
    const hunterResolution = resolveHunterShots(nightDeaths, lastRound, game.players);
    const newPlayers = game.players.map(p => 
      hunterResolution.deaths.includes(p.id) ? { ...p, alive: false } : p
    );

    const shotTargets = Object.values(hunterResolution.shots);
    const resolvedRound = {
      ...lastRound,
      nightDeaths,
      ...(shotTargets.length > 0 ? {
        hunterShotTarget: shotTargets[0],
        hunterShotTargets: hunterResolution.shots,
      } : {}),
    };
    const unresolvedHunter = hunterResolution.unresolvedHunterIds.length > 0
      ? game.players.find(player => player.id === hunterResolution.unresolvedHunterIds[0])
      : null;

    if (unresolvedHunter) {
      updateGame(g => {
        const rounds = [...g.rounds];
        rounds[rounds.length - 1] = resolvedRound;
        return {
          ...g,
          players: newPlayers,
          rounds
        };
      });
      setHunterPendingDeath({ hunter: unresolvedHunter, from: 'night' });
      return;
    }

    updateGame(g => {
      const rounds = [...g.rounds];
      rounds[rounds.length - 1] = resolvedRound;

      const winner = checkWinner(newPlayers);

      return {
        ...g,
        players: newPlayers,
        rounds,
        phase: winner ? 'ended' : 'day',
        winner
      };
    });
  };

  const handleVote = (eliminatedId: string | null) => {
    if (!eliminatedId) {
      updateGame(g => {
        const rounds = [...g.rounds];
        rounds[rounds.length - 1] = {
          ...rounds[rounds.length - 1],
          vote: { tally: {}, eliminated: undefined }
        };

        const winner = checkWinner(g.players);
        if (!winner) {
          rounds.push({ number: rounds.length + 1, nightDeaths: [] });
        }

        return {
          ...g,
          rounds,
          phase: winner ? 'ended' : 'night',
          winner
        };
      });
      setSelectedVoteTarget(null);
      return;
    }

    const hunterResolution = resolveHunterShots([eliminatedId], currentRound, game.players);
    const newPlayers = game.players.map(player =>
      hunterResolution.deaths.includes(player.id) ? { ...player, alive: false } : player
    );
    const shotTargets = Object.values(hunterResolution.shots);
    const unresolvedHunter = hunterResolution.unresolvedHunterIds.length > 0
      ? game.players.find(player => player.id === hunterResolution.unresolvedHunterIds[0])
      : null;

    if (unresolvedHunter) {
      updateGame(g => {
        const rounds = [...g.rounds];
        rounds[rounds.length - 1] = {
          ...rounds[rounds.length - 1],
          vote: { tally: {}, eliminated: eliminatedId },
          ...(shotTargets.length > 0 ? {
            hunterShotTarget: shotTargets[0],
            hunterShotTargets: hunterResolution.shots,
          } : {}),
        };
        return {
          ...g,
          players: newPlayers,
          rounds
        };
      });
      setHunterPendingDeath({ hunter: unresolvedHunter, from: 'vote' });
      setSelectedVoteTarget(null);
      return;
    }

    updateGame(g => {
      const rounds = [...g.rounds];
      rounds[rounds.length - 1] = {
        ...rounds[rounds.length - 1],
        vote: { tally: {}, eliminated: eliminatedId },
        ...(shotTargets.length > 0 ? {
          hunterShotTarget: shotTargets[0],
          hunterShotTargets: hunterResolution.shots,
        } : {}),
      };

      const winner = checkWinner(newPlayers);

      if (!winner) {
        rounds.push({ number: rounds.length + 1, nightDeaths: [] });
      }

      return {
        ...g,
        players: newPlayers,
        rounds,
        phase: winner ? 'ended' : 'night',
        winner
      };
    });
    setSelectedVoteTarget(null);
  };



  return (
    <div className="screen-container" style={{ gap: 'var(--s-4)' }}>
      {/* THANH ĐIỀU KHIỂN TRÊN CÙNG */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          variant="ghost"
          onClick={handleExit}
          disabled={isExiting}
          style={{ minHeight: '40px', padding: '0 var(--s-2)', fontSize: '13px', color: 'var(--red-300)' }}
        >
          {isExiting ? 'Đang thoát...' : '✕ Thoát'}
        </Button>
        <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
          {canUndo && (
            <Button
              variant="secondary"
              onClick={undo}
              style={{ minHeight: '40px', padding: '0 var(--s-3)', fontSize: '13px' }}
            >
              ↩ Hoàn tác
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => setShowRoles(!showRoles)}
            style={{ minHeight: '40px', padding: '0 var(--s-3)', fontSize: '13px' }}
          >
            {showRoles ? 'Ẩn Role' : 'Hiện Role'}
          </Button>
        </div>
      </div>

      {game.roomId && roomSyncState !== 'synced' && (
        <Toast
          variant="info"
          message={roomSyncState === 'offline'
            ? '📶 Mạng yếu — thao tác của Quản trò đã lưu trên máy và sẽ tự gửi lại.'
            : '↻ Đang đồng bộ thao tác của Quản trò tới người chơi…'}
        />
      )}

      {/* THANH TIẾN TRÌNH ROUND & GIAI ĐOẠN TRỰC QUAN */}
      <div style={{
        background: 'linear-gradient(180deg, var(--bg-2) 0%, var(--bg-1) 100%)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--gold-700)',
        padding: 'var(--s-3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s-3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-title)',
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--gold-100)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>⏳</span>
            <span>VÒNG {currentRound?.number || 1}</span>
          </div>
          <Badge variant={game.phase === 'ended' ? 'green' : (game.phase === 'vote' ? 'red' : 'gold')}>
            {game.phase === 'night' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                🌙 Đêm:{' '}
                {currentNightRoleItem && (
                  <>
                    <img
                      src={currentNightRoleItem.iconUrl}
                      alt=""
                      style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                    />
                    {currentNightRoleItem.label}
                  </>
                )}
                {nightStep === 'done' && '✨ Chờ Bình Minh'}
              </span>
            )}
            {game.phase === 'day' && '☀️ Ban Ngày'}
            {game.phase === 'vote' && '⚖️ Bỏ Phiếu Treo Cổ'}
            {game.phase === 'ended' && '🏁 Trận Đấu Kết Thúc'}
          </Badge>
        </div>

        {/* Stepper cố định theo cấu hình đầu ván để không làm lộ role đã chết */}
        {game.phase === 'night' ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            margin: '4px 0'
          }}>
            <div style={{
              position: 'absolute',
              top: '14px',
              left: '20px',
              right: '20px',
              height: '3px',
              background: 'rgba(255, 255, 255, 0.1)',
              zIndex: 1
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, var(--gold-500), var(--gold-300))',
                width: `${nightProgressPercent}%`,
                transition: 'width 0.4s ease',
                boxShadow: '0 0 8px rgba(232, 199, 102, 0.5)'
              }} />
            </div>

            {configuredNightRoleSteps.map((stepId, idx) => {
              const step = NIGHT_ROLE_PROGRESS_ITEMS[stepId];
              const isPassed = idx < nightStepIndex || nightStep === 'done';
              const isActive = idx === nightStepIndex && nightStep !== 'done';

              return (
                <div key={stepId} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  position: 'relative',
                  zIndex: 2,
                  flex: 1
                }}>
                  <div style={{
                    position: 'relative',
                    zIndex: 3,
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    background: isActive ? 'linear-gradient(135deg, var(--gold-300), var(--gold-500))' : (isPassed ? 'var(--bg-3)' : 'var(--bg-1)'),
                    border: `2px solid ${isActive ? '#fff' : (isPassed ? 'var(--gold-500)' : 'var(--ash)')}`,
                    color: isActive ? 'var(--bg-0)' : (isPassed ? 'var(--gold-300)' : 'var(--ash)'),
                    boxShadow: isActive ? '0 0 16px var(--gold-300), 0 0 24px rgba(232, 199, 102, 0.6)' : 'none',
                    transform: isActive ? 'scale(1.22)' : 'scale(1)',
                    transition: 'all 0.3s ease',
                    fontWeight: 'bold',
                    padding: '2px'
                  }}>
                    {isPassed ? (
                      '✓'
                    ) : (
                      <img 
                        src={step.iconUrl} 
                        alt={step.label} 
                        style={{ width: '22px', height: '22px', objectFit: 'contain' }} 
                      />
                    )}
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#fff' : 'var(--text-dim)',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    textShadow: isActive ? '0 0 8px rgba(232, 199, 102, 0.8)' : 'none'
                  }}>
                    {step.label}
                    {isActive && ' (Đang gọi)'}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            margin: '4px 0'
          }}>
            <div style={{
              position: 'absolute',
              top: '14px',
              left: '20px',
              right: '20px',
              height: '3px',
              background: 'rgba(255, 255, 255, 0.1)',
              zIndex: 1
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, var(--gold-500), var(--gold-300))',
                width: `${(Math.max(0, ['night', 'day', 'vote', 'ended'].indexOf(game.phase)) / 3) * 100}%`,
                transition: 'width 0.4s ease',
                boxShadow: '0 0 8px rgba(232, 199, 102, 0.5)'
              }} />
            </div>

            {[
              { id: 'night', label: 'Ban Đêm', iconUrl: PHASE_MEDALLION_ICONS.night },
              { id: 'day', label: 'Ban Ngày', iconUrl: PHASE_MEDALLION_ICONS.day },
              { id: 'vote', label: 'Bỏ Phiếu', iconUrl: PHASE_MEDALLION_ICONS.vote },
              { id: 'ended', label: 'Kết Quả', iconUrl: PHASE_MEDALLION_ICONS.ended }
            ].map((step, idx) => {
              const currentIdx = ['night', 'day', 'vote', 'ended'].indexOf(game.phase);
              const isPassed = idx < currentIdx;
              const isActive = idx === currentIdx;

              return (
                <div key={step.id} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  position: 'relative',
                  zIndex: 2,
                  flex: 1
                }}>
                  <div style={{
                    position: 'relative',
                    zIndex: 3,
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    background: isActive ? 'var(--gold-500)' : (isPassed ? 'var(--bg-3)' : 'var(--bg-1)'),
                    border: `2px solid ${isActive ? 'var(--gold-100)' : (isPassed ? 'var(--gold-500)' : 'var(--ash)')}`,
                    color: isActive ? 'var(--bg-0)' : (isPassed ? 'var(--gold-300)' : 'var(--ash)'),
                    boxShadow: isActive ? '0 0 12px var(--gold-300)' : 'none',
                    transform: isActive ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.3s ease',
                    fontWeight: 'bold',
                    padding: '2px'
                  }}>
                    {isPassed ? (
                      '✓'
                    ) : (
                      <img 
                        src={step.iconUrl} 
                        alt={step.label} 
                        style={{ width: '20px', height: '20px', objectFit: 'contain' }} 
                      />
                    )}
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--gold-100)' : 'var(--text-dim)',
                    textAlign: 'center',
                    whiteSpace: 'nowrap'
                  }}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PHASE BANNER THEO THỜI GIAN THỰC */}
      <PhaseBanner
        phase={game.phase === 'night' ? 'night' : (game.phase === 'day' ? 'day' : 'vote')}
        title={game.phase === 'ended' ? 'KẾT THÚC VÁN ĐẤU' : (game.phase === 'night' ? `BAN ĐÊM - VÒNG ${currentRound?.number || 1}` : `BAN NGÀY - VÒNG ${currentRound?.number || 1}`)}
        subtitle={game.phase === 'night' ? 'Dân làng ngủ say, các thế lực thức giấc...' : 'Dân làng thảo luận và tìm kiếm kẻ giả mạo'}
      />

      {/* THỢ SĂN BẮN KHI BỊ CHẾT */}
      {hunterPendingDeath && (
        <Panel variant="danger">
          <h3 style={{ color: 'var(--gold-100)', fontFamily: 'var(--font-title)', margin: '0 0 var(--s-2) 0' }}>
            🏹 THỢ SĂN BỊ LOẠI!
          </h3>
          <p style={{ fontSize: '14px', margin: '0 0 var(--s-3) 0', color: 'var(--text)' }}>
            <strong>{hunterPendingDeath.hunter.name}</strong> đã bị loại! Thợ săn được phép nổ phát súng cuối cùng kéo theo 1 người:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-2)' }}>
            {alivePlayers.filter(p => p.id !== hunterPendingDeath.hunter.id).map(p => {
              const isSelected = selectedHunterTarget === p.id;
              return (
                <PlayerTile
                  key={p.id}
                  name={p.name}
                  avatarUrl={p.avatar}
                  role={showRoles ? getRoleLabel(p.role) : undefined}
                  badgeLabel={isSelected ? '🎯 Mục tiêu bắn' : undefined}
                  badgeVariant="red"
                  isSelected={isSelected}
                  onClick={() => setSelectedHunterTarget(prev => prev === p.id ? null : p.id)}
                />
              );
            })}
          </div>

          <div style={{ marginTop: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
            {selectedHunterTarget ? (
              <Button
                variant="danger"
                pulse
                fullWidth
                onClick={() => handleHunterShoot(selectedHunterTarget)}
              >
                ✓ Xác Nhận Bắn: {game.players.find(p => p.id === selectedHunterTarget)?.name}
              </Button>
            ) : (
              <Button
                variant="secondary"
                fullWidth
                onClick={() => handleHunterShoot(null)}
              >
                Thợ săn không bắn ai / Bỏ qua
              </Button>
            )}
          </div>
        </Panel>
      )}

      {/* KHI TRÒ CHƠI KẾT THÚC */}
      {game.phase === 'ended' ? (
        <Panel style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
          <h1 style={{ fontFamily: 'var(--font-title)', color: 'var(--gold-100)', margin: 0, fontSize: '26px' }}>
            CHIẾN THẮNG!
          </h1>
          <div style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: game.winner === 'wolf' ? 'var(--red-300)' : 'var(--gold-300)'
          }}>
            PHE {game.winner === 'wolf' ? 'MA SÓI 🐺' : 'DÂN LÀNG 👨'} THẮNG
          </div>
          <p style={{ color: 'var(--text-dim)', fontSize: '14px', margin: 0 }}>
            Ván đấu đã khép lại. Lưu kết quả để cập nhật bảng xếp hạng của những người thuộc phe thắng.
          </p>
          {game.roomId && (
            <Button
              variant="primary"
              pulse
              fullWidth
              disabled={isSavingGame || isStartingRematch}
              onClick={handleRematch}
              style={{ marginTop: 'var(--s-2)' }}
            >
              {isStartingRematch ? 'ĐANG CHIA LẠI VAI...' : '🔄 CHƠI LẠI CÙNG PHÒNG'}
            </Button>
          )}
          <Button
            variant={game.roomId ? 'secondary' : 'primary'}
            pulse={!game.roomId}
            fullWidth
            disabled={isSavingGame || isStartingRematch}
            onClick={handleEndGame}
          >
            {isSavingGame ? 'ĐANG LƯU KẾT QUẢ...' : 'LƯU VÁN & XEM BẢNG XẾP HẠNG'}
          </Button>
        </Panel>
      ) : (
        <>
          {/* BAN ĐÊM */}
          {game.phase === 'night' && !hunterPendingDeath && (
            <NightPhaseController
              game={game}
              alivePlayers={alivePlayers}
              currentRound={currentRound}
              nightStep={nightStep}
              showRoles={showRoles}
              getRoleLabel={getRoleLabel}
              onGuardProtect={handleGuardProtect}
              onWolfTargets={handleWolfTargets}
              onSeerCheck={handleSeerCheck}
              onWitchAction={handleWitchAction}
              onHunterTarget={handleHunterTarget}
              onSkipDeadRole={handleSkipDeadRole}
              onFinishNight={finishNight}
            />
          )}

          {/* BAN NGÀY */}
          {game.phase === 'day' && !hunterPendingDeath && (
            <Panel>
              <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--gold-100)', margin: '0 0 var(--s-2) 0' }}>
                ☀️ KẾT QUẢ ĐÊM QUA
              </h3>
              {currentRound.nightDeaths.length === 0 ? (
                <Toast variant="success" message="Đêm qua bình yên, không ai chết!" style={{ marginBottom: 'var(--s-3)' }} />
              ) : (
                <Toast
                  variant="danger"
                  message={`Nạn nhân bị sát hại: ${currentRound.nightDeaths.map(id => game.players.find(p => p.id === id)?.name).join(', ')}`}
                  style={{ marginBottom: 'var(--s-3)' }}
                />
              )}
              {currentHunterShotTargetIds.length > 0 && (
                <Toast
                  variant="info"
                  message={`🏹 Thợ săn đã kéo theo: ${currentHunterShotTargetIds.map(id => game.players.find(p => p.id === id)?.name).filter(Boolean).join(', ')}`}
                  style={{ marginBottom: 'var(--s-3)' }}
                />
              )}

              <DiscussionTimer gameId={game.id} roundNumber={currentRound.number} />
              
              <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--gold-300)', marginTop: 'var(--s-4)', marginBottom: 'var(--s-2)' }}>
                ⚖️ BỎ PHIẾU LOẠI (TREO CỔ)
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: '0 0 var(--s-3) 0' }}>
                Chọn 1 người bị cả làng nghi ngờ để đưa lên giàn treo:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-2)' }}>
                {alivePlayers.map(p => {
                  const isSelected = selectedVoteTarget === p.id;

                  return (
                    <PlayerTile
                      key={p.id}
                      name={p.name}
                      avatarUrl={p.avatar}
                      role={showRoles ? getRoleLabel(p.role) : undefined}
                      badgeLabel={isSelected ? '⚖️ Sẽ treo cổ' : undefined}
                      badgeVariant="red"
                      isSelected={isSelected}
                      onClick={() => setSelectedVoteTarget(prev => prev === p.id ? null : p.id)}
                    />
                  );
                })}
              </div>

              <div style={{ marginTop: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
                {selectedVoteTarget ? (
                  <Button 
                    variant="danger" 
                    pulse
                    fullWidth
                    onClick={() => handleVote(selectedVoteTarget)}
                  >
                    ✓ Xác Nhận Treo Cổ: {game.players.find(p => p.id === selectedVoteTarget)?.name}
                  </Button>
                ) : (
                  <Button 
                    variant="secondary" 
                    fullWidth
                    onClick={() => handleVote(null)}
                  >
                    Hòa / Không Ai Bị Loại
                  </Button>
                )}

                {selectedVoteTarget && (
                  <Button 
                    variant="ghost" 
                    fullWidth
                    onClick={() => setSelectedVoteTarget(null)}
                  >
                    Bỏ chọn người này
                  </Button>
                )}
              </div>
            </Panel>
          )}
        </>
      )}

    </div>
  );
}
