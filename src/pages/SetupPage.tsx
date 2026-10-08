import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { getRoleDistribution, assignRoles } from '../game/roles';
import { RULES } from '../game/config';
import type { Role } from '../game/types';

export default function SetupPage() {
  const navigate = useNavigate();
  const { setGame } = useGame();
  
  const [playerCountInput, setPlayerCountInput] = useState<string>(String(RULES.minPlayers));
  const playerCount = parseInt(playerCountInput) || 0;
  
  const [names, setNames] = useState<string[]>(Array(RULES.minPlayers).fill(""));
  const [avatars, setAvatars] = useState<string[]>(Array(RULES.minPlayers).fill(""));
  const [distribution, setDistribution] = useState<Record<Role, number>>({ 
    wolf: 0, 
    wolf_demon: 0, 
    seer: 0, 
    witch: 0, 
    guard: 0, 
    hunter: 0, 
    villager: 0 
  });

  // Chỉ cập nhật danh sách tên và avatar khi số lượng người chơi thay đổi, giữ nguyên phân bổ vai thủ công
  useEffect(() => {
    if (playerCount >= RULES.minPlayers && playerCount <= RULES.maxPlayers) {
      setNames(prev => {
        const newNames = [...prev];
        if (newNames.length < playerCount) {
          return [...newNames, ...Array(playerCount - newNames.length).fill("")];
        }
        return newNames.slice(0, playerCount);
      });
      setAvatars(prev => {
        const newAvatars = [...prev];
        if (newAvatars.length < playerCount) {
          return [...newAvatars, ...Array(playerCount - newAvatars.length).fill("")];
        }
        return newAvatars.slice(0, playerCount);
      });
    }
  }, [playerCount]);

  const totalRoles = Object.values(distribution).reduce((a, b) => a + b, 0);
  const totalWolves = (distribution.wolf || 0) + (distribution.wolf_demon || 0);
  const isValid = totalRoles === playerCount && totalWolves > 0 && totalWolves < playerCount;

  const handleStart = () => {
    if (!isValid) return;

    const players = names.map((name, i) => ({
      id: `p_${Date.now()}_${i}`,
      name: name.trim() || `Người chơi ${i + 1}`,
      avatar: avatars[i] || undefined,
    }));

    const assignedPlayers = assignRoles(players, distribution);

    setGame({
      id: `game_${Date.now()}`,
      createdAt: Date.now(),
      players: assignedPlayers,
      rounds: [{ number: 1, nightDeaths: [] }],
      phase: "night",
      witchItems: { saveLeft: RULES.witch.saveCount, poisonLeft: RULES.witch.poisonCount }
    });

    navigate('/play');
  };

  const handleRoleChange = (role: Role, delta: number) => {
    setDistribution(prev => ({
      ...prev,
      [role]: Math.max(0, prev[role] + delta)
    }));
  };

  const handleAutoBalance = () => {
    if (playerCount >= RULES.minPlayers && playerCount <= RULES.maxPlayers) {
      setDistribution(getRoleDistribution(playerCount, { randomize: true }));
    }
  };

  const handleResetRoles = () => {
    setDistribution({ 
      wolf: 0, 
      wolf_demon: 0, 
      seer: 0, 
      witch: 0, 
      guard: 0, 
      hunter: 0, 
      villager: 0 
    });
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button 
          className="btn-secondary" 
          style={{ width: 'auto', padding: '8px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }} 
          onClick={() => navigate('/')}
        >
          ← Trang chủ
        </button>
        <h2 style={{ margin: 0, fontSize: '20px' }}>Thiết lập ván chơi</h2>
        <div style={{ width: '80px' }} />
      </div>

      <div className="card" style={{textAlign: 'center', padding: '24px'}}>
        <h3 style={{marginBottom: '16px'}}>SỐ LƯỢNG NGƯỜI CHƠI</h3>
        <div style={{
          fontSize: '42px', 
          fontWeight: 'bold', 
          color: 'var(--text)', 
          margin: '16px 0', 
          fontFamily: 'Cinzel',
          textShadow: '0 2px 8px rgba(0,0,0,0.8)'
        }}>
          {playerCount}
        </div>
        <input 
          type="range" 
          min={RULES.minPlayers} 
          max={RULES.maxPlayers} 
          value={playerCount}
          onChange={e => setPlayerCountInput(e.target.value)}
          style={{
            width: '100%', 
            accentColor: 'var(--primary)',
            cursor: 'pointer'
          }}
        />
        <div style={{display: 'flex', justifyContent: 'space-between', color: 'var(--primary)', fontSize: '14px', marginTop: '12px', fontWeight: 'bold', fontFamily: 'Cinzel'}}>
          <span>{RULES.minPlayers}</span>
          <span>{RULES.maxPlayers}</span>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          <h3 style={{ margin: 0 }}>Điều chỉnh vai</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              className="btn-primary" 
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                width: 'auto',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #D4AF37 0%, #AA8010 100%)',
                color: '#1a1614',
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(212, 175, 55, 0.3)'
              }}
              onClick={handleAutoBalance}
            >
              ⚡ Cân bằng game
            </button>
            <button 
              type="button" 
              className="btn-secondary" 
              style={{
                padding: '6px 10px',
                fontSize: '13px',
                width: 'auto',
                borderRadius: '8px'
              }}
              onClick={handleResetRoles}
            >
              Đặt về 0
            </button>
          </div>
        </div>
        <p className={totalRoles !== playerCount ? 'error' : 'success'} style={{ margin: '4px 0 16px 0' }}>
          Đã chia {totalRoles}/{playerCount} vai
          {totalRoles === 0 && (
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              (Tự chỉnh vai bên dưới hoặc bấm "Cân bằng game" để chia tự động)
            </span>
          )}
          {totalRoles === playerCount && totalWolves === 0 && (
            <span style={{ display: 'block', color: 'var(--error)', marginTop: '4px' }}>
              (Cần ít nhất 1 Sói hoặc Sói Quỷ để bắt đầu)
            </span>
          )}
        </p>
        <div className="role-grid">
          {(["wolf", "wolf_demon", "seer", "witch", "guard", "hunter", "villager"] as Role[]).map(role => (
            <div key={role} className="role-row">
              <div>
                <span style={{ fontWeight: 600 }}>
                  {role === 'wolf' ? '🐺 Sói thường' :
                   role === 'wolf_demon' ? '😈 Sói quỷ' :
                   role === 'seer' ? '👁 Tiên tri' :
                   role === 'witch' ? '🧪 Phù thủy' :
                   role === 'guard' ? '🛡 Bảo vệ' :
                   role === 'hunter' ? '🏹 Thợ săn' : '👨 Dân làng'}
                </span>
                {role === 'wolf_demon' && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cắn 2 người mỗi đêm khi còn sống</div>
                )}
                {role === 'hunter' && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Kéo theo 1 người khi chết</div>
                )}
                {role === 'witch' && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>1 bình cứu & 1 bình độc</div>
                )}
              </div>
              <div className="controls">
                <button onClick={() => handleRoleChange(role, -1)}>-</button>
                <span>{distribution[role] || 0}</span>
                <button onClick={() => handleRoleChange(role, 1)}>+</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{marginBottom: '20px'}}>Tên Người Chơi</h3>
        <div className="player-grid">
          {names.map((name, i) => (
            <div key={i} className="player-square">
              <span className="player-id">P{i+1}</span>
              <label className="player-avatar" style={{ cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {avatars[i] ? <img src={avatars[i]} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = URL.createObjectURL(file);
                      const newAvatars = [...avatars];
                      newAvatars[i] = url;
                      setAvatars(newAvatars);
                    }
                  }}
                />
              </label>
              <input
                type="text"
                className="player-input"
                placeholder={`Tên`}
                value={name}
                onChange={e => {
                  const newNames = [...names];
                  newNames[i] = e.target.value;
                  setNames(newNames);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <button className="btn-primary large-btn" disabled={!isValid} onClick={handleStart}>
        Chia Vai & Bắt Đầu
      </button>
    </div>
  );
}
