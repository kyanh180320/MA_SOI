import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { getRoleDistribution, assignRoles } from '../game/roles';
import { RULES } from '../game/config';
import { getCloudPresets, addCloudPreset, deleteCloudPreset } from '../services/presetNameService';
import { syncRoomGame } from '../services/roomService';
import type { Role, PresetName, GameRoom, Game } from '../game/types';
import {
  Button,
  Panel,
  Badge,
  Modal,
  Toast
} from '../components/ui';

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

  // Tự động căn chỉnh khi mới mở trang
  useEffect(() => {
    if (playerCount >= RULES.minPlayers && playerCount <= RULES.maxPlayers) {
      setDistribution(getRoleDistribution(playerCount, { randomize: true }));
    }
  }, []);

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
      id: (fromRoom && fromRoom.members && fromRoom.members[i]?.uid) 
        ? fromRoom.members[i].uid 
        : `p_${Date.now()}_${i}`,
      name: name.trim() || `Người chơi ${i + 1}`,
      avatar: avatars[i] || undefined,
    }));

    const assignedPlayers = assignRoles(players, distribution);

    const newGame: Game = {
      id: `game_${Date.now()}`,
      createdAt: Date.now(),
      players: assignedPlayers,
      rounds: [{ number: 1, nightDeaths: [] }],
      phase: "night",
      witchItems: { saveLeft: RULES.witch.saveCount, poisonLeft: RULES.witch.poisonCount },
      roomId: fromRoom?.id
    };

    setGame(newGame);

    if (fromRoom?.id) {
      syncRoomGame(fromRoom.id, newGame).catch(err => {
        console.error("Không thể đồng bộ game lên phòng:", err);
      });
    }

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
    <div className="screen-container" style={{ gap: 'var(--s-4)' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          variant="secondary"
          onClick={() => navigate('/')}
          style={{ minHeight: '40px', padding: '0 var(--s-3)', fontSize: '13px' }}
        >
          ← Trang chủ
        </Button>
        <h2 style={{
          margin: 0,
          fontFamily: 'var(--font-title)',
          fontSize: '18px',
          color: 'var(--gold-100)',
          letterSpacing: '0.04em'
        }}>
          THIẾT LẬP VÁN ĐẤU
        </h2>
        <div style={{ width: '60px' }} />
      </div>

      {/* THÔNG TIN QUẢN TRÒ */}
      <Panel compact>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Quản trò:</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--gold-300)', marginTop: '2px' }}>
              🎙️ {user?.displayName || 'Khách (Offline)'}
            </div>
          </div>
          <Badge variant="gold">
            {fromRoom ? `Phòng #${fromRoom.id}` : 'Ván Offline'}
          </Badge>
        </div>
      </Panel>

      {/* 1. SỐ LƯỢNG NGƯỜI CHƠI */}
      <Panel style={{ textAlign: 'center' }}>
        <h3 style={{
          fontFamily: 'var(--font-title)',
          color: 'var(--gold-100)',
          fontSize: '16px',
          margin: '0 0 var(--s-2) 0'
        }}>
          SỐ LƯỢNG NGƯỜI CHƠI
        </h3>
        <div style={{
          fontSize: '44px', 
          fontWeight: 'bold', 
          color: 'var(--gold-300)', 
          margin: 'var(--s-2) 0', 
          fontFamily: 'var(--font-title)',
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
            accentColor: 'var(--gold-500)',
            cursor: 'pointer'
          }}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          color: 'var(--gold-300)',
          fontSize: '13px',
          marginTop: '8px',
          fontWeight: 'bold'
        }}>
          <span>{RULES.minPlayers} người</span>
          <span>{RULES.maxPlayers} người</span>
        </div>
      </Panel>

      {/* 2. ĐIỀU CHỈNH VAI TRÒ */}
      <Panel>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s-3)' }}>
          <h3 style={{
            fontFamily: 'var(--font-title)',
            color: 'var(--gold-100)',
            fontSize: '16px',
            margin: 0
          }}>
            ĐIỀU CHỈNH VAI TRÒ
          </h3>
          <div style={{ display: 'flex', gap: 'var(--s-1)' }}>
            <Button
              variant="secondary"
              onClick={handleAutoBalance}
              style={{ minHeight: '36px', padding: '0 var(--s-2)', fontSize: '12px' }}
            >
              🎲 Cân Bằng
            </Button>
            <Button
              variant="ghost"
              onClick={handleResetRoles}
              style={{ minHeight: '36px', padding: '0 var(--s-2)', fontSize: '12px' }}
            >
              Về 0
            </Button>
          </div>
        </div>

        <div style={{ marginBottom: 'var(--s-3)' }}>
          {totalRoles !== playerCount ? (
            <Toast
              variant="danger"
              message={`Đã chia ${totalRoles}/${playerCount} vai (Chưa khớp số lượng)`}
            />
          ) : totalWolves === 0 ? (
            <Toast
              variant="danger"
              message="Cần có ít nhất 1 Ma Sói hoặc Sói Quỷ trong ván"
            />
          ) : (
            <Toast
              variant="success"
              message={`Đã chia đủ ${totalRoles}/${playerCount} vai! Sẵn sàng`}
            />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
          {(["wolf", "wolf_demon", "seer", "witch", "guard", "hunter", "villager"] as Role[]).map(role => (
            <div
              key={role}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--s-2) var(--s-3)',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)'
              }}
            >
              <div>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>
                  {role === 'wolf' ? '🐺 Sói thường' :
                   role === 'wolf_demon' ? '😈 Sói quỷ' :
                   role === 'seer' ? '👁 Tiên tri' :
                   role === 'witch' ? '🧪 Phù thủy' :
                   role === 'guard' ? '🛡 Bảo vệ' :
                   role === 'hunter' ? '🏹 Thợ săn' : '👨 Dân làng'}
                </span>
                {role === 'wolf_demon' && (
                  <div style={{ fontSize: '11px', color: 'var(--gold-300)' }}>Cắn 2 người/đêm</div>
                )}
                {role === 'hunter' && (
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Bắn 1 người khi chết</div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)' }}>
                <button
                  type="button"
                  onClick={() => handleRoleChange(role, -1)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--gold-700)',
                    background: 'var(--bg-2)',
                    color: 'var(--gold-300)',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  -
                </button>
                <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 'bold', fontSize: '15px', color: 'var(--gold-100)' }}>
                  {distribution[role] || 0}
                </span>
                <button
                  type="button"
                  onClick={() => handleRoleChange(role, 1)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--gold-700)',
                    background: 'var(--bg-2)',
                    color: 'var(--gold-300)',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* 3. TÊN NGƯỜI CHƠI */}
      <Panel>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s-3)' }}>
          <h3 style={{
            fontFamily: 'var(--font-title)',
            color: 'var(--gold-100)',
            fontSize: '16px',
            margin: 0
          }}>
            TÊN NGƯỜI CHƠI ({playerCount})
          </h3>
          <div style={{ display: 'flex', gap: 'var(--s-1)' }}>
            <Button
              variant="secondary"
              onClick={async () => {
                const presets = await getCloudPresets();
                handleApplyPresets(presets);
              }}
              style={{ minHeight: '36px', padding: '0 var(--s-2)', fontSize: '12px' }}
            >
              ⚡ Tên mẫu
            </Button>
            <Button
              variant="ghost"
              onClick={handleOpenPresetModal}
              style={{ minHeight: '36px', padding: '0 var(--s-2)', fontSize: '12px' }}
            >
              ⚙️ Sửa mẫu
            </Button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
          {names.map((name, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--s-2)',
                background: 'rgba(0,0,0,0.25)',
                padding: 'var(--s-2)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
              }}
            >
              <Badge variant="ash">P{i+1}</Badge>
              <input
                type="text"
                placeholder={`Người chơi ${i+1}`}
                value={name}
                onChange={e => {
                  const newNames = [...names];
                  newNames[i] = e.target.value;
                  setNames(newNames);
                }}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none'
                }}
              />
            </div>
          ))}
        </div>
      </Panel>

      {/* DUY NHẤT 1 PRIMARY BUTTON TRÊN MÀN HÌNH */}
      <div style={{ marginTop: 'auto', paddingTop: 'var(--s-2)' }}>
        <Button
          variant="primary"
          pulse
          fullWidth
          disabled={!isValid}
          onClick={handleStart}
        >
          CHIA VAI & BẮT ĐẦU VÁN ĐẤU ➔
        </Button>
      </div>

      {/* MODAL QUẢN LÝ TÊN MẪU (PRESETS) */}
      <Modal
        isOpen={showPresetModal}
        onClose={() => setShowPresetModal(false)}
        title="DANH SÁCH TÊN MẪU"
        footer={
          <div style={{ display: 'flex', gap: 'var(--s-2)', width: '100%' }}>
            <Button
              variant="secondary"
              style={{ flex: 1 }}
              onClick={() => setShowPresetModal(false)}
            >
              Đóng
            </Button>
            <Button
              variant="primary"
              style={{ flex: 1.5 }}
              onClick={() => {
                handleApplyPresets(presetList);
                setShowPresetModal(false);
              }}
            >
              Áp Dụng
            </Button>
          </div>
        }
      >
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: '0 0 var(--s-3) 0' }}>
          Thêm tên bạn bè vào đây để điền nhanh 1-chạm vào mọi ván chơi sau này:
        </p>

        <form onSubmit={handleAddPreset} style={{ display: 'flex', gap: 'var(--s-2)', marginBottom: 'var(--s-3)' }}>
          <input
            type="text"
            placeholder="Nhập tên người chơi mới..."
            value={newPresetName}
            onChange={e => setNewPresetName(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 12px',
              background: 'var(--bg-1)',
              border: '1px solid var(--gold-700)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text)',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <Button
            variant="secondary"
            disabled={isAddingPreset || !newPresetName.trim()}
            style={{ minHeight: '40px', padding: '0 var(--s-3)', fontSize: '13px' }}
          >
            + Thêm
          </Button>
        </form>

        <div style={{
          maxHeight: '200px',
          overflowY: 'auto',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--s-2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--s-1)'
        }}>
          {presetList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-dim)', fontSize: '13px' }}>
              Chưa có tên mẫu nào.
            </div>
          ) : (
            presetList.map((p, idx) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--bg-2)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px'
                }}
              >
                <span>
                  <strong style={{ color: 'var(--gold-300)', marginRight: '6px' }}>#{idx + 1}</strong>
                  {p.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeletePreset(p.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--red-300)',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  title="Xóa tên này"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
