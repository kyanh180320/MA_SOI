import React, { useState } from 'react';
import {
  Button,
  Panel,
  Modal,
  Badge,
  ProgressBar,
  RoleCard,
  PlayerTile,
  Toast,
  PhaseBanner
} from '../components/ui';
import { PlayerLiveView } from '../components/PlayerLiveView';
import type { Phase, Role } from '../game/types';

export const DevShowcasePage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('p2');
  const [timerProgress, setTimerProgress] = useState(65);
  const [demoPhase, setDemoPhase] = useState<Phase>('night');
  const [demoRound, setDemoRound] = useState<number>(1);
  const [demoMyRole, setDemoMyRole] = useState<Role>('wolf');
  const [demoNightStep, setDemoNightStep] = useState<'guard' | 'wolf' | 'seer' | 'witch' | 'done'>('wolf');
  const [demoOtherWolfVote, setDemoOtherWolfVote] = useState<'p4' | 'p3'>('p4');

  return (
    <div className="screen-container" style={{ gap: 'var(--s-5)' }}>
      {/* HEADER TRANG DEV SHOWCASE */}
      <header style={{ textAlign: 'center', marginTop: 'var(--s-2)' }}>
        <h1 style={{
          fontFamily: 'var(--font-title)',
          fontSize: '24px',
          color: 'var(--gold-300)',
          letterSpacing: '0.06em',
          margin: '0 0 var(--s-1) 0'
        }}>
          GIAO DIỆN GAME MA SÓI
        </h1>
        <p style={{
          margin: 0,
          fontSize: '13px',
          color: 'var(--text-dim)',
          fontFamily: 'var(--font-body)'
        }}>
          Bộ Design Tokens & Components Tactile 3D (Pure CSS)
        </p>
      </header>

      {/* 1. BUTTONS & STATES */}
      <Panel>
        <h2 style={{
          fontFamily: 'var(--font-title)',
          fontSize: '18px',
          color: 'var(--gold-100)',
          marginTop: 0,
          marginBottom: 'var(--s-4)',
          borderBottom: '1px solid rgba(201, 162, 74, 0.2)',
          paddingBottom: 'var(--s-2)'
        }}>
          1. Nút Bấm & Phân Cấp (Buttons)
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
          {/* Primary Button với hiệu ứng pulse */}
          <div>
            <div style={{ fontSize: '12px', color: 'var(--gold-300)', marginBottom: '4px' }}>
              ✦ PRIMARY (Duy nhất 1 nút chính trên màn hình):
            </div>
            <Button variant="primary" pulse fullWidth>
              BẮT ĐẦU VÁN ĐẤU
            </Button>
          </div>

          {/* Secondary Button */}
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>
              ✦ SECONDARY (Hành động phụ):
            </div>
            <Button variant="secondary" fullWidth>
              CÀI ĐẶT BÀN CHƠI
            </Button>
          </div>

          {/* Danger Button */}
          <div>
            <div style={{ fontSize: '12px', color: 'var(--red-300)', marginBottom: '4px' }}>
              ✦ DANGER (Hành động nguy hiểm / Sói):
            </div>
            <Button variant="danger" fullWidth>
              BỎ PHIẾU TREO CỔ
            </Button>
          </div>

          {/* Ghost & Icon Buttons */}
          <div style={{ display: 'flex', gap: 'var(--s-3)', alignItems: 'center', justifyContent: 'space-between' }}>
            <Button variant="ghost">
              Xem Luật Chơi
            </Button>
            <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
              <Button variant="icon" aria-label="Cài đặt">
                ⚙️
              </Button>
              <Button variant="icon" aria-label="Âm thanh">
                🔊
              </Button>
            </div>
          </div>

          {/* Disabled Button */}
          <div>
            <div style={{ fontSize: '12px', color: 'var(--ash)', marginBottom: '4px' }}>
              ✦ DISABLED (Vô hiệu hóa):
            </div>
            <Button variant="primary" disabled fullWidth>
              CHƯA ĐỦ NGƯỜI CHƠI
            </Button>
          </div>
        </div>
      </Panel>

      {/* 2. ROLE CARD (3D TAROT FLIP) */}
      <Panel>
        <h2 style={{
          fontFamily: 'var(--font-title)',
          fontSize: '18px',
          color: 'var(--gold-100)',
          marginTop: 0,
          marginBottom: 'var(--s-4)',
          borderBottom: '1px solid rgba(201, 162, 74, 0.2)',
          paddingBottom: 'var(--s-2)'
        }}>
          2. Thẻ Vai Trò Tarot 3D (Role Card)
        </h2>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--s-3)'
        }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-dim)', textAlign: 'center' }}>
            Chạm vào thẻ bài để lật mặt trước / mặt sau (3D Flip Effect).
          </p>

          <RoleCard
            roleName="MA SÓI ĐẦU ĐÀN"
            teamName="Phe Ma Sói"
            icon="🐺"
            flipped={cardFlipped}
            onFlip={(flipped) => setCardFlipped(flipped)}
          />

          <Button
            variant="secondary"
            onClick={() => setCardFlipped(!cardFlipped)}
            style={{ minHeight: '44px', padding: '0 var(--s-4)', fontSize: '14px' }}
          >
            {cardFlipped ? 'Xem Mặt Sau' : 'Lật Mặt Thẻ'}
          </Button>
        </div>
      </Panel>

      {/* 3. PLAYER TILES (DANH SÁCH NGƯỜI CHƠI) */}
      <Panel>
        <h2 style={{
          fontFamily: 'var(--font-title)',
          fontSize: '18px',
          color: 'var(--gold-100)',
          marginTop: 0,
          marginBottom: 'var(--s-4)',
          borderBottom: '1px solid rgba(201, 162, 74, 0.2)',
          paddingBottom: 'var(--s-2)'
        }}>
          3. Danh Sách Người Chơi (Player Tiles)
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-2)', marginBottom: 'var(--s-4)' }}>
          <PlayerTile
            name="Kỳ Anh"
            role="Bảo Vệ"
            isAlive={true}
            isSelected={selectedPlayerId === 'p1'}
            onClick={() => setSelectedPlayerId('p1')}
            badgeLabel="Bạn"
            badgeVariant="gold"
            layout="grid"
          />

          <PlayerTile
            name="Minh Quân"
            role="Dân Làng"
            isAlive={true}
            isSelected={selectedPlayerId === 'p2'}
            onClick={() => setSelectedPlayerId('p2')}
            badgeLabel="Chọn"
            badgeVariant="green"
            layout="grid"
          />

          <PlayerTile
            name="Thảo Linh"
            role="Nghi phạm"
            isAlive={true}
            votesCount={4}
            isSelected={selectedPlayerId === 'p3'}
            onClick={() => setSelectedPlayerId('p3')}
            layout="grid"
          />

          <PlayerTile
            name="Hoàng Nam"
            role="Tiên Tri"
            isAlive={false}
            isSelected={false}
            onClick={() => setSelectedPlayerId('p4')}
            layout="grid"
          />

          <PlayerTile
            name="Tuấn Kiệt"
            role="Sói"
            isAlive={true}
            isSelected={false}
            onClick={() => setSelectedPlayerId('p5')}
            layout="grid"
          />

          <PlayerTile
            name="Ngọc Hân"
            role="Phù Thủy"
            isAlive={true}
            isSelected={false}
            onClick={() => setSelectedPlayerId('p6')}
            layout="grid"
          />
        </div>
      </Panel>

      {/* 4. PROGRESS BAR & TIMERS */}
      <Panel>
        <h2 style={{
          fontFamily: 'var(--font-title)',
          fontSize: '18px',
          color: 'var(--gold-100)',
          marginTop: 0,
          marginBottom: 'var(--s-4)',
          borderBottom: '1px solid rgba(201, 162, 74, 0.2)',
          paddingBottom: 'var(--s-2)'
        }}>
          4. Thanh Tiến Trình & Đồng Hồ (Progress Bar)
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
          <ProgressBar
            value={timerProgress}
            label="Thời gian thảo luận"
            timeRemaining={`${Math.round((timerProgress / 100) * 60)}s`}
            variant="gold"
          />

          <ProgressBar
            value={25}
            label="Thời gian biểu quyết khẩn cấp"
            timeRemaining="15s"
            variant="danger"
          />

          <div style={{ display: 'flex', gap: 'var(--s-2)', marginTop: 'var(--s-1)' }}>
            <Button
              variant="secondary"
              onClick={() => setTimerProgress((p) => Math.max(0, p - 15))}
              style={{ flex: 1, minHeight: '44px', fontSize: '13px' }}
            >
              -15s
            </Button>
            <Button
              variant="secondary"
              onClick={() => setTimerProgress((p) => Math.min(100, p + 15))}
              style={{ flex: 1, minHeight: '44px', fontSize: '13px' }}
            >
              +15s
            </Button>
          </div>
        </div>
      </Panel>

      {/* 5. PHASE BANNERS */}
      <Panel>
        <h2 style={{
          fontFamily: 'var(--font-title)',
          fontSize: '18px',
          color: 'var(--gold-100)',
          marginTop: 0,
          marginBottom: 'var(--s-4)',
          borderBottom: '1px solid rgba(201, 162, 74, 0.2)',
          paddingBottom: 'var(--s-2)'
        }}>
          5. Banners Đổi Pha (Phase Banners)
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
          <PhaseBanner
            phase="night"
            title="ĐÊM THỨ 2"
            subtitle="Mọi người hãy nhắm mắt đi ngủ..."
          />

          <PhaseBanner
            phase="day"
            title="NGÀY THỨ 2"
            subtitle="Dân làng thức giấc, có 1 người bị hạ sát"
          />

          <PhaseBanner
            phase="vote"
            title="BỎ PHIẾU TREO CỔ"
            subtitle="Chọn người bạn nghi ngờ là Ma Sói"
          />
        </div>
      </Panel>

      {/* 6. BADGES & TOASTS */}
      <Panel>
        <h2 style={{
          fontFamily: 'var(--font-title)',
          fontSize: '18px',
          color: 'var(--gold-100)',
          marginTop: 0,
          marginBottom: 'var(--s-4)',
          borderBottom: '1px solid rgba(201, 162, 74, 0.2)',
          paddingBottom: 'var(--s-2)'
        }}>
          6. Huy Hiệu (Badges) & Thông Báo (Toasts)
        </h2>

        <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap', marginBottom: 'var(--s-3)' }}>
          <Badge variant="red">3 Phiếu</Badge>
          <Badge variant="gold">Phòng 102</Badge>
          <Badge variant="green">Sống sót</Badge>
          <Badge variant="ash">Đã chết</Badge>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
          <Toast
            variant="info"
            message="Đến lượt Tiên Tri chọn người để soi vai trò"
          />
          <Toast
            variant="danger"
            message="Tiếng hú vang lên từ phía rừng sâu... Sói đang chọn mồi"
          />
          <Toast
            variant="success"
            message="Bảo vệ đã bảo vệ thành công mục tiêu đêm nay!"
          />
        </div>
      </Panel>

      {/* 7. MODAL DIALOG DEMO */}
      <Panel>
        <h2 style={{
          fontFamily: 'var(--font-title)',
          fontSize: '18px',
          color: 'var(--gold-100)',
          marginTop: 0,
          marginBottom: 'var(--s-4)',
          borderBottom: '1px solid rgba(201, 162, 74, 0.2)',
          paddingBottom: 'var(--s-2)'
        }}>
          7. Hộp Thoại (Modal Dialog)
        </h2>

        <Button variant="secondary" fullWidth onClick={() => setModalOpen(true)}>
          MỞ MODAL XÁC NHẬN
        </Button>

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="XÁC NHẬN BỎ PHIẾU"
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Hủy bỏ
              </Button>
              <Button variant="danger" onClick={() => setModalOpen(false)}>
                Xác nhận treo cổ
              </Button>
            </>
          }
        >
          <p style={{ margin: 0, color: 'var(--text)' }}>
            Bạn đang chọn bỏ phiếu cho người chơi <strong>Minh Quân</strong>. Hành động này không thể hoàn tác sau khi hết thời gian đếm ngược.
          </p>
        </Modal>
      </Panel>

      {/* 8. THỰC TẾ: GIAO DIỆN NGƯỜI CHƠI ONLINE (LÁ BÀI ÚP & THANH TIẾN TRÌNH ROUND) */}
      <Panel>
        <h2 style={{
          fontFamily: 'var(--font-title)',
          fontSize: '18px',
          color: 'var(--gold-100)',
          marginTop: 0,
          marginBottom: 'var(--s-2)',
          borderBottom: '1px solid rgba(201, 162, 74, 0.2)',
          paddingBottom: 'var(--s-2)'
        }}>
          8. Màn Hình Người Chơi Online (Thực Tế)
        </h2>
        <p style={{ margin: '0 0 var(--s-3) 0', fontSize: '13px', color: 'var(--text-dim)' }}>
          Mô phỏng trải nghiệm người chơi vào phòng (không phải host): khi ván bắt đầu, lá bài bí mật sinh ra ở chế độ ÚP kèm hiệu ứng phát sáng. Người chơi chạm để lật mở, theo dõi thanh tiến trình Round và danh sách 3 cột người chơi.
        </p>

        {/* BỘ ĐIỀU KHIỂN TEST VÒNG & GIAI ĐOẠN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)', marginBottom: 'var(--s-4)' }}>
          <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--gold-300)', fontWeight: 600 }}>Giai đoạn:</span>
            <Button
              variant={demoPhase === 'night' ? 'primary' : 'secondary'}
              onClick={() => setDemoPhase('night')}
              style={{ minHeight: '32px', padding: '0 var(--s-2)', fontSize: '11px' }}
            >
              🌙 Ban Đêm
            </Button>
            <Button
              variant={demoPhase === 'day' ? 'primary' : 'secondary'}
              onClick={() => setDemoPhase('day')}
              style={{ minHeight: '32px', padding: '0 var(--s-2)', fontSize: '11px' }}
            >
              ☀️ Ban Ngày
            </Button>
            <Button
              variant={demoPhase === 'vote' ? 'primary' : 'secondary'}
              onClick={() => setDemoPhase('vote')}
              style={{ minHeight: '32px', padding: '0 var(--s-2)', fontSize: '11px' }}
            >
              ⚖️ Bỏ Phiếu
            </Button>
            <Button
              variant={demoPhase === 'ended' ? 'primary' : 'secondary'}
              onClick={() => setDemoPhase('ended')}
              style={{ minHeight: '32px', padding: '0 var(--s-2)', fontSize: '11px' }}
            >
              🏁 Kết Thúc
            </Button>
            <Button
              variant="ghost"
              onClick={() => setDemoRound(r => (r % 3) + 1)}
              style={{ minHeight: '32px', padding: '0 var(--s-2)', fontSize: '11px', color: 'var(--gold-300)' }}
            >
              ⏳ Đổi Vòng {demoRound} → {(demoRound % 3) + 1}
            </Button>
          </div>

          {/* CHỌN ROLE ĐỂ TEST THAO TÁC */}
          <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--gold-300)', fontWeight: 600 }}>Role của bạn:</span>
            {[
              { r: 'wolf' as Role, label: '🐺 Sói thường' },
              { r: 'wolf_demon' as Role, label: '😈 Sói quỷ' },
              { r: 'guard' as Role, label: '🛡️ Bảo vệ' },
              { r: 'seer' as Role, label: '🔮 Tiên tri' },
              { r: 'witch' as Role, label: '🧪 Phù thủy' },
              { r: 'villager' as Role, label: '👨‍🌾 Dân làng' }
            ].map(item => (
              <Button
                key={item.r}
                variant={demoMyRole === item.r ? 'primary' : 'secondary'}
                onClick={() => setDemoMyRole(item.r)}
                style={{ minHeight: '30px', padding: '0 8px', fontSize: '11px' }}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {/* CHỌN VAI TRÒ ĐANG ĐƯỢC GỌI TRONG ĐÊM */}
          {demoPhase === 'night' && (
            <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--gold-300)', fontWeight: 600 }}>Thanh tiến trình gọi:</span>
              {[
                { step: 'guard' as const, label: '🛡️ Bảo Vệ' },
                { step: 'wolf' as const, label: '🐺 Ma Sói' },
                { step: 'seer' as const, label: '🔮 Tiên Tri' },
                { step: 'witch' as const, label: '🧪 Phù Thủy' },
                { step: 'done' as const, label: '✨ Xong Đêm' }
              ].map(s => (
                <Button
                  key={s.step}
                  variant={demoNightStep === s.step ? 'primary' : 'secondary'}
                  onClick={() => setDemoNightStep(s.step)}
                  style={{ minHeight: '30px', padding: '0 8px', fontSize: '11px' }}
                >
                  {s.label}
                </Button>
              ))}

              {demoNightStep === 'wolf' && demoMyRole === 'wolf' && (
                <Button
                  variant="ghost"
                  onClick={() => setDemoOtherWolfVote(prev => prev === 'p4' ? 'p3' : 'p4')}
                  style={{ minHeight: '30px', padding: '0 8px', fontSize: '11px', color: demoOtherWolfVote === 'p4' ? 'var(--green-400)' : 'var(--red-300)' }}
                >
                  {demoOtherWolfVote === 'p4' ? '🐺 Sói 2: Đang trùng vote (Đồng thuận)' : '🐺 Sói 2: Đang chọn khác (Bất đồng)'}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* CONTAINER PREVIEW PLAYER LIVE VIEW */}
        <div style={{
          border: '2px dashed rgba(201, 162, 74, 0.4)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--s-3)',
          background: 'rgba(11, 16, 38, 0.5)'
        }}>
          <PlayerLiveView
            room={{
              id: 'MS-9999',
              name: 'Phòng Ma Sói Online #9999',
              hostUid: 'host_001',
              hostName: 'Admin Quản Trò',
              maxPlayers: 6,
              status: demoPhase === 'ended' ? 'ended' : 'playing',
              createdAt: Date.now(),
              members: [],
              gameData: {
                id: 'game_demo',
                createdAt: Date.now(),
                phase: demoPhase,
                rounds: [{
                  number: demoRound,
                  guardProtectTarget: demoNightStep === 'guard' ? undefined : 'p3',
                  wolfTarget: demoNightStep === 'guard' || demoNightStep === 'wolf' ? undefined : 'p4',
                  wolfTargets: demoNightStep === 'guard' || demoNightStep === 'wolf' ? undefined : ['p4'],
                  wolfVotes: {
                    mock_me: ['p4'],
                    p6: [demoOtherWolfVote]
                  },
                  seerCheck: demoNightStep === 'guard' || demoNightStep === 'wolf' || demoNightStep === 'seer' ? undefined : { target: 'p2', isWolf: true },
                  witchSaved: demoNightStep === 'done' ? true : undefined,
                  nightDeaths: demoPhase !== 'night' ? ['p4'] : []
                }],
                witchItems: { saveLeft: 1, poisonLeft: 1 },
                winner: demoPhase === 'ended' ? 'villager' : undefined,
                players: [
                  { id: 'mock_me', name: 'Kỳ Anh', role: demoMyRole, alive: true, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=KyAnh' },
                  { id: 'p2', name: 'Minh Quân', role: 'villager', alive: true, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=MinhQuan' },
                  { id: 'p3', name: 'Thanh Trúc', role: 'guard', alive: true, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ThanhTruc' },
                  { id: 'p4', name: 'Gia Bảo', role: 'villager', alive: demoPhase === 'night', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=GiaBao' },
                  { id: 'p5', name: 'Hải Yến', role: 'witch', alive: true, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=HaiYen' },
                  { id: 'p6', name: 'Đức Anh', role: 'wolf', alive: true, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=DucAnh' }
                ]
              }
            }}
            user={{
              uid: 'mock_me',
              displayName: 'Kỳ Anh',
              email: 'user@example.com'
            }}
            onLeave={() => alert('Thử nghiệm: Người chơi bấm Rời phòng')}
          />
        </div>
      </Panel>

      {/* 9. KIỂM THỬ PHÔNG CHỮ & FONT DỰ PHÒNG KHI MẤT MẠNG */}
      <Panel>
        <h2 style={{
          fontFamily: 'var(--font-title)',
          fontSize: '18px',
          color: 'var(--gold-100)',
          marginTop: 0,
          marginBottom: 'var(--s-3)',
          borderBottom: '1px solid rgba(201, 162, 74, 0.2)',
          paddingBottom: 'var(--s-2)'
        }}>
          9. Thử Nghiệm Typography & Font Dự Phòng (Offline Fallback)
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: 'var(--s-4)', lineHeight: 1.5 }}>
          Kiểm tra hiển thị dấu tiếng Việt (Ộ, Đ, Ê, Ố, Ợ, Ă) cho các cụm từ quan trọng của game, đảm bảo không bị lỗi font dù tải trực tiếp từ Google Fonts hay khi mất mạng (dùng font hệ thống).
        </p>

        {/* Cụm từ cần test */}
        {['HỘI ĐỒNG PHÁN XÉT', 'ĐÊM XUỐNG', 'THỢ SĂN'].map((phrase) => (
          <div 
            key={phrase} 
            style={{ 
              marginBottom: 'var(--s-4)', 
              padding: 'var(--s-3)', 
              background: 'rgba(0, 0, 0, 0.25)', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(201, 162, 74, 0.15)'
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--gold-300)', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.05em' }}>
              ✦ TEST CASE: "{phrase}"
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-2)' }}>
              {/* Cột 1: Playfair Display vs Fallback Serif */}
              <div style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                  Playfair Display (Online)
                </div>
                <div style={{ fontFamily: '"Playfair Display", serif', fontSize: '16px', fontWeight: 700, color: 'var(--gold-100)', letterSpacing: '0.04em' }}>
                  {phrase}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--ash)', marginTop: '8px', marginBottom: '2px' }}>
                  Fallback: Georgia / Times
                </div>
                <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '15px', fontWeight: 700, color: 'var(--text)', opacity: 0.85 }}>
                  {phrase}
                </div>
              </div>

              {/* Cột 2: Be Vietnam Pro vs Fallback Sans-serif */}
              <div style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                  Be Vietnam Pro (Online)
                </div>
                <div style={{ fontFamily: '"Be Vietnam Pro", sans-serif', fontSize: '15px', fontWeight: 700, color: 'var(--text)', letterSpacing: '0.02em' }}>
                  {phrase}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--ash)', marginTop: '8px', marginBottom: '2px' }}>
                  Fallback: system-ui / sans-serif
                </div>
                <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '15px', fontWeight: 700, color: 'var(--text-dim)', opacity: 0.85 }}>
                  {phrase}
                </div>
              </div>
            </div>
          </div>
        ))}
      </Panel>

      {/* FOOTER */}
      <footer style={{
        textAlign: 'center',
        padding: 'var(--s-3) 0',
        fontSize: '12px',
        color: 'var(--text-dim)'
      }}>
        Thiết kế theo chuẩn Game UI Tokens & Depth Layers
      </footer>
    </div>
  );
};

export default DevShowcasePage;
