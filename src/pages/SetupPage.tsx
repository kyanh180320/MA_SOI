import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { getRoleDistribution, assignRoles } from '../game/roles';
import { RULES } from '../game/config';
import { getCloudPresets, addCloudPreset, deleteCloudPreset } from '../services/presetNameService';
import type { Role, PresetName, GameRoom } from '../game/types';

export default function SetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromRoom = location.state?.fromRoom as GameRoom | undefined;

  const { setGame } = useGame();
  const { user } = useAuth();
  
  const [playerCountInput, setPlayerCountInput] = useState<string>(() => {
    if (fromRoom && fromRoom.members && fromRoom.members.length > 0) {
      return String(Math.max(RULES.minPlayers, Math.min(RULES.maxPlayers, fromRoom.members.length)));
    }
    return String(RULES.minPlayers);
  });
  const playerCount = parseInt(playerCountInput) || 0;
  
  const [names, setNames] = useState<string[]>(() => {
    if (fromRoom && fromRoom.members && fromRoom.members.length > 0) {
      const count = Math.max(RULES.minPlayers, Math.min(RULES.maxPlayers, fromRoom.members.length));
      const list = fromRoom.members.map(m => m.displayName);
      while (list.length < count) list.push("");
      return list.slice(0, count);
    }
    return Array(RULES.minPlayers).fill("");
  });

  const [avatars, setAvatars] = useState<string[]>(() => {
    if (fromRoom && fromRoom.members && fromRoom.members.length > 0) {
      const count = Math.max(RULES.minPlayers, Math.min(RULES.maxPlayers, fromRoom.members.length));
      const list = fromRoom.members.map(m => m.avatar || "");
      while (list.length < count) list.push("");
      return list.slice(0, count);
    }
    return Array(RULES.minPlayers).fill("");
  });

  const [distribution, setDistribution] = useState<Record<Role, number>>({ 
    wolf: 0, 
    wolf_demon: 0, 
    seer: 0, 
    witch: 0, 
    guard: 0, 
    hunter: 0, 
    villager: 0 
  });

  // State quản lý danh sách tên mẫu (Presets)
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetList, setPresetList] = useState<PresetName[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [isAddingPreset, setIsAddingPreset] = useState(false);

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

  const loadPresets = async () => {
    const list = await getCloudPresets();
    setPresetList(list);
  };

  const handleOpenPresetModal = async () => {
    await loadPresets();
    setShowPresetModal(true);
  };

  const handleAddPreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    setIsAddingPreset(true);
    try {
      const added = await addCloudPreset(newPresetName.trim());
      setPresetList(prev => [...prev, added]);
      setNewPresetName('');
    } finally {
      setIsAddingPreset(false);
    }
  };

  const handleDeletePreset = async (id: string) => {
    await deleteCloudPreset(id);
    setPresetList(prev => prev.filter(p => p.id !== id));
  };

  const handleApplyPresets = (presetsToApply: PresetName[]) => {
    if (presetsToApply.length > 0) {
      setNames(prev => prev.map((old, idx) => (idx < presetsToApply.length ? presetsToApply[idx].name : old)));
    }
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
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

      {/* Thẻ hiển thị Quản trò điều hành ván đấu */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(212, 175, 55, 0.08)',
        border: '1px solid rgba(212, 175, 55, 0.25)',
        borderRadius: '12px',
        padding: '10px 14px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user?.avatar || user?.photoURL ? (
            <img
              src={user.avatar || user.photoURL}
              alt="avatar"
              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--primary)' }}
            />
          ) : (
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--primary)',
              color: '#1a1614',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '13px'
            }}>
              🎙️
            </div>
          )}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
              Quản trò: <span style={{ color: 'var(--primary)' }}>{user?.displayName || 'Khách (Offline)'}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {user ? '☁️ Lịch sử ván sẽ tự động lưu lên Cloud' : 'Chơi offline (Đăng nhập để lưu ván lên Cloud)'}
            </div>
          </div>
        </div>
        {!user && (
          <button
            type="button"
            className="btn-secondary"
            style={{ width: 'auto', padding: '4px 10px', fontSize: '11px', color: 'var(--primary)' }}
            onClick={() => navigate('/login')}
          >
            Đăng nhập
          </button>
        )}
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
              🎲 Cân bằng game
            </button>
            <button 
              type="button" 
              className="btn-secondary" 
              style={{
                padding: '6px 12px',
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0 }}>Tên Người Chơi</h3>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
              onClick={async () => {
                const presets = await getCloudPresets();
                handleApplyPresets(presets);
              }}
              title="Điền nhanh danh sách tên mẫu"
            >
              ⚡ Điền tên mẫu
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '12px', color: 'var(--primary)', borderColor: 'rgba(212, 175, 55, 0.4)' }}
              onClick={handleOpenPresetModal}
              title="Chỉnh sửa danh sách tên mẫu"
            >
              ⚙️ Sửa tên mẫu
            </button>
          </div>
        </div>
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

      {/* Modal Quản Lý Tên Mẫu (Presets) */}
      {showPresetModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '18px' }}>
                ⚙️ Danh Sách Tên Mẫu
              </h3>
              <button
                type="button"
                onClick={() => setShowPresetModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '20px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.4 }}>
              Thêm tên bạn bè của bạn vào đây để có thể điền nhanh 1-click vào mọi ván chơi sau này.
            </p>

            {/* Form thêm tên mới */}
            <form onSubmit={handleAddPreset} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Nhập tên người chơi mới..."
                value={newPresetName}
                onChange={e => setNewPresetName(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: 'var(--secondary)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={isAddingPreset || !newPresetName.trim()}
                style={{ width: 'auto', padding: '10px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}
              >
                {isAddingPreset ? '...' : '+ Thêm'}
              </button>
            </form>

            {/* Danh sách tên hiện có */}
            <div style={{
              maxHeight: '220px',
              overflowY: 'auto',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              padding: '8px',
              marginBottom: '20px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              {presetList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Chưa có tên mẫu nào. Hãy thêm tên ở trên!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {presetList.map((p, idx) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'var(--secondary)',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <span>
                        <strong style={{ color: 'var(--primary)', marginRight: '6px' }}>#{idx + 1}</strong>
                        {p.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeletePreset(p.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--error)',
                          cursor: 'pointer',
                          fontSize: '15px',
                          padding: '2px 6px'
                        }}
                        title="Xóa tên này"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Nút hành động */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1, padding: '12px' }}
                onClick={() => setShowPresetModal(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ flex: 1.5, padding: '12px' }}
                onClick={() => {
                  handleApplyPresets(presetList);
                  setShowPresetModal(false);
                }}
              >
                ⚡ Áp dụng cho ván này
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
