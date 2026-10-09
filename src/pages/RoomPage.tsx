import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  subscribeRoom, 
  leaveRoom, 
  closeRoom, 
  addBotToRoom, 
  addBotsUntil, 
  removeBotFromRoom 
} from '../services/roomService';
import type { GameRoom } from '../game/types';
import { Button, Panel, Badge, PlayerTile } from '../components/ui';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [room, setRoom] = useState<GameRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isAddingBot, setIsAddingBot] = useState(false);

  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = subscribeRoom(roomId, (roomData) => {
      if (!roomData) {
        alert('Phòng chơi này đã kết thúc hoặc bị giải tán.');
        navigate('/');
      } else {
        setRoom(roomData);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [roomId, navigate]);

  if (loading) {
    return (
      <div className="screen-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--gold-300)', fontSize: '16px', fontWeight: 600 }}>
          ⏳ Đang kết nối vào phòng chơi...
        </p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="screen-container" style={{ alignItems: 'center', justifyContent: 'center', gap: 'var(--s-4)' }}>
        <Panel>
          <p style={{ margin: 0, textAlign: 'center' }}>Không tìm thấy phòng chơi.</p>
        </Panel>
        <Button variant="primary" onClick={() => navigate('/')}>
          Về Trang Chủ
        </Button>
      </div>
    );
  }

  const isHost = user && room.hostUid === user.uid;
  const members = room.members || [];

  const handleLeave = async () => {
    if (!roomId) return;
    const confirmMsg = isHost 
      ? 'Bạn là Quản trò. Rời phòng sẽ chuyển quyền Quản trò hoặc giải tán phòng nếu không còn ai. Bạn có chắc không?'
      : 'Bạn có chắc chắn muốn rời phòng không?';

    if (window.confirm(confirmMsg)) {
      await leaveRoom(roomId);
      navigate('/');
    }
  };

  const handleClose = async () => {
    if (!roomId) return;
    if (window.confirm('Bạn có chắc muốn giải tán phòng chơi này không?')) {
      await closeRoom(roomId);
      navigate('/');
    }
  };

  const handleStartSetup = () => {
    navigate('/setup', { state: { fromRoom: room } });
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddOneBot = async () => {
    if (!roomId || isAddingBot) return;
    setIsAddingBot(true);
    try {
      await addBotToRoom(roomId);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsAddingBot(false);
    }
  };

  const handleFillBots = async () => {
    if (!roomId || isAddingBot) return;
    setIsAddingBot(true);
    try {
      const target = Math.max(6, members.length + 1);
      await addBotsUntil(roomId, target);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsAddingBot(false);
    }
  };

  const handleRemoveBot = async (botUid?: string) => {
    if (!roomId) return;
    try {
      await removeBotFromRoom(roomId, botUid);
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="screen-container" style={{ gap: 'var(--s-4)' }}>
      {/* HEADER PHÒNG CHỜ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          variant="secondary"
          onClick={handleLeave}
          style={{ minHeight: '44px', padding: '0 var(--s-3)', fontSize: '13px' }}
        >
          ← Rời phòng
        </Button>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            color: 'var(--gold-100)',
            fontFamily: 'var(--font-title)',
            letterSpacing: '0.04em'
          }}>
            {room.name}
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
            Mã: <strong style={{ color: 'var(--gold-300)' }}>#{room.id}</strong>{' '}
            <button
              type="button"
              onClick={copyRoomCode}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--gold-100)',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '2px 4px'
              }}
            >
              {copied ? '✓ Đã chép' : '📋 Chép'}
            </button>
          </div>
        </div>
        <div style={{ width: '60px' }} />
      </div>

      {/* THÔNG TIN PHÒNG & QUẢN TRÒ */}
      <Panel compact>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Quản trò chủ phòng:</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--gold-300)', marginTop: '2px' }}>
              👑 {room.hostName}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Số người tham gia:</div>
            <Badge variant="gold" style={{ marginTop: '2px' }}>
              👥 {members.length}/{room.maxPlayers}
            </Badge>
          </div>
        </div>
      </Panel>

      {/* CÔNG CỤ THÊM BOT (DÀNH CHO QUẢN TRÒ TEST NHANH) */}
      {isHost && (
        <Panel compact>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--gold-300)' }}>
                🤖 Thêm Bot Chơi Thử Nghiệm:
              </span>
              {members.some(m => m.isBot) && (
                <Button
                  variant="ghost"
                  onClick={() => handleRemoveBot()}
                  style={{ minHeight: '32px', padding: '0 var(--s-2)', fontSize: '11px', color: 'var(--red-300)' }}
                  title="Bớt 1 bot"
                >
                  -1 Bot 🗑️
                </Button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
              <Button
                variant="secondary"
                disabled={isAddingBot || members.length >= room.maxPlayers}
                onClick={handleAddOneBot}
                style={{ flex: 1, minHeight: '44px', fontSize: '13px' }}
              >
                +1 Bot 🤖
              </Button>
              <Button
                variant="secondary"
                disabled={isAddingBot || members.length >= room.maxPlayers}
                onClick={handleFillBots}
                style={{ flex: 1, minHeight: '44px', fontSize: '13px', color: 'var(--gold-100)' }}
              >
                ⚡ Thêm Đủ 6
              </Button>
            </div>
          </div>
        </Panel>
      )}

      {/* DANH SÁCH NGƯỜI CHƠI TRONG PHÒNG */}
      <Panel>
        <h3 style={{
          margin: '0 0 var(--s-3) 0',
          fontSize: '15px',
          fontFamily: 'var(--font-title)',
          color: 'var(--gold-100)',
          letterSpacing: '0.04em'
        }}>
          DANH SÁCH NGƯỜI TRONG PHÒNG ({members.length})
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-2)' }}>
          {members.map((m) => (
            <div key={m.uid} style={{ position: 'relative' }}>
              <PlayerTile
                name={m.displayName}
                avatarUrl={m.avatar}
                role={m.isHost ? '👑 Quản trò' : (m.isBot ? '🤖 Bot' : 'Người chơi')}
                badgeLabel={m.isHost ? 'Host' : (m.isBot ? 'Bot' : 'Sẵn sàng')}
                badgeVariant={m.isHost ? 'gold' : (m.isBot ? 'ash' : 'green')}
                isAlive={true}
                layout="grid"
              />
              {isHost && m.isBot && (
                <button
                  type="button"
                  onClick={() => handleRemoveBot(m.uid)}
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    background: 'var(--red-500)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 3,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                  }}
                  title="Xóa bot này"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </Panel>

      {/* BẢNG ĐIỀU KHIỂN HÀNH ĐỘNG */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
        {isHost ? (
          <>
            {/* DUY NHẤT 1 PRIMARY BUTTON TRÊN MÀN HÌNH */}
            <Button
              variant="primary"
              pulse
              fullWidth
              onClick={handleStartSetup}
            >
              🎮 THIẾT LẬP VÁN & CHIA VAI ({members.length} NGƯỜI)
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={handleClose}
            >
              ❌ Giải Tán Phòng
            </Button>
          </>
        ) : (
          <Panel style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>⏳</div>
            <p style={{ margin: 0, color: 'var(--gold-100)', fontSize: '15px', fontWeight: 600 }}>
              Đang đợi Quản trò (<strong>{room.hostName}</strong>) bắt đầu ván...
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '6px 0 0 0' }}>
              Khi Quản trò bắt đầu, ván chơi sẽ được thiết lập với danh sách người chơi trong phòng.
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}
