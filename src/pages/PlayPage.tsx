import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { resolveNight } from '../game/night';
import { checkWinner, isWolfTeam } from '../game/win';
import type { Role, Player } from '../game/types';
import { closeRoom } from '../services/roomService';
import { saveGame } from '../services/gameRepository';
import {
  Button,
  Panel,
  Badge,
  PhaseBanner,
  PlayerTile,
  Modal,
  Toast
} from '../components/ui';

export default function PlayPage() {
  const navigate = useNavigate();
  const { game, updateGame, undo, canUndo, setGame } = useGame();
  const [showRoles, setShowRoles] = useState(true);

  // States hỗ trợ chọn trước khi xác nhận
  const [selectedGuardTarget, setSelectedGuardTarget] = useState<string | null>(null);
  const [selectedWolfTargets, setSelectedWolfTargets] = useState<string[]>([]);
  const [selectedSeerTarget, setSelectedSeerTarget] = useState<string | null>(null);
  const [seerResultModal, setSeerResultModal] = useState<{ targetId: string; name: string; isWolf: boolean } | null>(null);
  const [witchSaveSelection, setWitchSaveSelection] = useState<string | null>(null);
  const [witchPoisonSelection, setWitchPoisonSelection] = useState<string | null>(null);
  const [selectedVoteTarget, setSelectedVoteTarget] = useState<string | null>(null);
  const [selectedHunterTarget, setSelectedHunterTarget] = useState<string | null>(null);
  const [hunterPendingDeath, setHunterPendingDeath] = useState<{ hunter: Player; from: 'night' | 'vote' } | null>(null);
  const [wolfSelectionWarning, setWolfSelectionWarning] = useState<string | null>(null);

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

  const handleExit = async () => {
    if (window.confirm("Bạn muốn thoát ván này? Dữ liệu sẽ KHÔNG được lưu vào lịch sử.")) {
      if (game.roomId) {
        try {
          await closeRoom(game.roomId);
        } catch (e) {
          console.error("Lỗi khi đóng phòng online:", e);
        }
      }
      setGame(null);
      navigate('/setup');
    }
  };

  const handleEndGame = () => {
    if (window.confirm("Bạn có chắc chắn muốn kết thúc và lưu ván này không?")) {
      if (game.roomId) {
        closeRoom(game.roomId).catch(console.error);
      }
      saveGame(game).finally(() => {
        setGame(null);
        navigate('/history');
      });
    }
  };

  const hasRole = (role: Role) => alivePlayers.some(p => p.role === role);

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

  const getNightStep = () => {
    if (!currentRound) return 'wait';
    if (currentRound.guardProtectTarget === undefined) return 'guard';
    if (currentRound.wolfTargets === undefined && currentRound.wolfTarget === undefined) return 'wolf';
    if (currentRound.seerCheck === undefined) return 'seer';
    if (currentRound.witchSaved === undefined && currentRound.witchSavedTarget === undefined) return 'witch';
    return 'done';
  };

  const nightStep = getNightStep();

  const handleGuardProtect = (targetId: string | null) => {
    updateGame(g => {
      const rounds = [...g.rounds];
      rounds[rounds.length - 1] = { ...rounds[rounds.length - 1], guardProtectTarget: targetId || 'none' };
      return { ...g, rounds };
    });
    setSelectedGuardTarget(null);
  };

  const handleWolfTargets = (targetIds: string[]) => {
    updateGame(g => {
      const rounds = [...g.rounds];
      rounds[rounds.length - 1] = { 
        ...rounds[rounds.length - 1], 
        wolfTarget: targetIds[0] || 'none',
        wolfTargets: targetIds.length > 0 ? targetIds : ['none']
      };
      return { ...g, rounds };
    });
    setSelectedWolfTargets([]);
  };

  const handleSeerCheck = (targetId: string | null) => {
    updateGame(g => {
      const rounds = [...g.rounds];
      const target = targetId ? g.players.find(p => p.id === targetId) : null;
      rounds[rounds.length - 1] = { 
        ...rounds[rounds.length - 1], 
        seerCheck: targetId ? { target: targetId, isWolf: target ? isWolfTeam(target.role) : false } : { target: 'none', isWolf: false }
      };
      return { ...g, rounds };
    });
    setSelectedSeerTarget(null);
    setSeerResultModal(null);
  };

  const handleWitchAction = (saveTargetId: string | null, poisonTargetId: string | null) => {
    updateGame(g => {
      const rounds = [...g.rounds];
      rounds[rounds.length - 1] = { 
        ...rounds[rounds.length - 1], 
        witchSaved: !!saveTargetId,
        witchSavedTarget: saveTargetId || undefined,
        witchPoisonTarget: poisonTargetId || undefined
      };
      
      const newItems = { ...g.witchItems };
      if (saveTargetId) newItems.saveLeft = Math.max(0, newItems.saveLeft - 1);
      if (poisonTargetId) newItems.poisonLeft = Math.max(0, newItems.poisonLeft - 1);

      return { ...g, rounds, witchItems: newItems };
    });
    setWitchSaveSelection(null);
    setWitchPoisonSelection(null);
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
          hunterShotTarget: targetId
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
    const deaths = resolveNight(lastRound);
    
    const newPlayers = game.players.map(p => 
      deaths.includes(p.id) ? { ...p, alive: false } : p
    );

    const deadHunterId = deaths.find(id => game.players.find(p => p.id === id)?.role === 'hunter');
    const deadHunter = deadHunterId ? game.players.find(p => p.id === deadHunterId) : null;

    if (deadHunter) {
      updateGame(g => {
        const rounds = [...g.rounds];
        rounds[rounds.length - 1] = { ...lastRound, nightDeaths: deaths };
        return {
          ...g,
          players: newPlayers,
          rounds
        };
      });
      setHunterPendingDeath({ hunter: deadHunter, from: 'night' });
      return;
    }

    updateGame(g => {
      const rounds = [...g.rounds];
      rounds[rounds.length - 1] = { ...lastRound, nightDeaths: deaths };

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

    const eliminatedPlayer = game.players.find(p => p.id === eliminatedId);
    const newPlayers = game.players.map(p => 
      p.id === eliminatedId ? { ...p, alive: false } : p
    );

    if (eliminatedPlayer?.role === 'hunter') {
      updateGame(g => {
        const rounds = [...g.rounds];
        rounds[rounds.length - 1] = {
          ...rounds[rounds.length - 1],
          vote: { tally: {}, eliminated: eliminatedId }
        };
        return {
          ...g,
          players: newPlayers,
          rounds
        };
      });
      setHunterPendingDeath({ hunter: eliminatedPlayer, from: 'vote' });
      setSelectedVoteTarget(null);
      return;
    }

    updateGame(g => {
      const rounds = [...g.rounds];
      rounds[rounds.length - 1] = {
        ...rounds[rounds.length - 1],
        vote: { tally: {}, eliminated: eliminatedId }
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

  // =========================================================================
  // GIAO DIỆN BAN ĐÊM (CÁC BƯỚC HÀNH ĐỘNG CỦA CÁC VAI TRÒ)
  // =========================================================================
  const renderNightPhase = () => {
    // 1. LƯỢT BẢO VỆ
    if (nightStep === 'guard') {
      const previousTarget = game.rounds.length > 1 ? game.rounds[game.rounds.length - 2].guardProtectTarget : null;
      const selectedPlayer = selectedGuardTarget ? game.players.find(p => p.id === selectedGuardTarget) : null;

      const toggleGuardSelect = (id: string) => {
        setSelectedGuardTarget(prev => prev === id ? null : id);
      };

      return (
        <Panel>
          <h3 style={{
            color: 'var(--green-400)',
            fontFamily: 'var(--font-title)',
            margin: '0 0 var(--s-2) 0',
            fontSize: '18px'
          }}>
            🛡 BẢO VỆ muốn bảo vệ ai?
          </h3>
          {!hasRole('guard') && (
            <Toast variant="info" message="Bảo vệ đã chết hoặc không có trong ván, bấm Bỏ qua để giữ nhịp trò chơi." style={{ marginBottom: 'var(--s-3)' }} />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-2)' }}>
            {alivePlayers.map(p => {
              const isLocked = p.id === previousTarget && p.id !== 'none';
              const isSelected = selectedGuardTarget === p.id;

              return (
                <PlayerTile
                  key={p.id}
                  name={p.name}
                  avatarUrl={p.avatar}
                  role={showRoles ? getRoleLabel(p.role) : undefined}
                  badgeLabel={isSelected ? '🛡 Sẽ bảo vệ' : (isLocked ? 'Vòng trước' : undefined)}
                  badgeVariant={isSelected ? 'green' : 'ash'}
                  isSelected={isSelected}
                  isAlive={!isLocked}
                  onClick={() => !isLocked && toggleGuardSelect(p.id)}
                />
              );
            })}
          </div>

          <div style={{ marginTop: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
            {selectedGuardTarget ? (
              <Button
                variant="primary"
                pulse
                fullWidth
                onClick={() => handleGuardProtect(selectedGuardTarget)}
              >
                ✓ Xác Nhận Bảo Vệ: {selectedPlayer?.name}
              </Button>
            ) : (
              <Button
                variant="secondary"
                fullWidth
                onClick={() => handleGuardProtect(null)}
              >
                Không bảo vệ ai (Bỏ qua)
              </Button>
            )}

            {selectedGuardTarget && (
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setSelectedGuardTarget(null)}
              >
                Bỏ chọn người này
              </Button>
            )}
          </div>
        </Panel>
      );
    }

    // 2. LƯỢT SÓI
    if (nightStep === 'wolf') {
      const aliveWolves = alivePlayers.filter(p => isWolfTeam(p.role));
      const hasDemonWolf = aliveWolves.some(p => p.role === 'wolf_demon');
      const maxTargets = hasDemonWolf ? 2 : 1;
      const isWolfAlive = aliveWolves.length > 0;
      const wolfVotesMap = currentRound?.wolfVotes || {};

      // Kiểm tra đồng thuận giữa các sói thường khi có từ 2 sói trở lên
      const allWolvesVoted = aliveWolves.length > 1 && aliveWolves.every(w => (wolfVotesMap[w.id]?.length || 0) > 0);
      const votedTargetIds = aliveWolves.map(w => wolfVotesMap[w.id]?.[0]).filter(Boolean);
      const isWolfConsensus = allWolvesVoted && votedTargetIds.length === aliveWolves.length && new Set(votedTargetIds).size === 1;
      const hasDisagreement = allWolvesVoted && !isWolfConsensus;

      const toggleWolfTarget = (id: string) => {
        setWolfSelectionWarning(null);
        if (selectedWolfTargets.includes(id)) {
          setSelectedWolfTargets(prev => prev.filter(x => x !== id));
        } else {
          if (hasDemonWolf) {
            if (selectedWolfTargets.length >= 2) {
              setWolfSelectionWarning("⚠️ Có Sói Quỷ chỉ được chọn tối đa 2 người! Bạn đã chọn đủ 2 người rồi, hãy bấm bỏ chọn 1 người trước nếu muốn đổi mục tiêu.");
              return;
            }
            setSelectedWolfTargets(prev => [...prev, id]);
          } else {
            setSelectedWolfTargets([id]);
          }
        }
      };

      const selectedNames = selectedWolfTargets.map(id => game.players.find(p => p.id === id)?.name).filter(Boolean);

      return (
        <Panel variant="danger">
          <h3 style={{
            color: 'var(--red-300)',
            fontFamily: 'var(--font-title)',
            margin: '0 0 var(--s-2) 0',
            fontSize: '18px'
          }}>
            🐺 BẦY SÓI muốn cắn ai?
          </h3>
          {hasDemonWolf && (
            <Toast
              variant="danger"
              message={`😈 SÓI QUỶ còn sống! Bầy sói được cắn tối đa 2 người (Đã chọn ${selectedWolfTargets.length}/2)`}
              style={{ marginBottom: 'var(--s-3)' }}
            />
          )}
          {wolfSelectionWarning && (
            <Toast
              variant="danger"
              message={wolfSelectionWarning}
              style={{ marginBottom: 'var(--s-3)' }}
            />
          )}
          {!hasDemonWolf && aliveWolves.length > 1 && hasDisagreement && (
            <Toast
              variant="danger"
              message={`⚠️ 2 Sói đang chọn khác người! Bắt buộc tất cả sói thường phải thống nhất chọn CÙNG 1 NGƯỜI mới cắn được!`}
              style={{ marginBottom: 'var(--s-3)' }}
            />
          )}
          {!hasDemonWolf && aliveWolves.length > 1 && isWolfConsensus && (
            <Toast
              variant="success"
              message={`🎉 Cả bầy sói đã ĐỒNG THUẬN chọn cắn: ${game.players.find(p => p.id === votedTargetIds[0])?.name}!`}
              style={{ marginBottom: 'var(--s-3)' }}
            />
          )}
          {!isWolfAlive && (
            <Toast variant="info" message="Không còn sói sống trong bầy, có thể bỏ qua." style={{ marginBottom: 'var(--s-3)' }} />
          )}

          {/* HIỂN THỊ Ý KIẾN TỪNG SÓI NẾU CÓ NHIỀU SÓI VÀ CHƠI ONLINE */}
          {aliveWolves.length > 1 && !hasDemonWolf && (
            <div style={{
              background: 'rgba(11, 16, 38, 0.7)',
              border: '1px solid rgba(229, 57, 53, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              marginBottom: 'var(--s-3)',
              fontSize: '12px'
            }}>
              <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Ý KIẾN CÁC SÓI TRONG BẦY:</span>
              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {aliveWolves.map(w => {
                  const targetId = wolfVotesMap[w.id]?.[0];
                  const targetPlayer = targetId ? game.players.find(p => p.id === targetId) : null;
                  return (
                    <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>🐺 {w.name}:</span>
                      <strong style={{ color: targetPlayer ? 'var(--red-300)' : 'var(--text-dim)' }}>
                        {targetPlayer ? `👉 ${targetPlayer.name}` : '⏳ Chưa vote'}
                      </strong>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-2)' }}>
            {alivePlayers.map(p => {
              const targetIndex = selectedWolfTargets.indexOf(p.id);
              const isTarget = targetIndex !== -1;
              const isWolf = isWolfTeam(p.role);

              return (
                <PlayerTile
                  key={p.id}
                  name={p.name}
                  avatarUrl={p.avatar}
                  role={showRoles ? getRoleLabel(p.role) : undefined}
                  badgeLabel={isTarget ? `🎯 Cắn ${maxTargets > 1 ? `#${targetIndex + 1}` : ''}` : (isWolf ? 'Phe Sói' : undefined)}
                  badgeVariant={isTarget ? 'red' : 'ash'}
                  isSelected={isTarget}
                  onClick={() => toggleWolfTarget(p.id)}
                />
              );
            })}
          </div>

          <div style={{ marginTop: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
            {selectedWolfTargets.length > 0 ? (
              <Button
                variant="danger"
                pulse
                fullWidth
                disabled={!hasDemonWolf && aliveWolves.length > 1 && hasDisagreement}
                onClick={() => handleWolfTargets(selectedWolfTargets)}
              >
                {!hasDemonWolf && aliveWolves.length > 1 && hasDisagreement
                  ? '🔒 Cần cả 2 sói chọn cùng 1 người'
                  : `✓ Xác Nhận Cắn: ${selectedNames.join(', ')}`}
              </Button>
            ) : (
              <Button
                variant="secondary"
                fullWidth
                onClick={() => handleWolfTargets([])}
              >
                Sói không cắn ai (Bỏ qua)
              </Button>
            )}

            {selectedWolfTargets.length > 0 && (
              <Button
                variant="ghost"
                fullWidth
                onClick={() => {
                  setSelectedWolfTargets([]);
                  setWolfSelectionWarning(null);
                }}
              >
                Bỏ qua (Không cắn ai)
              </Button>
            )}
          </div>
        </Panel>
      );
    }
    
    // 3. LƯỢT TIÊN TRI
    if (nightStep === 'seer') {
      const selectedPlayer = selectedSeerTarget ? game.players.find(p => p.id === selectedSeerTarget) : null;

      const toggleSeerSelect = (id: string) => {
        setSelectedSeerTarget(prev => prev === id ? null : id);
        setSeerResultModal(null);
      };

      return (
        <Panel>
          <h3 style={{
            color: 'var(--gold-100)',
            fontFamily: 'var(--font-title)',
            margin: '0 0 var(--s-2) 0',
            fontSize: '18px'
          }}>
            👁 TIÊN TRI muốn soi ai?
          </h3>
          {!hasRole('seer') && (
            <Toast variant="info" message="Tiên tri đã chết hoặc không có, bấm Bỏ qua để giữ nhịp trò chơi." style={{ marginBottom: 'var(--s-3)' }} />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-2)' }}>
            {alivePlayers.map(p => {
              const isSelected = selectedSeerTarget === p.id;

              return (
                <PlayerTile
                  key={p.id}
                  name={p.name}
                  avatarUrl={p.avatar}
                  role={showRoles ? getRoleLabel(p.role) : undefined}
                  badgeLabel={isSelected ? '👁 Sẽ soi' : undefined}
                  badgeVariant="gold"
                  isSelected={isSelected}
                  onClick={() => toggleSeerSelect(p.id)}
                />
              );
            })}
          </div>

          <div style={{ marginTop: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
            {selectedSeerTarget ? (
              <Button
                variant="primary"
                pulse
                fullWidth
                onClick={() => {
                  if (selectedPlayer) {
                    setSeerResultModal({
                      targetId: selectedPlayer.id,
                      name: selectedPlayer.name,
                      isWolf: isWolfTeam(selectedPlayer.role)
                    });
                  }
                }}
              >
                ✓ Xem Kết Quả Soi: {selectedPlayer?.name}
              </Button>
            ) : (
              <Button
                variant="secondary"
                fullWidth
                onClick={() => handleSeerCheck(null)}
              >
                Bỏ qua (Không soi ai)
              </Button>
            )}

            {selectedSeerTarget && (
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setSelectedSeerTarget(null)}
              >
                Bỏ chọn
              </Button>
            )}
          </div>
        </Panel>
      );
    }

    // 4. LƯỢT PHÙ THỦY
    if (nightStep === 'witch') {
      const wolfTargetsList = currentRound.wolfTargets 
        ? currentRound.wolfTargets.filter(id => id && id !== 'none') 
        : (currentRound.wolfTarget && currentRound.wolfTarget !== 'none' ? [currentRound.wolfTarget] : []);
      
      const isProtected = (id: string) => currentRound.guardProtectTarget === id;
      const dyingVictimIds = wolfTargetsList.filter(id => !isProtected(id));
      const dyingVictims = dyingVictimIds.map(id => game.players.find(p => p.id === id)).filter(Boolean) as Player[];

      const canSave = game.witchItems.saveLeft > 0 && dyingVictims.length > 0;
      const canPoison = game.witchItems.poisonLeft > 0;

      const poisonPlayer = witchPoisonSelection ? game.players.find(p => p.id === witchPoisonSelection) : null;
      const savePlayer = witchSaveSelection ? game.players.find(p => p.id === witchSaveSelection) : null;

      return (
        <Panel>
          <h3 style={{
            color: 'var(--gold-100)',
            fontFamily: 'var(--font-title)',
            margin: '0 0 var(--s-2) 0',
            fontSize: '18px'
          }}>
            🧪 PHÙ THỦY muốn làm gì?
          </h3>
          {!hasRole('witch') && (
            <Toast variant="info" message="Phù thủy đã chết hoặc không có, bấm Bỏ qua để giữ nhịp." style={{ marginBottom: 'var(--s-3)' }} />
          )}
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            margin: 'var(--s-3) 0',
            padding: 'var(--s-2)',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 'var(--radius-md)'
          }}>
            <span style={{ fontSize: '13px' }}>💉 Bình cứu: <strong style={{ color: 'var(--green-400)' }}>{game.witchItems.saveLeft}</strong></span>
            <span style={{ fontSize: '13px' }}>☠️ Bình độc: <strong style={{ color: 'var(--red-300)' }}>{game.witchItems.poisonLeft}</strong></span>
          </div>

          {/* Bình cứu */}
          <Panel compact style={{ marginBottom: 'var(--s-3)' }}>
            <h4 style={{ margin: '0 0 var(--s-2) 0', color: 'var(--green-400)', fontSize: '14px' }}>
              💉 BÌNH CỨU (Cứu nạn nhân bị cắn đêm nay)
            </h4>
            {dyingVictims.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>Đêm nay bình yên, không ai sắp chết.</p>
            ) : (
              <div>
                <p style={{ fontSize: '13px', margin: '0 0 var(--s-2) 0' }}>
                  Nạn nhân sắp chết: <strong style={{ color: 'var(--red-300)' }}>{dyingVictims.map(v => v.name).join(', ')}</strong>
                </p>
                {canSave ? (
                  <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
                    {dyingVictims.map(v => (
                      <Button
                        key={v.id}
                        variant={witchSaveSelection === v.id ? 'primary' : 'secondary'}
                        onClick={() => setWitchSaveSelection(witchSaveSelection === v.id ? null : v.id)}
                        style={{ minHeight: '40px', padding: '0 var(--s-3)', fontSize: '12px' }}
                      >
                        {witchSaveSelection === v.id ? `✓ Cứu: ${v.name}` : `Cứu ${v.name}`}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Đã hết bình cứu!</span>
                )}
              </div>
            )}
          </Panel>

          {/* Bình độc */}
          <Panel compact>
            <h4 style={{ margin: '0 0 var(--s-2) 0', color: 'var(--gold-300)', fontSize: '14px' }}>
              ☠️ BÌNH ĐỘC (Có thể đầu độc 1 người bất kỳ)
            </h4>
            {canPoison ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-2)' }}>
                {alivePlayers.map(p => {
                  const isPoisonTarget = witchPoisonSelection === p.id;
                  return (
                    <PlayerTile
                      key={p.id}
                      name={p.name}
                      avatarUrl={p.avatar}
                      role={showRoles ? getRoleLabel(p.role) : undefined}
                      badgeLabel={isPoisonTarget ? '☠️ Đầu độc' : undefined}
                      badgeVariant="red"
                      isSelected={isPoisonTarget}
                      onClick={() => setWitchPoisonSelection(isPoisonTarget ? null : p.id)}
                    />
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: 0 }}>Đã hết bình độc!</p>
            )}
          </Panel>

          {/* Nút xác nhận Phù thủy */}
          <div style={{ marginTop: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
            <Button 
              variant="primary" 
              pulse
              fullWidth
              onClick={() => handleWitchAction(witchSaveSelection, witchPoisonSelection)}
            >
              ✓ Xác Nhận Phù Thủy {savePlayer ? `(Cứu: ${savePlayer.name})` : ''} {poisonPlayer ? `(Độc: ${poisonPlayer.name})` : ''}
            </Button>
            <Button 
              variant="secondary" 
              fullWidth
              onClick={() => handleWitchAction(null, null)}
            >
              Không dùng bình nào (Bỏ qua)
            </Button>
          </div>
        </Panel>
      );
    }

    // 5. KẾT THÚC ĐÊM
    if (nightStep === 'done') {
      return (
        <Panel style={{ textAlign: 'center' }}>
          <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--gold-100)', margin: '0 0 var(--s-2) 0' }}>
            ☀️ Trời Sắp Sáng Rồi
          </h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginBottom: 'var(--s-4)' }}>
            Mọi sinh vật bóng đêm đã hoàn tất hành động. Bấm để công bố kết quả đêm qua.
          </p>
          <Button variant="primary" pulse fullWidth onClick={finishNight}>
            ĐÁNH THỨC MỌI NGƯỜI ➔
          </Button>
        </Panel>
      );
    }
  };

  return (
    <div className="screen-container" style={{ gap: 'var(--s-4)' }}>
      {/* THANH ĐIỀU KHIỂN TRÊN CÙNG */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          variant="ghost"
          onClick={handleExit}
          style={{ minHeight: '40px', padding: '0 var(--s-2)', fontSize: '13px', color: 'var(--red-300)' }}
        >
          ✕ Thoát
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
              <>
                🌙 Đêm:{' '}
                {nightStep === 'guard' && '🛡️ Bảo Vệ'}
                {nightStep === 'wolf' && '🐺 Ma Sói'}
                {nightStep === 'seer' && '🔮 Tiên Tri'}
                {nightStep === 'witch' && '🧪 Phù Thủy'}
                {nightStep === 'done' && '✨ Chờ Bình Minh'}
              </>
            )}
            {game.phase === 'day' && '☀️ Ban Ngày'}
            {game.phase === 'vote' && '⚖️ Bỏ Phiếu Treo Cổ'}
            {game.phase === 'ended' && '🏁 Trận Đấu Kết Thúc'}
          </Badge>
        </div>

        {/* Stepper bar: Nếu ban đêm hiển thị 4 vai trò đêm phát sáng theo lượt */}
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
                width: `${Math.min(100, ((['guard', 'wolf', 'seer', 'witch', 'done'].indexOf(nightStep)) / 3) * 100)}%`,
                transition: 'width 0.4s ease',
                boxShadow: '0 0 8px rgba(232, 199, 102, 0.5)'
              }} />
            </div>

            {[
              { id: 'guard', label: 'Bảo Vệ', icon: '🛡️' },
              { id: 'wolf', label: 'Ma Sói', icon: '🐺' },
              { id: 'seer', label: 'Tiên Tri', icon: '🔮' },
              { id: 'witch', label: 'Phù Thủy', icon: '🧪' }
            ].map((step, idx) => {
              const currentIdx = ['guard', 'wolf', 'seer', 'witch', 'done'].indexOf(nightStep);
              const isPassed = idx < currentIdx;
              const isActive = idx === currentIdx;

              return (
                <div key={step.id} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  zIndex: 2,
                  flex: 1
                }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    background: isActive ? 'linear-gradient(135deg, var(--gold-400), var(--gold-600))' : (isPassed ? 'var(--bg-3)' : 'var(--bg-1)'),
                    border: `2px solid ${isActive ? '#fff' : (isPassed ? 'var(--gold-500)' : 'var(--ash)')}`,
                    color: isActive ? 'var(--bg-0)' : (isPassed ? 'var(--gold-300)' : 'var(--ash)'),
                    boxShadow: isActive ? '0 0 16px var(--gold-300), 0 0 24px rgba(232, 199, 102, 0.6)' : 'none',
                    transform: isActive ? 'scale(1.22)' : 'scale(1)',
                    transition: 'all 0.3s ease',
                    fontWeight: 'bold'
                  }}>
                    {isPassed ? '✓' : step.icon}
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
              { id: 'night', label: 'Ban Đêm', icon: '🌙' },
              { id: 'day', label: 'Ban Ngày', icon: '☀️' },
              { id: 'vote', label: 'Bỏ Phiếu', icon: '⚖️' },
              { id: 'ended', label: 'Kết Quả', icon: '☠️' }
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
                  zIndex: 2,
                  flex: 1
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
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
                    fontWeight: 'bold'
                  }}>
                    {isPassed ? '✓' : step.icon}
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
            Ván đấu đã khép lại. Nhấn bên dưới để lưu dữ liệu vào lịch sử và về trang chủ.
          </p>
          <Button variant="primary" pulse fullWidth onClick={handleEndGame} style={{ marginTop: 'var(--s-2)' }}>
            LƯU VÁN & VỀ TRANG CHỦ
          </Button>
        </Panel>
      ) : (
        <>
          {/* BAN ĐÊM */}
          {game.phase === 'night' && !hunterPendingDeath && renderNightPhase()}

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
              {currentRound.hunterShotTarget && (
                <Toast
                  variant="info"
                  message={`🏹 Thợ săn đã bắn chết: ${game.players.find(p => p.id === currentRound.hunterShotTarget)?.name}`}
                  style={{ marginBottom: 'var(--s-3)' }}
                />
              )}
              
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

      {/* MODAL KẾT QUẢ SOI CỦA TIÊN TRI */}
      <Modal
        isOpen={!!seerResultModal}
        onClose={() => setSeerResultModal(null)}
        title="KẾT QUẢ SOI CHO TIÊN TRI"
        footer={
          seerResultModal ? (
            <Button
              variant="primary"
              pulse
              fullWidth
              onClick={() => handleSeerCheck(seerResultModal.targetId)}
            >
              Xác Nhận & Tiếp Tục ➔
            </Button>
          ) : undefined
        }
      >
        {seerResultModal && (
          <div style={{ textAlign: 'center', padding: 'var(--s-2) 0' }}>
            <p style={{ fontSize: '15px', color: 'var(--text)', margin: '0 0 var(--s-2) 0' }}>
              Người chơi <strong>{seerResultModal.name}</strong>:
            </p>
            <div style={{
              fontSize: '24px',
              fontFamily: 'var(--font-title)',
              fontWeight: 'bold',
              color: seerResultModal.isWolf ? 'var(--red-300)' : 'var(--green-400)',
              letterSpacing: '0.05em',
              margin: 'var(--s-3) 0'
            }}>
              {seerResultModal.isWolf ? '🐺 LÀ SÓI!' : '👨 KHÔNG PHẢI SÓI'}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>
              Chỉ Quản trò và Tiên Tri biết được bí mật này.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
