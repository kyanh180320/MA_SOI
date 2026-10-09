import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { resolveNight } from '../game/night';
import { checkWinner, isWolfTeam } from '../game/win';
import type { Role, Player } from '../game/types';

export default function PlayPage() {
  const navigate = useNavigate();
  const { game, updateGame, undo, canUndo, setGame } = useGame();
  const [showRoles, setShowRoles] = useState(true);

  // States hỗ trợ chọn trước khi xác nhận (tránh bấm nhầm)
  const [selectedGuardTarget, setSelectedGuardTarget] = useState<string | null>(null);
  const [selectedWolfTargets, setSelectedWolfTargets] = useState<string[]>([]);
  const [selectedSeerTarget, setSelectedSeerTarget] = useState<string | null>(null);
  const [seerResultModal, setSeerResultModal] = useState<{ targetId: string; name: string; isWolf: boolean } | null>(null);
  const [witchSaveSelection, setWitchSaveSelection] = useState<string | null>(null);
  const [witchPoisonSelection, setWitchPoisonSelection] = useState<string | null>(null);
  const [selectedVoteTarget, setSelectedVoteTarget] = useState<string | null>(null);
  const [selectedHunterTarget, setSelectedHunterTarget] = useState<string | null>(null);
  const [hunterPendingDeath, setHunterPendingDeath] = useState<{ hunter: Player; from: 'night' | 'vote' } | null>(null);

  if (!game) {
    return (
      <div className="container">
        <h2>Không tìm thấy ván chơi</h2>
        <button className="btn-primary" onClick={() => navigate('/setup')}>Tạo ván mới</button>
      </div>
    );
  }

  const alivePlayers = game.players.filter(p => p.alive);
  const currentRound = game.rounds[game.rounds.length - 1];

  const handleExit = () => {
    if (window.confirm("Bạn muốn thoát ván này? Dữ liệu sẽ KHÔNG được lưu vào lịch sử.")) {
      setGame(null);
      navigate('/setup');
    }
  };

  const handleEndGame = () => {
    if (window.confirm("Bạn có chắc chắn muốn kết thúc và lưu ván này không?")) {
      import('../services/gameRepository').then(({ saveGame }) => {
        saveGame(game).finally(() => {
          setGame(null);
          navigate('/history');
        });
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

  const renderAvatar = (p: Player, fallbackEmoji: string) => (
    <div className="player-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {p.avatar ? <img src={p.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : fallbackEmoji}
    </div>
  );

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

    // Kiểm tra xem có thợ săn chết đêm không
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

    // Nếu thợ săn bị treo cổ, kích hoạt kéo theo 1 người
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

  const renderNightPhase = () => {
    // 1. LƯỢT BẢO VỆ
    if (nightStep === 'guard') {
      const previousTarget = game.rounds.length > 1 ? game.rounds[game.rounds.length - 2].guardProtectTarget : null;
      const selectedPlayer = selectedGuardTarget ? game.players.find(p => p.id === selectedGuardTarget) : null;

      const toggleGuardSelect = (id: string) => {
        setSelectedGuardTarget(prev => prev === id ? null : id);
      };

      return (
        <div className="card">
          <h3 style={{color: '#4CAF50'}}>🛡 BẢO VỆ muốn bảo vệ ai?</h3>
          {!hasRole('guard') && <p className="error">Bảo vệ đã chết hoặc không có, bấm Không bảo vệ ai để giữ nhịp.</p>}
          <div className="player-grid">
            {alivePlayers.map(p => {
              const globalIndex = game.players.findIndex(x => x.id === p.id);
              const isLocked = p.id === previousTarget && p.id !== 'none';
              const isSelected = selectedGuardTarget === p.id;

              return (
                <button 
                  key={p.id} 
                  className={`player-square ${isLocked ? 'dead' : ''}`}
                  style={{
                    borderColor: isSelected ? '#4CAF50' : (isLocked ? 'transparent' : 'rgba(76, 175, 80, 0.4)'),
                    boxShadow: isSelected ? '0 0 10px #4CAF50' : undefined
                  }} 
                  disabled={isLocked}
                  onClick={() => toggleGuardSelect(p.id)}
                >
                  <span className="player-id">P{globalIndex + 1}</span>
                  {renderAvatar(p, '👤')}
                  <div className="player-name">{p.name}</div>
                  {isSelected && (
                    <div style={{fontSize: '11px', color: '#4CAF50', fontWeight: 'bold', marginTop: '2px'}}>
                      🛡 Sẽ bảo vệ
                    </div>
                  )}
                  {showRoles && <div style={{fontSize: '11px', marginTop: '4px', color: '#aaa'}}>{getRoleLabel(p.role)}</div>}
                  {isLocked && <small style={{fontSize:'9px', color: 'var(--text-muted)'}}>(Vòng trước)</small>}
                </button>
              );
            })}
          </div>

          {selectedGuardTarget ? (
            <button 
              className="btn-primary" 
              style={{marginTop: '16px', background: '#4CAF50', width: '100%', fontWeight: 'bold'}} 
              onClick={() => handleGuardProtect(selectedGuardTarget)}
            >
              ✓ Xác nhận bảo vệ: {selectedPlayer?.name}
            </button>
          ) : (
            <button 
              className="btn-primary" 
              style={{background: '#555', marginTop: '16px', width: '100%'}} 
              onClick={() => handleGuardProtect(null)}
            >
              Không bảo vệ ai (Bỏ qua)
            </button>
          )}

          {selectedGuardTarget && (
            <button 
              className="btn-secondary" 
              style={{marginTop: '8px', width: '100%'}} 
              onClick={() => setSelectedGuardTarget(null)}
            >
              Bỏ chọn người này
            </button>
          )}
        </div>
      );
    }

    // 2. LƯỢT SÓI
    if (nightStep === 'wolf') {
      const hasDemonWolf = alivePlayers.some(p => p.role === 'wolf_demon');
      const maxTargets = hasDemonWolf ? 2 : 1;
      const isWolfAlive = alivePlayers.some(p => isWolfTeam(p.role));

      const toggleWolfTarget = (id: string) => {
        if (selectedWolfTargets.includes(id)) {
          setSelectedWolfTargets(prev => prev.filter(x => x !== id));
        } else {
          if (maxTargets === 1) {
            setSelectedWolfTargets([id]);
          } else {
            if (selectedWolfTargets.length < maxTargets) {
              setSelectedWolfTargets(prev => [...prev, id]);
            } else {
              setSelectedWolfTargets(prev => [prev[1], id]);
            }
          }
        }
      };

      const selectedNames = selectedWolfTargets.map(id => game.players.find(p => p.id === id)?.name).filter(Boolean);

      return (
        <div className="card">
          <h3 style={{color: 'var(--error)'}}>🐺 SÓI muốn cắn ai?</h3>
          {hasDemonWolf && (
            <p style={{color: '#FF5252', fontWeight: 'bold', margin: '4px 0 12px 0'}}>
              😈 SÓI QUỶ còn sống! Bầy sói được cắn 2 người (Đã chọn {selectedWolfTargets.length}/{maxTargets})
            </p>
          )}
          {!isWolfAlive && <p className="error">Không còn sói sống, có thể bỏ qua.</p>}
          <div className="player-grid">
            {alivePlayers.map(p => {
              const globalIndex = game.players.findIndex(x => x.id === p.id);
              const targetIndex = selectedWolfTargets.indexOf(p.id);
              const isTarget = targetIndex !== -1;
              const isWolf = isWolfTeam(p.role);

              return (
                <button 
                  key={p.id} 
                  className={`player-square ${isWolf ? 'dead' : ''}`}
                  style={{
                    borderColor: isTarget ? '#FF1744' : (isWolf ? 'transparent' : 'var(--wolf)'),
                    boxShadow: isTarget ? '0 0 10px #FF1744' : undefined
                  }}
                  onClick={() => toggleWolfTarget(p.id)}
                >
                  <span className="player-id">P{globalIndex + 1}</span>
                  {renderAvatar(p, isWolf ? (p.role === 'wolf_demon' ? '😈' : '🐺') : '👤')}
                  <div className="player-name">{p.name}</div>
                  {isTarget && (
                    <div style={{fontSize: '11px', color: '#FF1744', fontWeight: 'bold', marginTop: '2px'}}>
                      🎯 Cắn {maxTargets > 1 ? `#${targetIndex + 1}` : ''}
                    </div>
                  )}
                  {showRoles && <div style={{fontSize: '11px', marginTop: '4px', color: '#aaa'}}>{getRoleLabel(p.role)}</div>}
                </button>
              );
            })}
          </div>

          <button 
            className="btn-primary" 
            style={{
              marginTop: '16px', 
              width: '100%',
              background: selectedWolfTargets.length > 0 ? 'var(--error)' : '#555',
              fontWeight: 'bold'
            }} 
            onClick={() => handleWolfTargets(selectedWolfTargets)}
          >
            {selectedWolfTargets.length > 0 
              ? `✓ Xác nhận cắn: ${selectedNames.join(', ')}` 
              : 'Sói không cắn ai (Bỏ qua)'}
          </button>

          {selectedWolfTargets.length > 0 && (
            <button 
              className="btn-secondary" 
              style={{marginTop: '8px', width: '100%'}} 
              onClick={() => handleWolfTargets([])}
            >
              Bỏ qua (Không cắn ai)
            </button>
          )}
        </div>
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
        <div className="card">
          <h3 style={{color: '#2196F3'}}>👁 TIÊN TRI muốn soi ai?</h3>
          {!hasRole('seer') && <p className="error">Tiên tri đã chết hoặc không có, bấm Bỏ qua để giữ nhịp.</p>}
          <div className="player-grid">
            {alivePlayers.map(p => {
              const globalIndex = game.players.findIndex(x => x.id === p.id);
              const isSelected = selectedSeerTarget === p.id;

              return (
                <button 
                  key={p.id} 
                  className="player-square" 
                  style={{
                    borderColor: isSelected ? '#2196F3' : 'rgba(33, 150, 243, 0.4)',
                    boxShadow: isSelected ? '0 0 10px #2196F3' : undefined
                  }}
                  onClick={() => toggleSeerSelect(p.id)}
                >
                  <span className="player-id">P{globalIndex + 1}</span>
                  {renderAvatar(p, '👤')}
                  <div className="player-name">{p.name}</div>
                  {isSelected && (
                    <div style={{fontSize: '11px', color: '#2196F3', fontWeight: 'bold', marginTop: '2px'}}>
                      👁 Sẽ soi
                    </div>
                  )}
                  {showRoles && <div style={{fontSize: '11px', marginTop: '4px', color: '#aaa'}}>{getRoleLabel(p.role)}</div>}
                </button>
              );
            })}
          </div>

          {/* Hộp xem kết quả soi rõ ràng trước khi bấm tiếp tục */}
          {seerResultModal ? (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              background: 'rgba(33, 150, 243, 0.15)',
              border: '2px solid #2196F3',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <h4 style={{ margin: '0 0 6px 0', color: 'var(--primary)', fontSize: '16px' }}>👁 KẾT QUẢ SOI CHO TIÊN TRI</h4>
              <p style={{ fontSize: '15px', margin: '4px 0' }}>
                Người chơi <strong>{seerResultModal.name}</strong>:
              </p>
              <div style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: seerResultModal.isWolf ? 'var(--error)' : '#4CAF50',
                margin: '8px 0'
              }}>
                {seerResultModal.isWolf ? '🐺 LÀ SÓI!' : '👨 KHÔNG PHẢI SÓI'}
              </div>
              <button
                className="btn-primary"
                style={{ marginTop: '10px', width: '100%', background: '#2196F3', fontWeight: 'bold' }}
                onClick={() => handleSeerCheck(seerResultModal.targetId)}
              >
                Xác nhận & Chuyển sang Phù Thủy ➔
              </button>
            </div>
          ) : (
            <>
              {selectedSeerTarget ? (
                <button 
                  className="btn-primary" 
                  style={{background: '#2196F3', marginTop: '16px', width: '100%', fontWeight: 'bold'}} 
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
                  ✓ Xác nhận soi: {selectedPlayer?.name}
                </button>
              ) : (
                <button 
                  className="btn-primary" 
                  style={{background: '#555', marginTop: '16px', width: '100%'}} 
                  onClick={() => handleSeerCheck(null)}
                >
                  Bỏ qua (Không soi ai)
                </button>
              )}

              {selectedSeerTarget && (
                <button 
                  className="btn-secondary" 
                  style={{marginTop: '8px', width: '100%'}} 
                  onClick={() => setSelectedSeerTarget(null)}
                >
                  Bỏ chọn
                </button>
              )}
            </>
          )}
        </div>
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
        <div className="card">
          <h3 style={{color: 'purple'}}>🧪 PHÙ THỦY muốn làm gì?</h3>
          {!hasRole('witch') && <p className="error">Phù thủy đã chết hoặc không có, bấm Bỏ qua để giữ nhịp.</p>}
          
          <div style={{display: 'flex', justifyContent: 'space-around', margin: '12px 0', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '13px'}}>
            <span>💉 Bình cứu: <strong>{game.witchItems.saveLeft}</strong></span>
            <span>☠️ Bình độc: <strong>{game.witchItems.poisonLeft}</strong></span>
          </div>

          {/* Phần bình cứu */}
          <div style={{marginTop: '12px', padding: '12px', border: '1px solid #443355', borderRadius: '8px'}}>
            <h4 style={{margin: '0 0 8px 0', color: 'var(--success)', textAlign: 'left', fontSize: '14px'}}>
              💉 BÌNH CỨU (Cứu nạn nhân bị cắn)
            </h4>
            {dyingVictims.length === 0 ? (
              <p style={{fontSize: '13px', color: 'var(--text-muted)', margin: 0}}>Đêm nay bình yên, không ai sắp chết.</p>
            ) : (
              <div>
                <p style={{fontSize: '13px', margin: '0 0 8px 0'}}>
                  Sắp chết: <strong style={{color: 'var(--error)'}}>{dyingVictims.map(v => v.name).join(', ')}</strong>
                </p>
                {canSave ? (
                  <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                    {dyingVictims.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        className="btn-primary"
                        style={{
                          width: 'auto',
                          padding: '6px 12px',
                          fontSize: '12px',
                          background: witchSaveSelection === v.id ? 'var(--success)' : '#444'
                        }}
                        onClick={() => setWitchSaveSelection(witchSaveSelection === v.id ? null : v.id)}
                      >
                        {witchSaveSelection === v.id ? `✓ Cứu: ${v.name}` : `Cứu ${v.name}`}
                      </button>
                    ))}
                    {witchSaveSelection && (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{width: 'auto', padding: '6px 10px', fontSize: '12px'}}
                        onClick={() => setWitchSaveSelection(null)}
                      >
                        Không cứu ai
                      </button>
                    )}
                  </div>
                ) : (
                  <p style={{fontSize: '12px', color: 'var(--text-muted)', margin: 0}}>Đã hết bình cứu!</p>
                )}
              </div>
            )}
          </div>

          {/* Phần bình độc */}
          <div style={{marginTop: '16px', padding: '12px', border: '1px solid #552244', borderRadius: '8px'}}>
            <h4 style={{margin: '0 0 8px 0', color: '#BA68C8', textAlign: 'left', fontSize: '14px'}}>
              ☠️ BÌNH ĐỘC (Có thể giết bất kỳ ai)
            </h4>
            {canPoison ? (
              <div>
                <p style={{fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 8px 0'}}>
                  Chọn 1 người để đầu độc (bấm lại để hủy chọn):
                </p>
                <div className="player-grid">
                  {alivePlayers.map(p => {
                    const globalIndex = game.players.findIndex(x => x.id === p.id);
                    const isPoisonTarget = witchPoisonSelection === p.id;
                    return (
                      <button
                        key={p.id}
                        className="player-square"
                        style={{
                          borderColor: isPoisonTarget ? '#BA68C8' : 'var(--secondary)',
                          boxShadow: isPoisonTarget ? '0 0 10px #BA68C8' : undefined
                        }}
                        onClick={() => setWitchPoisonSelection(isPoisonTarget ? null : p.id)}
                      >
                        <span className="player-id">P{globalIndex + 1}</span>
                        {renderAvatar(p, '☠️')}
                        <div className="player-name">{p.name}</div>
                        {isPoisonTarget && (
                          <div style={{fontSize: '11px', color: '#BA68C8', fontWeight: 'bold', marginTop: '2px'}}>
                            ☠️ Độc
                          </div>
                        )}
                        {showRoles && <div style={{fontSize: '10px', marginTop: '4px', color: '#aaa'}}>{getRoleLabel(p.role)}</div>}
                      </button>
                    );
                  })}
                </div>
                {witchPoisonSelection && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{marginTop: '8px', width: '100%', fontSize: '12px', padding: '8px'}}
                    onClick={() => setWitchPoisonSelection(null)}
                  >
                    Bỏ chọn đầu độc
                  </button>
                )}
              </div>
            ) : (
              <p style={{fontSize: '12px', color: 'var(--text-muted)', margin: 0}}>Đã hết bình độc!</p>
            )}
          </div>

          {/* Nút xác nhận Phù thủy */}
          <button 
            className="btn-primary" 
            style={{background: 'linear-gradient(135deg, #8E24AA 0%, #6A1B9A 100%)', marginTop: '20px', width: '100%', fontWeight: 'bold'}} 
            onClick={() => handleWitchAction(witchSaveSelection, witchPoisonSelection)}
          >
            ✓ Xác nhận Phù Thủy {savePlayer ? `(Cứu: ${savePlayer.name})` : ''} {poisonPlayer ? `(Độc: ${poisonPlayer.name})` : ''}
          </button>
          <button 
            className="btn-secondary" 
            style={{marginTop: '8px', width: '100%'}} 
            onClick={() => handleWitchAction(null, null)}
          >
            Không dùng bình nào (Bỏ qua)
          </button>
        </div>
      );
    }

    // 5. KẾT THÚC ĐÊM
    if (nightStep === 'done') {
      return (
        <div className="card">
          <h3>Trời sáng rồi</h3>
          <button className="btn-primary" onClick={finishNight}>Đánh thức mọi người</button>
        </div>
      );
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Vòng {currentRound?.number || 1} - {game.phase === 'night' ? 'Ban Đêm' : game.phase === 'day' ? 'Ban Ngày' : 'Kết Thúc'}</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-primary" style={{padding: '8px', fontSize: '14px', background: '#555'}} onClick={() => setShowRoles(!showRoles)}>{showRoles ? 'Ẩn Role' : 'Hiện Role'}</button>
          {canUndo && <button className="btn-primary" style={{padding: '8px', fontSize: '14px', background: '#f39c12'}} onClick={undo}>↩ Hoàn tác</button>}
          <button className="btn-primary" style={{padding: '8px', fontSize: '14px', background: 'var(--error)'}} onClick={handleExit}>Thoát</button>
        </div>
      </div>

      {/* Hiển thị lượt bắn súng của Thợ Săn nếu có (có nút xác nhận) */}
      {hunterPendingDeath && (
        <div className="card" style={{ border: '2px solid var(--hunter)', background: 'rgba(230, 81, 0, 0.15)', marginBottom: '20px' }}>
          <h3 style={{ color: 'var(--hunter)' }}>🏹 THỢ SĂN BỊ LOẠI!</h3>
          <p style={{ textAlign: 'center', fontSize: '15px' }}>
            <strong>{hunterPendingDeath.hunter.name}</strong> đã chết! Thợ săn được nổ súng kéo theo 1 người chơi:
          </p>
          <div className="player-grid">
            {alivePlayers.filter(p => p.id !== hunterPendingDeath.hunter.id).map(p => {
              const globalIndex = game.players.findIndex(x => x.id === p.id);
              const isSelected = selectedHunterTarget === p.id;

              return (
                <button
                  key={p.id}
                  className="player-square"
                  style={{
                    borderColor: isSelected ? 'var(--hunter)' : 'rgba(230, 81, 0, 0.4)',
                    boxShadow: isSelected ? '0 0 10px var(--hunter)' : undefined
                  }}
                  onClick={() => setSelectedHunterTarget(prev => prev === p.id ? null : p.id)}
                >
                  <span className="player-id">P{globalIndex + 1}</span>
                  {renderAvatar(p, '🎯')}
                  <div className="player-name">{p.name}</div>
                  {isSelected && (
                    <div style={{ fontSize: '11px', color: 'var(--hunter)', fontWeight: 'bold', marginTop: '2px' }}>
                      🎯 Mục tiêu bắn
                    </div>
                  )}
                  {showRoles && <div style={{ fontSize: '10px', marginTop: '2px', color: '#aaa' }}>{getRoleLabel(p.role)}</div>}
                </button>
              );
            })}
          </div>

          {selectedHunterTarget ? (
            <button
              className="btn-primary"
              style={{ marginTop: '16px', background: 'var(--hunter)', width: '100%', fontWeight: 'bold' }}
              onClick={() => handleHunterShoot(selectedHunterTarget)}
            >
              ✓ Xác nhận Thợ Săn bắn: {game.players.find(p => p.id === selectedHunterTarget)?.name}
            </button>
          ) : (
            <button
              className="btn-secondary"
              style={{ marginTop: '16px', width: '100%' }}
              onClick={() => handleHunterShoot(null)}
            >
              Thợ săn không bắn ai / Bỏ qua
            </button>
          )}

          {selectedHunterTarget && (
            <button
              className="btn-secondary"
              style={{ marginTop: '8px', width: '100%' }}
              onClick={() => setSelectedHunterTarget(null)}
            >
              Bỏ chọn mục tiêu
            </button>
          )}
        </div>
      )}

      {game.phase === 'ended' ? (
        <div className="card" style={{ textAlign: 'center', borderColor: 'var(--primary)', borderWidth: 2, borderStyle: 'solid' }}>
          <h1>Kết Thúc</h1>
          <h2 style={{color: game.winner === 'wolf' ? 'var(--error)' : 'var(--success)'}}>
            Phe {game.winner === 'wolf' ? 'SÓI' : 'DÂN LÀNG'} chiến thắng!
          </h2>
          <button className="btn-primary" onClick={handleEndGame}>Về Trang Chủ</button>
        </div>
      ) : (
        <>
          {game.phase === 'night' && !hunterPendingDeath && renderNightPhase()}

          {game.phase === 'day' && !hunterPendingDeath && (
            <div className="card">
              <h3>Sáng nay:</h3>
              {currentRound.nightDeaths.length === 0 ? (
                <p className="success">Đêm qua bình yên, không ai chết.</p>
              ) : (
                <p className="error">Người chết đêm qua: {currentRound.nightDeaths.map(id => game.players.find(p => p.id === id)?.name).join(', ')}</p>
              )}
              {currentRound.hunterShotTarget && (
                <p className="error" style={{ fontStyle: 'italic', marginTop: '4px' }}>
                  🏹 Thợ săn đã bắn chết: {game.players.find(p => p.id === currentRound.hunterShotTarget)?.name}
                </p>
              )}
              
              <h3 style={{marginTop: '24px'}}>⚖️ Bỏ phiếu loại (Treo cổ)</h3>
              <div className="player-grid">
                {alivePlayers.map(p => {
                  const globalIndex = game.players.findIndex(x => x.id === p.id);
                  const isSelected = selectedVoteTarget === p.id;

                  return (
                    <button 
                      key={p.id} 
                      className="player-square" 
                      style={{
                        borderColor: isSelected ? 'var(--error)' : 'transparent',
                        boxShadow: isSelected ? '0 0 10px var(--error)' : undefined
                      }} 
                      onClick={() => setSelectedVoteTarget(prev => prev === p.id ? null : p.id)}
                    >
                      <span className="player-id">P{globalIndex + 1}</span>
                      {renderAvatar(p, '⚖️')}
                      <div className="player-name">{p.name}</div>
                      {isSelected && (
                        <div style={{fontSize: '11px', color: 'var(--error)', fontWeight: 'bold', marginTop: '2px'}}>
                          ⚖️ Sẽ treo cổ
                        </div>
                      )}
                      {showRoles && <div style={{fontSize: '11px', marginTop: '4px', color: '#aaa'}}>{getRoleLabel(p.role)}</div>}
                    </button>
                  );
                })}
              </div>

              {selectedVoteTarget ? (
                <button 
                  className="btn-primary" 
                  style={{background: 'var(--error)', marginTop: '16px', width: '100%', fontWeight: 'bold'}} 
                  onClick={() => handleVote(selectedVoteTarget)}
                >
                  ✓ Xác nhận treo cổ: {game.players.find(p => p.id === selectedVoteTarget)?.name}
                </button>
              ) : (
                <button 
                  className="btn-primary" 
                  style={{background: '#555', marginTop: '16px', width: '100%'}} 
                  onClick={() => handleVote(null)}
                >
                  Hòa / Không ai bị loại
                </button>
              )}

              {selectedVoteTarget && (
                <button 
                  className="btn-secondary" 
                  style={{marginTop: '8px', width: '100%'}} 
                  onClick={() => setSelectedVoteTarget(null)}
                >
                  Bỏ chọn treo cổ
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
