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

// SVG Ruy băng "VÁN MỚI" chuẩn Gothic với đuôi én hai bên
function SvgRibbon() {
  return (
    <svg viewBox="0 0 400 70" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.ribbonSvg}>
      <defs>
        <linearGradient id="ribbonBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8d6837" />
          <stop offset="45%" stopColor="#674b24" />
          <stop offset="100%" stopColor="#3d2a13" />
        </linearGradient>
        <linearGradient id="ribbonTailGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#614421" />
          <stop offset="100%" stopColor="#2c1d0e" />
        </linearGradient>
      </defs>
      {/* Đuôi én bên trái */}
      <path d="M48 48 L10 56 L26 35 L10 14 L48 22 Z" fill="url(#ribbonTailGrad)" stroke="#c49e5d" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Đuôi én bên phải */}
      <path d="M352 48 L390 56 L374 35 L390 14 L352 22 Z" fill="url(#ribbonTailGrad)" stroke="#c49e5d" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Nếp gấp 3D */}
      <polygon points="48,22 48,48 60,35" fill="#1b1208" />
      <polygon points="352,22 352,48 340,35" fill="#1b1208" />
      {/* Thân ruy băng chính cuộn cong */}
      <path d="M44 14 Q200 4 356 14 L350 54 Q200 64 50 54 Z" fill="url(#ribbonBodyGrad)" stroke="#eed79b" strokeWidth="2" strokeLinejoin="round" />
      {/* Viền chỉ vàng hoàng gia */}
      <path d="M50 18 Q200 9 350 18 M346 50 Q200 59 54 50" stroke="#f6e3a1" strokeWidth="1.2" strokeDasharray="6 3" opacity="0.75" />
    </svg>
  );
}

// Viên ngọc Ruby SVG hình thoi đính trên nút
function SvgRubyGem({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <radialGradient id="rubyShineGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ff7b91" />
          <stop offset="45%" stopColor="#cc1835" />
          <stop offset="100%" stopColor="#590513" />
        </radialGradient>
      </defs>
      <polygon points="10,1 19,10 10,19 1,10" fill="#2d1c07" stroke="#c9a24a" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points="10,3 17,10 10,17 3,10" fill="url(#rubyShineGrad)" />
      <polygon points="10,3 10,10 3,10" fill="#ffa8b8" opacity="0.45" />
    </svg>
  );
}

// Hoa văn góc tấm giấy da
function SvgCornerFlourish({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M2 2 L12 2 Q5 5 5 12 L2 12 Z" fill="#6d5332" />
      <path d="M2 2 Q14 2 14 14 Q2 14 2 2 Z" stroke="#8e734c" strokeWidth="1" fill="none" opacity="0.7" />
      <circle cx="5" cy="5" r="1.5" fill="#c9a24a" />
    </svg>
  );
}

// Cài ngọc Ruby trên đỉnh nút "CHIA BÀI & BẮT ĐẦU"
function SvgRubyBroochTop({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 26" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <radialGradient id="broochRubyGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ff7388" />
          <stop offset="50%" stopColor="#c4142f" />
          <stop offset="100%" stopColor="#4f030e" />
        </radialGradient>
      </defs>
      <path d="M2 20 Q8 12 16 14 Q24 12 30 20 Q22 15 16 17 Q10 15 2 20 Z" fill="#b38734" stroke="#e5c378" strokeWidth="0.8" />
      <polygon points="16,2 24,7 24,18 16,23 8,18 8,7" fill="#2d1c07" stroke="#e5c378" strokeWidth="1.2" />
      <polygon points="16,4 22,8 22,17 16,21 10,17 10,8" fill="url(#broochRubyGrad)" />
      <polygon points="16,4 16,12 10,8" fill="#ffaec0" opacity="0.5" />
    </svg>
  );
}

// Icon bóng người Silhouette đại diện avatar
function SvgAvatarSilhouette() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={styles.avatarSilhouette}>
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
  );
}

const ROLE_ITEMS: { id: Role; name: string; icon: string; desc: string }[] = [
  { id: 'wolf', name: 'MA SÓI', icon: '/assets/icons/icon_wolf_paw.webp', desc: 'Phe Sói cắn người mỗi đêm' },
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

  // Căn chỉnh phân vai ban đầu
  useEffect(() => {
    if (playerCount >= RULES.minPlayers && playerCount <= RULES.maxPlayers) {
      setDistribution(getRoleDistribution(playerCount, { randomize: true }));
    }
  }, []);

  // Cập nhật mảng tên & avatar theo số lượng người
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
    <div className={styles.setupWrapper}>
      <div className={styles.setupFrame}>
        {/* VÙNG CUỘN NỘI DUNG CHÍNH */}
        <div className={styles.contentArea}>
          {/* 1. RUY BĂNG TIÊU ĐỀ: "VÁN MỚI" BẰNG SVG & CODE */}
          <div className={styles.ribbonWrapper}>
            <SvgRibbon />
            <span className={styles.ribbonText}>VÁN MỚI</span>
          </div>

          {/* 2. SỐ LƯỢNG NGƯỜI CHƠI (STEPPER VÁT GÓC + SVG GEMS) */}
          <div className={styles.tabPlateWrapper}>
            <div className={styles.tabPlate}>
              <span className={styles.tabPlateTitle}>SỐ NGƯỜI CHƠI</span>
            </div>
          </div>

          <div className={styles.stepperRow}>
            {/* Nút - vuông vát góc kèm ngọc Ruby bên trái */}
            <button
              type="button"
              className={styles.stepperBevelBtn}
              onClick={() => changePlayerCount(-1)}
              disabled={playerCount <= RULES.minPlayers}
              aria-label="Giảm số người"
              title="Giảm số người chơi"
            >
              <SvgRubyGem className={styles.sideRubyLeft} />
              <span className={styles.stepperSign}>−</span>
            </button>

            {/* Khung số giấy da cổ với 4 góc hoa văn SVG */}
            <div className={styles.numberParchmentBox}>
              <SvgCornerFlourish className={`${styles.numberCornerFlourish} ${styles.numFlourishTL}`} />
              <SvgCornerFlourish className={`${styles.numberCornerFlourish} ${styles.numFlourishTR}`} />
              <SvgCornerFlourish className={`${styles.numberCornerFlourish} ${styles.numFlourishBL}`} />
              <SvgCornerFlourish className={`${styles.numberCornerFlourish} ${styles.numFlourishBR}`} />
              <span className={styles.numberDisplay}>{playerCount}</span>
            </div>

            {/* Nút + vuông vát góc kèm ngọc Ruby bên phải */}
            <button
              type="button"
              className={`${styles.stepperBevelBtn} ${styles.stepperBtnPlus}`}
              onClick={() => changePlayerCount(1)}
              disabled={playerCount >= RULES.maxPlayers}
              aria-label="Tăng số người"
              title="Tăng số người chơi"
            >
              <SvgRubyGem className={styles.sideRubyRight} />
              <span className={styles.stepperSign}>+</span>
            </button>
          </div>

          {/* Thanh trượt số người rãnh đá & nút trượt hình ngọc */}
          <div className={styles.sliderBox}>
            <input
              type="range"
              min={RULES.minPlayers}
              max={RULES.maxPlayers}
              value={playerCount}
              onChange={e => setPlayerCountInput(e.target.value)}
              className={styles.gothicSlider}
            />
            <div className={styles.sliderMetaLabels}>
              <span>{RULES.minPlayers} người</span>
              <span>Quản trò: {user?.displayName || 'Khách (Offline)'}</span>
              <span>{RULES.maxPlayers} người</span>
            </div>
          </div>

          {/* 3. DANH SÁCH TÊN NGƯỜI CHƠI (PARCHMENT PANEL 2 LỚP VIỀN) */}
          <div className={styles.tabPlateWrapper}>
            <div className={styles.tabPlate}>
              <span className={styles.tabPlateTitle}>DANH SÁCH TÊN</span>
            </div>
          </div>

          <div className={styles.parchmentPanel}>
            <SvgCornerFlourish className={`${styles.panelFlourishTL}`} />
            <SvgCornerFlourish className={`${styles.panelFlourishTR}`} />
            <SvgCornerFlourish className={`${styles.panelFlourishBL}`} />
            <SvgCornerFlourish className={`${styles.panelFlourishBR}`} />

            <div className={styles.presetBar}>
              <span className={styles.presetInfoTitle}>
                NGƯỜI CHƠI ({playerCount})
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className={styles.presetActionBtn}
                  onClick={async () => {
                    const presets = await getCloudPresets();
                    handleApplyPresets(presets);
                  }}
                  title="Tự động điền danh sách tên mẫu"
                >
                  ⚡ Điền mẫu
                </button>
                <button
                  type="button"
                  className={styles.presetActionBtn}
                  onClick={handleOpenPresetModal}
                  title="Mở bảng quản lý danh sách tên"
                >
                  ⚙️ Quản lý
                </button>
              </div>
            </div>

            <div className={styles.playerScrollList}>
              {names.map((name, i) => (
                <div key={i} className={styles.playerRowItem}>
                  {/* Vòng tròn avatar placeholder tròn viền đồng (Không chứa số) */}
                  <div className={styles.avatarRing} title="Ảnh đại diện">
                    {avatars[i] ? (
                      <img src={avatars[i]} alt={name || `P${i + 1}`} className={styles.avatarImage} />
                    ) : (
                      <SvgAvatarSilhouette />
                    )}
                  </div>

                  {/* Số thứ tự duy nhất (01, 02... không lặp lại) */}
                  <span className={styles.playerIndexTag}>
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  {/* Ô nhập tên nền giấy da, viền đồng, chữ mực nâu đậm */}
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
                    className={styles.parchmentInput}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 4. PHÂN BỔ VAI TRÒ (LƯỚI 2 CỘT CHUẨN MOBILE 360PX/390PX) */}
          <div className={styles.tabPlateWrapper}>
            <div className={styles.tabPlate}>
              <span className={styles.tabPlateTitle}>PHÂN BỔ VAI TRÒ</span>
            </div>
          </div>

          <div className={styles.parchmentPanel}>
            <SvgCornerFlourish className={`${styles.panelFlourishTL}`} />
            <SvgCornerFlourish className={`${styles.panelFlourishTR}`} />
            <SvgCornerFlourish className={`${styles.panelFlourishBL}`} />
            <SvgCornerFlourish className={`${styles.panelFlourishBR}`} />

            <div className={styles.rolesTopBar}>
              <span className={styles.presetInfoTitle}>
                TỔNG SỐ VAI: {totalRoles}/{playerCount}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className={styles.presetActionBtn}
                  onClick={handleAutoBalance}
                  title="Tự động cân bằng tỉ lệ vai trò"
                >
                  🎲 Cân bằng
                </button>
                <button
                  type="button"
                  className={styles.presetActionBtn}
                  onClick={handleResetRoles}
                  title="Đặt lại toàn bộ vai về 0"
                >
                  ↺ Về 0
                </button>
              </div>
            </div>

            {/* Hộp trạng thái dùng tokens */}
            <div className={`${styles.rolesStatusBanner} ${isValid ? styles.statusValid : styles.statusInvalid}`}>
              {isValid
                ? `✓ ĐÃ CHIA ĐỦ ${totalRoles}/${playerCount} VAI • HỢP LỆ`
                : totalWolves === 0
                ? '⚠️ CẦN ÍT NHẤT 1 MA SÓI TRONG VÁN'
                : `⚠️ CHƯA KHỚP SỐ LƯỢNG (${totalRoles}/${playerCount} VAI)`}
            </div>

            {/* Lưới 2 cột: Mỗi ô gồm icon, tên dòng riêng, dưới là stepper */}
            <div className={styles.rolesGrid}>
              {ROLE_ITEMS.map((role) => (
                <div key={role.id} className={styles.roleCardCell} title={role.desc}>
                  <div className={styles.roleHeaderRow}>
                    <img
                      src={role.icon}
                      alt={role.name}
                      className={styles.roleMedallionIcon}
                    />
                    <span className={styles.roleNameText}>{role.name}</span>
                  </div>

                  <div className={styles.roleMiniStepper}>
                    <button
                      type="button"
                      className={styles.roleMiniBtn}
                      onClick={() => handleRoleChange(role.id, -1)}
                      disabled={!distribution[role.id]}
                      aria-label={`Giảm ${role.name}`}
                    >
                      −
                    </button>
                    <span className={styles.roleCountNum}>
                      {distribution[role.id] || 0}
                    </span>
                    <button
                      type="button"
                      className={styles.roleMiniBtn}
                      onClick={() => handleRoleChange(role.id, 1)}
                      aria-label={`Tăng ${role.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5. HAI NÚT ĐÁY CỐ ĐỊNH (QUAY LẠI / CHIA BÀI) - CSS THUẦN THEO RULE-UI & TOKENS */}
        <div className={styles.bottomStickyBar}>
          <button
            type="button"
            className={styles.gothicStoneBtn}
            onClick={() => navigate('/')}
            title="Quay lại màn Home"
          >
            ← QUAY LẠI
          </button>

          <button
            type="button"
            className={styles.gothicRubyBtn}
            onClick={handleStart}
            disabled={!isValid}
            title={isValid ? "Chia bài bí mật và bắt đầu ván đấu" : "Vui lòng phân đủ số vai trước khi bắt đầu"}
          >
            <SvgRubyBroochTop className={styles.rubyBroochTop} />
            CHIA BÀI & BẮT ĐẦU
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
