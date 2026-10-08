import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { resolveNight } from '../game/night';
import { checkWinner } from '../game/win';
import type { Role } from '../game/types';

export default function PlayPage() {
  const navigate = useNavigate();
  const { game, updateGame, undo, canUndo, setGame } = useGame();
  const [showRoles, setShowRoles] = useState(false);

  if (!game) {
    return (
      <div className="container">
        <h2>Không tìm thấy ván chơi</h2>
        <button className="btn-primary" onClick={() => navigate('/setup')}>Tạo ván mới</button>
      </div>
    );
  }

  const alivePlayers = game.players.filter(p => p.alive);
  const deadPlayers = game.players.filter(p => !p.alive);
  const currentRound = game.rounds[game.rounds.length - 1];

  const handleExit = () => {
    if (window.confirm("Bạn muốn thoát ván này? Dữ liệu sẽ KHÔNG được lưu vào lịch sử.")) {
      setGame(null);
      navigate('/setup');
    }
  };

  const handleEndGame = () => {
    if (window.confirm("Bạn có chắc chắn muốn kết thúc và lưu ván này không?")) {
      import('../services/gameRepository').then(({ saveGameLocal }) => {
        saveGameLocal(game);
        setGame(null);
        navigate('/history');
      });
    }
  };

  const hasRole = (role: Role) => alivePlayers.some(p => p.role === role);

  const getNightStep = () => {
    if (!currentRound) return 'wait';
    if (currentRound.guardProtectTarget === undefined) return 'guard';
    if (currentRound.wolfTarget === undefined) return 'wolf';
    if (currentRound.seerCheck === undefined) return 'seer';
    if (currentRound.witchSaved === undefined) return 'witch';
    return 'done';
  };

  const nightStep = getNightStep();

  const handleGuardProtect = (targetId: string | null) => {
    updateGame(g => {
      const rounds = [...g.rounds];
      rounds[rounds.length - 1] = { ...rounds[rounds.length - 1], guardProtectTarget: targetId || 'none' };
      return { ...g, rounds };
    });
  };

  const handleWolfTarget = (targetId: string | null) => {
    updateGame(g => {
      const rounds = [...g.rounds];
      rounds[rounds.length - 1] = { ...rounds[rounds.length - 1], wolfTarget: targetId || 'none' };
      return { ...g, rounds };
    });
  };

  const handleSeerCheck = (targetId: string | null) => {
    updateGame(g => {
      const rounds = [...g.rounds];
      const target = targetId ? g.players.find(p => p.id === targetId) : null;
      rounds[rounds.length - 1] = { 
        ...rounds[rounds.length - 1], 
        seerCheck: targetId ? { target: targetId, isWolf: target?.role === 'wolf' } : { target: 'none', isWolf: false }
      };
      return { ...g, rounds };
    });
  };

  const handleWitchAction = (save: boolean, poisonTargetId: string | null) => {
    updateGame(g => {
      const rounds = [...g.rounds];
      rounds[rounds.length - 1] = { 
        ...rounds[rounds.length - 1], 
        witchSaved: save,
        witchPoisonTarget: poisonTargetId || undefined
      };
      
      const newItems = { ...g.witchItems };
      if (save) newItems.saveLeft--;
      if (poisonTargetId) newItems.poisonLeft--;

      return { ...g, rounds, witchItems: newItems };
    });
  };

  const finishNight = () => {
    updateGame(g => {
      const lastRound = g.rounds[g.rounds.length - 1];
      const deaths = resolveNight(lastRound);
      
      const newPlayers = g.players.map(p => 
        deaths.includes(p.id) ? { ...p, alive: false } : p
      );

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
    updateGame(g => {
      const newPlayers = g.players.map(p => 
        p.id === eliminatedId ? { ...p, alive: false } : p
      );

      const rounds = [...g.rounds];
      rounds[rounds.length - 1] = {
        ...rounds[rounds.length - 1],
        vote: { tally: {}, eliminated: eliminatedId || undefined }
      };

      const winner = checkWinner(newPlayers);

      // Nếu chưa kết thúc, tạo round mới và sang đêm
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
  };

  const renderNightPhase = () => {
    if (nightStep === 'guard') {
      const previousTarget = game.rounds.length > 1 ? game.rounds[game.rounds.length - 2].guardProtectTarget : null;
      return (
        <div className="card">
          <h3 style={{color: '#4CAF50'}}>🛡 BẢO VỆ muốn bảo vệ ai?</h3>
          {!hasRole('guard') && <p className="error">Bảo vệ đã chết hoặc không có, bấm Không bảo vệ ai để giữ nhịp.</p>}
          <div className="player-grid">
            {alivePlayers.map(p => (
              <button 
                key={p.id} 
                className="player-square" 
                style={{background: p.id === previousTarget ? '#555' : '#4CAF50'}} 
                disabled={p.id === previousTarget && p.id !== 'none'}
                onClick={() => handleGuardProtect(p.id)}
              >
                {p.name}
                {p.id === previousTarget && <small style={{display:'block', fontSize:'10px', marginTop:'4px'}}>(Vòng trước)</small>}
              </button>
            ))}
          </div>
          <button className="btn-primary" style={{background: '#555', marginTop: '16px', width: '100%'}} onClick={() => handleGuardProtect(null)}>Không bảo vệ ai</button>
        </div>
      );
    }

    if (nightStep === 'wolf') {
      return (
        <div className="card">
          <h3 style={{color: 'var(--error)'}}>🐺 SÓI muốn cắn ai?</h3>
          {!hasRole('wolf') && <p className="error">Không còn sói sống, có thể bỏ qua.</p>}
          <div className="player-grid">
            {alivePlayers.map(p => (
              <button key={p.id} className="player-square" onClick={() => handleWolfTarget(p.id)} style={{background: p.role === 'wolf' ? '#555' : 'var(--error)'}}>
                {p.name}
              </button>
            ))}
          </div>
          <button className="btn-primary" style={{background: '#555', marginTop: '16px', width: '100%'}} onClick={() => handleWolfTarget(null)}>Sói không cắn ai</button>
        </div>
      );
    }
    
    if (nightStep === 'seer') {
      return (
        <div className="card">
          <h3 style={{color: '#2196F3'}}>👁 TIÊN TRI muốn soi ai?</h3>
          {!hasRole('seer') && <p className="error">Tiên tri đã chết, bấm Bỏ qua để giữ nhịp.</p>}
          <div className="player-grid">
            {alivePlayers.map(p => (
              <button key={p.id} className="player-square" style={{background: '#2196F3'}} onClick={() => handleSeerCheck(p.id)}>
                {p.name}
              </button>
            ))}
          </div>
          <button className="btn-primary" style={{background: '#555', marginTop: '16px', width: '100%'}} onClick={() => handleSeerCheck(null)}>Bỏ qua</button>
          {currentRound.seerCheck && currentRound.seerCheck.target !== 'none' && (
             <p className="success" style={{marginTop: '16px'}}>Kết quả: {currentRound.seerCheck.isWolf ? "Là Sói 🐺" : "Không phải Sói 👨"}</p>
          )}
        </div>
      );
    }

    if (nightStep === 'witch') {
      const victimId = currentRound.wolfTarget !== 'none' ? currentRound.wolfTarget : null;
      // Trả về không ai nếu sói cắn trúng người được bảo vệ
      const isProtected = currentRound.guardProtectTarget === currentRound.wolfTarget;
      const actualVictimId = (victimId && !isProtected) ? victimId : null;
      
      const victimName = actualVictimId ? game.players.find(p => p.id === actualVictimId)?.name : 'Không ai';
      
      return (
        <div className="card">
          <h3 style={{color: 'purple'}}>🧪 PHÙ THỦY muốn làm gì?</h3>
          {!hasRole('witch') && <p className="error">Phù thủy đã chết, bấm Không làm gì để giữ nhịp.</p>}
          <p>Đêm nay chết: <strong>{victimName}</strong></p>
          
          <div className="player-grid" style={{marginTop: '16px'}}>
            {game.witchItems.saveLeft > 0 && actualVictimId && (
              <button className="player-square" style={{background: 'var(--success)', color: '#000'}} onClick={() => handleWitchAction(true, null)}>
                Cứu<br/>({victimName})
              </button>
            )}
            
            {game.witchItems.poisonLeft > 0 && alivePlayers.map(p => (
              <button key={p.id} className="player-square" style={{background: 'purple', color: '#fff'}} onClick={() => handleWitchAction(false, p.id)}>
                Độc<br/>{p.name}
              </button>
            ))}
          </div>
          <button className="btn-primary" style={{background: '#555', marginTop: '16px', width: '100%'}} onClick={() => handleWitchAction(false, null)}>Không làm gì</button>
        </div>
      );
    }

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
          {canUndo && <button className="btn-primary" style={{padding: '8px', fontSize: '14px', background: '#f39c12'}} onClick={undo}>↩ Hoàn tác</button>}
          <button className="btn-primary" style={{padding: '8px', fontSize: '14px', background: 'var(--error)'}} onClick={handleExit}>Thoát</button>
        </div>
      </div>

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
          {game.phase === 'night' && renderNightPhase()}

          {game.phase === 'day' && (
            <div className="card">
              <h3>Sáng nay:</h3>
              {currentRound.nightDeaths.length === 0 ? (
                <p className="success">Đêm qua bình yên, không ai chết.</p>
              ) : (
                <p className="error">Người chết: {currentRound.nightDeaths.map(id => game.players.find(p => p.id === id)?.name).join(', ')}</p>
              )}
              
              <h3 style={{marginTop: '24px'}}>⚖️ Bỏ phiếu loại (Treo cổ)</h3>
              <div className="player-grid">
                {alivePlayers.map(p => (
                  <button key={p.id} className="player-square" style={{background: 'var(--error)'}} onClick={() => handleVote(p.id)}>
                    Treo cổ<br/>{p.name}
                  </button>
                ))}
              </div>
              <button className="btn-primary" style={{background: '#555', marginTop: '16px', width: '100%'}} onClick={() => handleVote(null)}>Hòa / Không ai bị loại</button>
            </div>
          )}
        </>
      )}

      <div className="card" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Danh sách người chơi ({alivePlayers.length} sống)</h3>
          <button className="btn-primary" style={{padding: '4px 8px', fontSize: '12px'}} onClick={() => setShowRoles(!showRoles)}>
            {showRoles ? 'Ẩn vai trò' : 'Xem vai trò'}
          </button>
        </div>
        
        <div style={{ marginTop: '12px' }}>
          {alivePlayers.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #333' }}>
              <span>{p.name}</span>
              {showRoles ? (
                <span style={{color: p.role === 'wolf' ? 'var(--error)' : p.role === 'witch' ? 'purple' : p.role === 'seer' ? '#2196F3' : p.role === 'guard' ? '#4CAF50' : 'white'}}>
                  {p.role === 'wolf' ? '🐺 Sói' : p.role === 'seer' ? '👁 Tiên tri' : p.role === 'witch' ? '🧪 Phù thủy' : p.role === 'guard' ? '🛡 Bảo vệ' : '👨 Dân'}
                </span>
              ) : (
                <span style={{color: '#888'}}>***</span>
              )}
            </div>
          ))}
          {deadPlayers.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ color: 'var(--error)' }}>Đã chết ({deadPlayers.length})</h4>
              {deadPlayers.map(p => (
                 <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #333', color: '#666' }}>
                   <span style={{ textDecoration: 'line-through' }}>{p.name}</span>
                   <span>
                    {p.role === 'wolf' ? '🐺 Sói' : p.role === 'seer' ? '👁 Tiên tri' : p.role === 'witch' ? '🧪 Phù thủy' : p.role === 'guard' ? '🛡 Bảo vệ' : '👨 Dân'}
                   </span>
                 </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
