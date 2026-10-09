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
        // Phòng đã bị giải tán hoặc không tồn tại
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
      <div className="container" style={{ textAlign: 'center', paddingTop: '60px' }}>
        <p>Đang tải thông tin phòng...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '60px' }}>
        <p>Không tìm thấy phòng chơi.</p>
        <button className="btn-primary" onClick={() => navigate('/')}>Về trang chủ</button>
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
    // Chuyển sang SetupPage và truyền danh sách thành viên trong phòng
    navigate('/setup', { state: { fromRoom: room } });
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Thêm 1 bot
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

  // Thêm nhanh cho đủ 6 người
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

  // Xóa bot
  const handleRemoveBot = async (botUid?: string) => {
    if (!roomId) return;
    try {
      await removeBotFromRoom(roomId, botUid);
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '20px' }}>
      {/* Header phòng */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button
          type="button"
          className="btn-secondary"
          style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
          onClick={handleLeave}
        >
          ← Rời phòng
        </button>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--primary)' }}>{room.name}</h2>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Mã phòng: <strong style={{ color: 'var(--text)' }}>#{room.id}</strong>{' '}
            <button
              type="button"
              onClick={copyRoomCode}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '2px 4px'
              }}
            >
              {copied ? '✓ Đã chép' : '📋 Chép'}
            </button>
          </div>
        </div>
        <div style={{ width: '80px' }} />
      </div>

      {/* Thông tin phòng & Quản trò */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Quản trò chủ phòng:</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)', marginTop: '2px' }}>
              👑 {room.hostName}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Số người tham gia:</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#4CAF50', marginTop: '2px' }}>
              👥 {members.length}/{room.maxPlayers} người
            </div>
          </div>
        </div>
      </div>

      {/* Thanh công cụ thêm Bot (Dành cho Quản trò để test nhanh) */}
      {isHost && (
        <div className="card" style={{
          padding: '12px 16px',
          marginBottom: '16px',
          background: 'rgba(212, 175, 55, 0.08)',
          border: '1px solid rgba(212, 175, 55, 0.25)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ textAlign: 'left' }}>
              <strong style={{ fontSize: '13px', color: 'var(--primary)' }}>🤖 Thêm Bot Chơi Thử Nghiệm:</strong>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Thêm bot ảo để test ván chơi ngay mà không cần đợi đủ người thật</div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
                disabled={isAddingBot || members.length >= room.maxPlayers}
                onClick={handleAddOneBot}
              >
                +1 Bot 🤖
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{
                  width: 'auto',
                  padding: '6px 12px',
                  fontSize: '12px',
                  background: 'linear-gradient(135deg, #D4AF37 0%, #AA8010 100%)',
                  color: '#1a1614',
                  fontWeight: 'bold'
                }}
                disabled={isAddingBot || members.length >= room.maxPlayers}
                onClick={handleFillBots}
              >
                ⚡ Thêm Đủ 6 Người
              </button>
              {members.some(m => m.isBot) && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: 'auto', padding: '6px 10px', fontSize: '12px', color: 'var(--error)' }}
                  onClick={() => handleRemoveBot()}
                  title="Bớt 1 bot"
                >
                  -1 Bot 🗑️
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Danh sách người chơi & Bot trong phòng */}
      <div className="card">
        <h3 style={{ margin: '0 0 16px 0', textAlign: 'left', fontSize: '16px' }}>
          Danh sách người trong phòng ({members.length}/{room.maxPlayers})
        </h3>

        <div className="player-grid">
          {members.map((m, idx) => (
            <div
              key={m.uid}
              className="player-square"
              style={{
                borderColor: m.isHost ? 'var(--primary)' : (m.isBot ? 'rgba(33, 150, 243, 0.4)' : 'rgba(255,255,255,0.1)'),
                boxShadow: m.isHost ? '0 0 10px rgba(212, 175, 55, 0.3)' : undefined,
                position: 'relative'
              }}
            >
              <span className="player-id">#{idx + 1}</span>

              {/* Nút xóa Bot cho Quản trò */}
              {isHost && m.isBot && (
                <button
                  type="button"
                  onClick={() => handleRemoveBot(m.uid)}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: 'rgba(229, 57, 53, 0.85)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2
                  }}
                  title="Xóa bot này"
                >
                  ✕
                </button>
              )}

              <div
                className="player-avatar"
                style={{
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: m.isHost ? '2px solid var(--primary)' : (m.isBot ? '2px solid #2196F3' : undefined)
                }}
              >
                {m.avatar ? (
                  <img src={m.avatar} alt={m.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '18px' }}>👤</span>
                )}
              </div>
              <div className="player-name" title={m.displayName}>
                {m.displayName}
              </div>
              {m.isHost && (
                <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 'bold' }}>
                  👑 Quản trò
                </span>
              )}
              {m.isBot && !m.isHost && (
                <span style={{ fontSize: '10px', color: '#2196F3', fontWeight: 'bold' }}>
                  🤖 Bot
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bảng điều khiển hành động */}
      <div style={{ marginTop: '24px' }}>
        {isHost ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              type="button"
              className="btn-primary"
              style={{ padding: '16px', fontSize: '16px' }}
              onClick={handleStartSetup}
            >
              🎮 Bắt Đầu Thiết Lập Ván & Chia Vai ({members.length} người)
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '12px', fontSize: '14px', color: 'var(--error)' }}
              onClick={handleClose}
            >
              ❌ Giải tán phòng
            </button>
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
            <p style={{ margin: 0, color: 'var(--text)', fontSize: '15px' }}>
              Đang đợi Quản trò (<strong>{room.hostName}</strong>) bắt đầu ván...
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Khi Quản trò bắt đầu, ván chơi sẽ được thiết lập với danh sách người chơi trong phòng.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
