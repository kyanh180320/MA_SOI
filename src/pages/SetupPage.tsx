import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { getRoleDistribution, assignRoles } from '../game/roles';
import { RULES } from '../game/config';
import { getCloudPresets, addCloudPreset, deleteCloudPreset } from '../services/presetNameService';
import { syncRoomGame } from '../services/roomService';
import type { Role, PresetName, GameRoom, Game } from '../game/types';
import { Button, Modal } from '../components/ui';
import styles from './SetupPage.module.css';

const ROLE_ITEMS: { id: Role; name: string; icon: string; desc: string }[] = [
  { id: 'wolf', name: 'SÓI THƯỜNG', icon: '/assets/icons/icon_wolf_paw.webp', desc: 'Phe Sói cắn người mỗi đêm' },
  { id: 'villager', name: 'DÂN LÀNG', icon: '/assets/icons/icon_sun.webp', desc: 'Phe Dân suy luận & biểu quyết' },
  { id: 'seer', name: 'TIÊN TRI', icon: '/assets/icons/icon_eye.webp', desc: 'Soi phe 1 người mỗi đêm' },
  { id: 'witch', name: 'PHÙ THỦY', icon: '/assets/icons/icon_potion_heal.webp', desc: 'Có 1 bình cứu & 1 bình độc' },
  { id: 'guard', name: 'BẢO VỆ', icon: '/assets/icons/icon_shield.webp', desc: 'Bảo vệ 1 người mỗi đêm' },
  { id: 'hunter', name: 'THỢ SĂN', icon: '/assets/icons/icon_swords_alt.webp', desc: 'Kéo theo 1 người khi chết' },
  { id: 'wolf_demon', name: 'SÓI QUỶ', icon: '/assets/icons/icon_wolf_paw_fire.webp', desc: 'Cắn tối đa 2 người' },
];

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
  const playerCount = parseInt(playerCountInput) || RULES.minPlayers;

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

  const handleStart = async () => {
    if (!isValid) return;

    const players = names.map((name, i) => {
      const matchedMember = fromRoom?.members?.find(m => m.displayName.trim() === name.trim()) || fromRoom?.members?.[i];
      return {
        id: matchedMember?.uid || `p_${Date.now()}_${i}`,
        name: name.trim() || `Người chơi ${i + 1}`,
        avatar: avatars[i] || matchedMember?.avatar || "",
      };
    });

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
      try {
        await syncRoomGame(fromRoom.id, newGame);
      } catch (err: unknown) {
        console.error("Không thể đồng bộ game lên phòng:", err);
        alert("Lỗi đồng bộ phòng online: " + ((err as Error).message || String(err)));
      }
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

  const changePlayerCount = (delta: number) => {
    const nextCount = Math.max(RULES.minPlayers, Math.min(RULES.maxPlayers, playerCount + delta));
    setPlayerCountInput(String(nextCount));
  };

  return (
    <div className={styles.setupScreenWrapper}>
      <div className={styles.setupPhoneFrame}>
        {/* NỘI DUNG CUỘN CHÍNH */}
        <div className={styles.setupContentScroll}>
          {/* 1. RUY BĂNG TIÊU ĐỀ NEW GAME */}
          <div className={styles.ribbonHeader}>
            <img
              src="/assets/setup_ribbon.webp"
              alt="NEW GAME"
              className={styles.ribbonImg}
            />
          </div>

          {/* 2. SECTION SỐ LƯỢNG NGƯỜI CHƠI (PLAYERS) */}
          <div className={styles.sectionTabHeader}>
            <div className={styles.tabPlate}>PLAYERS</div>
          </div>

          <div className={styles.stepperContainer}>
            <button
              className={styles.stepperBtn}
              onClick={() => changePlayerCount(-1)}
              disabled={playerCount <= RULES.minPlayers}
              aria-label="Giảm số người"
              title="Giảm số người chơi"
            >
              <img
                src="/assets/setup_btn_minus.webp"
                alt="-"
                className={styles.stepperBtnImg}
              />
            </button>

            <div className={styles.numberFrameWrapper}>
              <img
                src="/assets/setup_number_frame_blank.webp"
                alt="Frame"
                className={styles.numberFrameBg}
              />
              <span className={styles.numberDisplayText}>{playerCount}</span>
            </div>

            <button
              className={styles.stepperBtn}
              onClick={() => changePlayerCount(1)}
              disabled={playerCount >= RULES.maxPlayers}
              aria-label="Tăng số người"
              title="Tăng số người chơi"
            >
              <img
                src="/assets/setup_btn_plus.webp"
                alt="+"
                className={styles.stepperBtnImg}
              />
            </button>
          </div>

          <div className={styles.sliderWrapper}>
            <input
              type="range"
              min={RULES.minPlayers}
              max={RULES.maxPlayers}
              value={playerCount}
              onChange={e => setPlayerCountInput(e.target.value)}
              className={styles.stepperSlider}
            />
            <div className={styles.sliderLabels}>
              <span>{RULES.minPlayers} người</span>
              <span>Quản trò: {user?.displayName || 'Khách'}</span>
              <span>{RULES.maxPlayers} người</span>
            </div>
          </div>

          {/* 3. SECTION DANH SÁCH NGƯỜI CHƠI (PRESETS) */}
          <div className={styles.sectionTabHeader}>
            <div className={styles.tabPlate}>PRESETS & PLAYERS</div>
          </div>

          <div className={styles.parchmentCard}>
            <div className={styles.presetBar}>
              <span style={{ fontSize: '11px', color: '#44311a', fontWeight: 'bold' }}>
                DANH SÁCH TÊN ({playerCount})
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  className={styles.presetBtn}
                  onClick={async () => {
                    const presets = await getCloudPresets();
                    handleApplyPresets(presets);
                  }}
                  title="Điền nhanh các tên mẫu vào danh sách"
                >
                  ⚡ Điền mẫu
                </button>
                <button
                  type="button"
                  className={styles.presetBtn}
                  onClick={handleOpenPresetModal}
                  title="Thêm hoặc xoá tên mẫu lưu trữ"
                >
                  ⚙️ Quản lý
                </button>
              </div>
            </div>

            <div className={styles.playerRowsContainer}>
              {names.map((name, i) => (
                <div key={i} className={styles.playerRow}>
                  {avatars[i] ? (
                    <img
                      src={avatars[i]}
                      alt={name || `P${i + 1}`}
                      className={styles.avatarCircle}
                      title="Ảnh đại diện"
                    />
                  ) : (
                    <div className={styles.avatarFallback} title="Người chơi">
                      {name ? name[0].toUpperCase() : (i + 1)}
                    </div>
                  )}

                  <span className={styles.playerIndexBadge}>
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const newNames = [...names];
                      newNames[i] = e.target.value;
                      setNames(newNames);
                    }}
                    placeholder={`Người chơi ${i + 1}`}
                    maxLength={20}
                    className={styles.nameInputParchment}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 4. SECTION PHÂN BỔ VAI TRÒ (ROLES) */}
          <div className={styles.sectionTabHeader}>
            <div className={styles.tabPlate}>ROLES DISTRIBUTION</div>
          </div>

          <div className={styles.parchmentCard}>
            <div className={styles.rolesControlBar}>
              <span style={{ fontSize: '11px', color: '#44311a', fontWeight: 'bold' }}>
                PHÂN VAI ({totalRoles}/{playerCount})
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  className={styles.presetBtn}
                  onClick={handleAutoBalance}
                  title="Tự động chia tỉ lệ vai trò cân bằng theo luật"
                >
                  🎲 Cân bằng
                </button>
                <button
                  type="button"
                  className={styles.presetBtn}
                  onClick={handleResetRoles}
                  title="Đặt lại toàn bộ về 0"
                >
                  ↺ Về 0
                </button>
              </div>
            </div>

            <div className={`${styles.balanceStatus} ${isValid ? styles.balanceValid : styles.balanceInvalid}`}>
              {isValid
                ? `✓ ĐÃ CHIA ĐỦ ${totalRoles}/${playerCount} VAI • HỢP LỆ`
                : totalWolves === 0
                ? '⚠️ CẦN ÍT NHẤT 1 MA SÓI'
                : `⚠️ CHƯA KHỚP SỐ LƯỢNG (${totalRoles}/${playerCount})`}
            </div>

            <div className={styles.rolesGrid}>
              {ROLE_ITEMS.map((role) => (
                <div key={role.id} className={styles.roleItem} title={role.desc}>
                  <div className={styles.roleInfo}>
                    <img
                      src={role.icon}
                      alt={role.name}
                      className={styles.roleIconImg}
                    />
                    <span className={styles.roleNameText}>{role.name}</span>
                  </div>

                  <div className={styles.roleMiniStepper}>
                    <button
                      type="button"
                      className={styles.roleStepBtn}
                      onClick={() => handleRoleChange(role.id, -1)}
                      disabled={!distribution[role.id]}
                    >
                      -
                    </button>
                    <span className={styles.roleCountDisplay}>
                      {distribution[role.id] || 0}
                    </span>
                    <button
                      type="button"
                      className={styles.roleStepBtn}
                      onClick={() => handleRoleChange(role.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5. BOTTOM ACTION BAR (CỐ ĐỊNH Ở ĐÁY) */}
        <div className={styles.bottomActionBar}>
          <button
            className={styles.backBtn}
            onClick={() => navigate('/')}
            aria-label="Back to Home"
            title="Quay lại màn Home"
          >
            <img
              src="/assets/setup_btn_back.webp"
              alt="BACK"
              className={styles.backBtnImg}
            />
          </button>

          <button
            className={styles.dealBtn}
            onClick={handleStart}
            disabled={!isValid}
            aria-label="Deal Roles and Start Game"
            title={isValid ? "Bắt đầu chia bài và vào ván chơi!" : "Vui lòng chia đủ số vai trước khi bắt đầu"}
          >
            <img
              src="/assets/setup_btn_deal.webp"
              alt="DEAL ROLES"
              className={styles.dealBtnImg}
            />
          </button>
        </div>
      </div>

      {/* MODAL QUẢN LÝ TÊN MẪU (PRESET MODAL) */}
      <Modal
        isOpen={showPresetModal}
        onClose={() => setShowPresetModal(false)}
        title="⚙️ QUẢN LÝ DANH SÁCH TÊN MẪU"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
          <form onSubmit={handleAddPreset} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={newPresetName}
              onChange={e => setNewPresetName(e.target.value)}
              placeholder="Thêm tên mới..."
              maxLength={20}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'rgba(5, 7, 14, 0.8)',
                border: '1px solid var(--gold-500)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '13px'
              }}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={isAddingPreset || !newPresetName.trim()}
              style={{ minHeight: '38px', padding: '0 12px', fontSize: '13px' }}
            >
              {isAddingPreset ? '...' : '+ Thêm'}
            </Button>
          </form>

          <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {presetList.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: '12px', textAlign: 'center', padding: '12px' }}>
                Chưa có tên mẫu nào được lưu.
              </div>
            ) : (
              presetList.map(p => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 10px',
                    background: 'rgba(20, 26, 60, 0.6)',
                    borderRadius: '4px',
                    border: '1px solid rgba(201, 162, 74, 0.3)'
                  }}
                >
                  <span style={{ fontSize: '13px', color: 'var(--gold-100)', fontWeight: 600 }}>{p.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDeletePreset(p.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--red-400)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      padding: '2px 6px'
                    }}
                    title="Xoá tên này"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>

          <Button
            variant="secondary"
            fullWidth
            onClick={() => setShowPresetModal(false)}
            style={{ minHeight: '40px' }}
          >
            Đóng
          </Button>
        </div>
      </Modal>
    </div>
  );
}
