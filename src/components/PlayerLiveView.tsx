import React, { useState } from 'react';
import type { GameRoom, AppUser, Role, Player } from '../game/types';
import { Button, Panel, Badge, RoleCard, PlayerTile } from './ui';
import styles from './PlayerLiveView.module.css';

interface PlayerLiveViewProps {
  room: GameRoom;
  user: AppUser | null;
  onLeave: () => void;
}

const ROLE_DETAILS: Record<Role, {
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
    icon: "👁️",
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
    description: "Khi bạn bị loại khỏi cuộc chơi (dù bị sói cắn hay bị dân làng bỏ phiếu treo cổ), bạn có quyền bắn 1 phát súng kéo theo 1 người bất kỳ chết cùng.",
    actionHint: "🏹 Khi bị chết: Chọn 1 người bất kỳ để bắn hạ cùng bạn."
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

const PHASE_STEPS = [
  { id: 'night', label: 'Ban Đêm', icon: '🌙' },
  { id: 'day', label: 'Ban Ngày', icon: '☀️' },
  { id: 'vote', label: 'Bỏ Phiếu', icon: '⚖️' },
  { id: 'ended', label: 'Kết Quả', icon: '☠️' }
];

export const PlayerLiveView: React.FC<PlayerLiveViewProps> = ({ room, user, onLeave }) => {
  const game = room.gameData;
  const [isFlipped, setIsFlipped] = useState(false);

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
  const roundNumber = currentRound ? currentRound.number : 1;
  const currentPhase = game.phase;

  // Tìm người chơi ứng với tài khoản user hiện tại
  const myPlayer: Player | undefined = user 
    ? game.players.find(p => p.id === user.uid)
    : undefined;

  const roleInfo = myPlayer ? ROLE_DETAILS[myPlayer.role] : null;
  const alivePlayers = game.players.filter(p => p.alive);

  // Tính tiến độ stepper
  const currentStepIndex = PHASE_STEPS.findIndex(s => s.id === currentPhase);
  const progressPercent = currentStepIndex >= 0 
    ? (currentStepIndex / (PHASE_STEPS.length - 1)) * 100 
    : 0;

  const handleToggleFlip = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(25);
    }
    setIsFlipped(prev => !prev);
  };

  // Tìm danh sách nạn nhân đêm qua nếu ở phase ngày/bỏ phiếu
  const nightVictims = currentRound?.nightDeaths?.map(id => {
    const victim = game.players.find(p => p.id === id);
    return victim ? victim.name : id;
  }) || [];

  return (
    <div className={styles.container}>
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

      {/* 2. THANH TIẾN TRÌNH ROUND & GIAI ĐOẠN HIỆN TẠI */}
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
            {currentPhase === 'night' && '🌙 Giai Đoạn Đêm'}
            {currentPhase === 'day' && '☀️ Ban Ngày'}
            {currentPhase === 'vote' && '⚖️ Bỏ Phiếu Treo Cổ'}
            {currentPhase === 'ended' && '🏁 Trận Đấu Kết Thúc'}
          </div>
        </div>

        {/* STEPPER TIẾN ĐỘ GIAI ĐOẠN */}
        <div className={styles.stepper}>
          <div className={styles.stepLine}>
            <div 
              className={styles.stepLineProgress} 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>

          {PHASE_STEPS.map((step, idx) => {
            const isPassed = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;

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

        {/* MÔ TẢ GIAI ĐOẠN CHI TIẾT */}
        {currentPhase === 'night' && (
          <div className={styles.phaseCallout}>
            🌙 <strong>Cả làng đang ngủ:</strong> Quản trò đang bí mật gọi các vai trò thức dậy thực hiện chức năng. Vui lòng giữ trật tự!
          </div>
        )}

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

      {/* 3. THẺ BÀI BÍ MẬT DÀNH CHO NGƯỜI CHƠI (CHẾ ĐỘ ÚP & HIỆU ỨNG LẬT) */}
      {myPlayer && roleInfo ? (
        <div className={styles.cardSection}>
          <div className={styles.cardHint}>
            <div className={styles.cardHintTitle}>
              {isFlipped ? '👁️ VAI TRÒ BÍ MẬT CỦA BẠN' : '✦ THẺ BÀI BÍ MẬT'}
            </div>
            <div className={styles.cardHintSub}>
              {isFlipped 
                ? 'Chạm vào thẻ bài hoặc nút bên dưới để úp lại (bảo mật khi chơi)'
                : 'Chạm vào lá bài để mở lật xem thân phận của bạn'}
            </div>
          </div>

          {/* LÁ BÀI 3D VỚI HIỆU ỨNG XUẤT HIỆN & CHẾ ĐỘ ÚP */}
          <div 
            className={styles.cardWrapper} 
            onClick={handleToggleFlip}
            title={isFlipped ? "Chạm để úp thẻ lại" : "Chạm để lật mở thẻ"}
          >
            <RoleCard
              roleName={roleInfo.name}
              teamName={roleInfo.team}
              icon={roleInfo.icon}
              faceDown={true}
              flipped={isFlipped}
              spawnAnimation={true}
              interactive={false}
            />
          </div>

          {/* NÚT THAO TÁC ÚP / MỞ TIỆN LỢI */}
          <Button
            variant={isFlipped ? "secondary" : "primary"}
            pulse={!isFlipped}
            onClick={handleToggleFlip}
            style={{ minHeight: '44px', width: '220px', fontSize: '13px' }}
          >
            {isFlipped ? '🔒 ÚP BÀI LẠI (GIẤU ĐI)' : '👁️ MỞ LẬT XEM VAI TRÒ'}
          </Button>

          {/* BẢNG GIẢI THÍCH CHI TIẾT VAI TRÒ KHI ĐÃ LẬT MỞ */}
          {isFlipped && (
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
          )}
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

      {/* 4. TRẠNG THÁI SỐNG / CHẾT CỦA BẢN THÂN */}
      {myPlayer && (
        <div className={styles.playerStatusBox}>
          <div className={styles.playerInfo}>
            {myPlayer.avatar ? (
              <img src={myPlayer.avatar} alt={myPlayer.name} className={styles.playerAvatar} />
            ) : (
              <div className={styles.playerAvatar} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                👤
              </div>
            )}
            <div>
              <div className={styles.playerName}>{myPlayer.name} (Bạn)</div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                {myPlayer.alive ? 'Đang tham gia ván đấu' : 'Đã bị loại khỏi ván'}
              </div>
            </div>
          </div>

          <Badge variant={myPlayer.alive ? 'green' : 'ash'}>
            {myPlayer.alive ? '💚 BẠN CÒN SỐNG' : '☠️ ĐÃ BỊ LOẠI'}
          </Badge>
        </div>
      )}

      {/* 5. TÌNH HÌNH CẢ PHÒNG (LƯỚI 3 CỘT ĐÚNG TIÊU CHUẨN MOBILE) */}
      <Panel>
        <div className={styles.gridTitle}>
          <span>TÌNH HÌNH NGƯỜI CHƠI</span>
          <Badge variant="gold">
            {alivePlayers.length}/{game.players.length} Còn sống
          </Badge>
        </div>

        <div className={styles.playersGrid}>
          {game.players.map((p) => {
            const isMe = user && p.id === user.uid;
            return (
              <PlayerTile
                key={p.id}
                name={p.name + (isMe ? ' (Bạn)' : '')}
                avatarUrl={p.avatar}
                role={p.alive ? 'Đang chơi' : 'Đã chết ☠️'}
                badgeLabel={p.alive ? 'Sống' : 'Chết'}
                badgeVariant={p.alive ? 'green' : 'ash'}
                isAlive={p.alive}
                layout="grid"
              />
            );
          })}
        </div>
      </Panel>
    </div>
  );
};

export default PlayerLiveView;
