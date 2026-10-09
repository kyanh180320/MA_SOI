import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeRooms, createRoom, joinRoom, closeRoom } from '../services/roomService';
import type { GameRoom } from '../game/types';
import { Button, Panel, Badge, Modal } from '../components/ui';

const PRESET_AVATARS = [
  { label: 'Sói', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=WolfLeader' },
  { label: 'Sói Quỷ', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=DemonWolf' },
  { label: 'Tiên Tri', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MysticSeer' },
  { label: 'Phù Thủy', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ArcaneWitch' },
  { label: 'Bảo Vệ', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=IronGuard' },
  { label: 'Thợ Săn', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=WildHunter' },
  { label: 'Dân Làng', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=GoodVillager' },
  { label: 'Bóng Đêm', url: 'https://api.dicebear.com/7.x/micah/svg?seed=DarkShadow' }
];



export default function HomePage() {
  const navigate = useNavigate();
  const { user, logoutUser, updateProfileData } = useAuth();

  // State cho Modal Sửa Hồ Sơ
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State cho Danh Sách Phòng Online & Tạo Phòng
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(20);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);



  // Xoá phòng dành cho người tạo phòng (chủ phòng)
  const handleDeleteMyRoom = async (roomId: string, roomName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xoá phòng "${roomName}" (#${roomId}) không? Toàn bộ người chơi sẽ bị kích ra ngoài.`)) {
      return;
    }
    try {
      await closeRoom(roomId);
    } catch (err: unknown) {
      alert((err as Error).message || 'Không thể xoá phòng.');
    }
  };

  // Lắng nghe danh sách phòng thời gian thực khi user đã đăng nhập
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeRooms((roomsList) => {
      setRooms(roomsList);
    });
    return () => unsubscribe();
  }, [user]);

  const openProfile = () => {
    if (!user) return;
    setEditName(user.displayName || '');
    setEditAvatar(user.avatar || user.photoURL || '');
    setFeedback(null);
    setIsProfileOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Dung lượng ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 250;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setEditAvatar(dataUrl);
          setFeedback(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setFeedback({ type: 'error', message: 'Tên hiển thị không được để trống.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      await updateProfileData(editName.trim(), editAvatar);
      setFeedback({ type: 'success', message: 'Đã cập nhật hồ sơ thành công!' });
      setTimeout(() => {
        setIsProfileOpen(false);
      }, 1000);
    } catch (err: unknown) {
      const error = err as Error;
      setFeedback({ type: 'error', message: error.message || 'Lỗi khi cập nhật hồ sơ.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Mở modal tạo phòng
  const handleOpenCreateRoom = () => {
    setNewRoomName(`Phòng của ${user?.displayName || 'Quản trò'}`);
    setMaxPlayers(20);
    setRoomError(null);
    setIsCreateRoomOpen(true);
  };

  // Xác nhận tạo phòng và chui ngay vào phòng
  const handleConfirmCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingRoom(true);
    setRoomError(null);
    try {
      const roomId = await createRoom(newRoomName, maxPlayers, user);
      setIsCreateRoomOpen(false);
      navigate(`/room/${roomId}`);
    } catch (err: unknown) {
      const error = err as Error;
      setRoomError(error.message || 'Không thể tạo phòng.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Tham gia phòng
  const handleJoinRoom = async (roomId: string) => {
    setJoiningRoomId(roomId);
    setRoomError(null);
    try {
      await joinRoom(roomId, user);
      navigate(`/room/${roomId}`);
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || 'Không thể vào phòng.');
    } finally {
      setJoiningRoomId(null);
    }
  };

  return (
    <div className="screen-container" style={{ gap: 'var(--s-4)' }}>
      {/* Thanh trạng thái người dùng trên cùng */}
      <Panel compact>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {user ? (
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
              onClick={openProfile}
              title="Nhấp để đổi tên & ảnh đại diện"
            >
              {user.avatar || user.photoURL ? (
                <img
                  src={user.avatar || user.photoURL}
                  alt={user.displayName}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid var(--gold-500)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
                  }}
                />
              ) : (
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'var(--gold-500)',
                  color: '#2A1A00',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>
                  {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                </div>
              )}
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{user.displayName}</span>
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>✏️</span>
                </div>
                <Badge variant="gold" style={{ fontSize: '10px', height: '18px', padding: '0 6px', marginTop: '2px' }}>
                  🎙️ Quản trò
                </Badge>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
              Chế độ: <strong>Khách (Offline)</strong>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {user ? (
              <Button
                variant="ghost"
                onClick={logoutUser}
                style={{ minHeight: '36px', padding: '0 var(--s-3)', fontSize: '12px' }}
              >
                Đăng xuất
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => navigate('/login')}
                style={{ minHeight: '38px', padding: '0 var(--s-4)', fontSize: '13px' }}
              >
                Đăng nhập
              </Button>
            )}
          </div>
        </div>
      </Panel>

      {/* HEADER HERO TIÊU ĐỀ GAME */}
      <div style={{ textAlign: 'center', margin: 'var(--s-2) 0' }}>
        <h1 style={{
          fontFamily: 'var(--font-title)',
          fontSize: '26px',
          color: 'var(--gold-100)',
          letterSpacing: '0.08em',
          margin: '0 0 var(--s-1) 0',
          textShadow: '0 2px 8px rgba(0,0,0,0.8)'
        }}>
          🐺 MA SÓI QUẢN TRÒ
        </h1>
        <p style={{
          color: 'var(--text-dim)',
          fontSize: '14px',
          margin: 0
        }}>
          Giao diện Boardgame chuyên nghiệp & trực quan
        </p>
      </div>

      {/* ======================================================== */}
      {/* GIAO DIỆN KHI CHƯA ĐĂNG NHẬP (CHẾ ĐỘ OFFLINE) */}
      {/* ======================================================== */}
      {!user && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
          <Button
            variant="primary"
            pulse
            fullWidth
            onClick={() => navigate('/setup')}
          >
            🎮 TẠO VÁN MỚI (CHƠI OFFLINE)
          </Button>

          <Button 
            variant="secondary" 
            fullWidth
            onClick={() => navigate('/history')}
          >
            📜 Xem Lịch Sử Ván Đấu
          </Button>

          <Panel style={{ textAlign: 'left', marginTop: 'var(--s-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '20px' }}>🌐</span>
              <strong style={{ color: 'var(--gold-300)', fontSize: '14px' }}>Chơi Trực Tuyến Cùng Bạn Bè</strong>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
              Đăng nhập để vào sảnh phòng game online, tạo phòng lên tới 20 người và mời bạn bè tham gia ván đấu qua mạng!
            </p>
          </Panel>
        </div>
      )}

      {/* ======================================================== */}
      {/* GIAO DIỆN KHI ĐÃ ĐĂNG NHẬP (DANH SÁCH PHÒNG & TẠO PHÒNG) */}
      {/* ======================================================== */}
      {user && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          {/* NÚT TẠO PHÒNG MỚI (DUY NHẤT 1 PRIMARY PER SCREEN) */}
          <Button
            variant="primary"
            pulse
            fullWidth
            onClick={handleOpenCreateRoom}
          >
            ➕ TẠO PHÒNG GAME MỚI (MAX 20 NGƯỜI)
          </Button>

          {/* Tiêu đề danh sách phòng */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontFamily: 'var(--font-title)',
              color: 'var(--gold-100)',
              letterSpacing: '0.04em'
            }}>
              🏰 CÁC PHÒNG ĐANG CHỜ ({rooms.length})
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--green-400)' }}>
              Trực tiếp 🟢
            </span>
          </div>

          {/* Danh sách phòng */}
          {rooms.length === 0 ? (
            <Panel style={{ textAlign: 'center', padding: 'var(--s-6) var(--s-4)' }}>
              <div style={{ fontSize: '38px', marginBottom: '8px' }}>🏰</div>
              <h4 style={{ margin: '0 0 6px 0', color: 'var(--gold-300)', fontSize: '16px' }}>Chưa Có Phòng Nào</h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                Hiện tại chưa có phòng nào. Hãy bấm <strong>"Tạo Phòng Game Mới"</strong> ở trên để làm Quản trò và mời bạn bè vào nhé!
              </p>
            </Panel>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
              {rooms.map(room => {
                const memberCount = room.members?.length || 0;
                const isFull = memberCount >= room.maxPlayers;
                const isMyRoom = room.hostUid === user.uid;

                return (
                  <Panel key={room.id} compact>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text)' }}>
                            {room.name}
                          </span>
                          {isMyRoom && (
                            <Badge variant="gold">
                              Phòng bạn
                            </Badge>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                          👑 {room.hostName} • Mã: <strong style={{ color: 'var(--gold-300)' }}>#{room.id}</strong>
                        </div>
                        <div style={{ fontSize: '12px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            color: isFull ? 'var(--red-300)' : 'var(--green-400)',
                            fontWeight: 'bold'
                          }}>
                            👥 {memberCount}/{room.maxPlayers} người
                          </span>
                          <span style={{ color: 'var(--text-dim)' }}>•</span>
                          <span style={{ color: room.status === 'playing' ? '#FFB300' : 'var(--green-400)', fontSize: '11px' }}>
                            {room.status === 'playing' ? '🎮 Đang chơi' : '⏳ Đang chờ'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 'var(--s-2)', alignItems: 'center' }}>
                        {isMyRoom && (
                          <Button
                            variant="danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMyRoom(room.id, room.name);
                            }}
                            style={{ minHeight: '44px', padding: '0 var(--s-3)', fontSize: '12px' }}
                            title="Xoá vĩnh viễn phòng này"
                          >
                            🗑️ Xoá
                          </Button>
                        )}
                        <Button
                          variant={isMyRoom ? "primary" : "secondary"}
                          disabled={joiningRoomId === room.id || (isFull && !isMyRoom)}
                          onClick={() => handleJoinRoom(room.id)}
                          style={{ minHeight: '44px', padding: '0 var(--s-3)', fontSize: '13px' }}
                        >
                          {joiningRoomId === room.id ? '...' : (isMyRoom ? 'Vào phòng ➔' : (isFull ? 'Đã đầy' : 'Tham gia ➔'))}
                        </Button>
                      </div>
                    </div>
                  </Panel>
                );
              })}
            </div>
          )}

          {/* Tùy chọn chơi offline và xem lịch sử */}
          <div style={{ display: 'flex', gap: 'var(--s-2)', marginTop: 'var(--s-2)' }}>
            <Button 
              variant="secondary" 
              style={{ flex: 1, minHeight: '46px', fontSize: '13px' }} 
              onClick={() => navigate('/setup')}
            >
              🎮 Chơi Offline
            </Button>
            <Button 
              variant="secondary" 
              style={{ flex: 1, minHeight: '46px', fontSize: '13px' }} 
              onClick={() => navigate('/history')}
            >
              📜 Lịch Sử
            </Button>
            {import.meta.env.DEV && (
              <Button 
                variant="secondary" 
                style={{ flex: 1, minHeight: '46px', fontSize: '13px' }} 
                onClick={() => navigate('/dev')}
                title="Xem thư viện linh kiện UI Game"
              >
                🎨 Dev UI
              </Button>
            )}
          </div>
        </div>
      )}



      {/* ======================================================== */}
      {/* MODAL TẠO PHÒNG MỚI */}
      {/* ======================================================== */}
      <Modal
        isOpen={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
        title="➕ TẠO PHÒNG GAME MỚI"
      >
        {roomError && (
          <div style={{
            background: 'rgba(229, 57, 53, 0.15)',
            border: '1px solid var(--red-300)',
            color: 'var(--red-300)',
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            marginBottom: 'var(--s-3)'
          }}>
            {roomError}
          </div>
        )}

        <form onSubmit={handleConfirmCreateRoom}>
          <div style={{ marginBottom: 'var(--s-3)' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-dim)', marginBottom: '6px' }}>
              Tên phòng:
            </label>
            <input
              type="text"
              required
              placeholder="Nhập tên phòng..."
              value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--bg-1)',
                border: '1px solid var(--gold-700)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text)',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: 'var(--s-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                Số lượng người tối đa:
              </label>
              <strong style={{ color: 'var(--gold-300)', fontSize: '14px' }}>
                {maxPlayers} người
              </strong>
            </div>
            <input
              type="range"
              min="6"
              max="20"
              value={maxPlayers}
              onChange={e => setMaxPlayers(parseInt(e.target.value) || 20)}
              style={{ width: '100%', accentColor: 'var(--gold-500)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
              <span>Tối thiểu 6 người</span>
              <span>Tối đa 20 người</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
            <Button
              type="button"
              variant="secondary"
              style={{ flex: 1 }}
              onClick={() => setIsCreateRoomOpen(false)}
              disabled={isCreatingRoom}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              pulse
              style={{ flex: 1.5 }}
              disabled={isCreatingRoom || !newRoomName.trim()}
            >
              {isCreatingRoom ? 'Đang tạo...' : '🚀 Tạo Phòng'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL CHỈNH SỬA HỒ SƠ */}
      {/* ======================================================== */}
      {user && (
        <Modal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          title="✏️ CHỈNH SỬA HỒ SƠ"
        >

            {/* Thông báo phản hồi */}
            {feedback && (
              <div style={{
                background: feedback.type === 'success' ? 'rgba(67, 160, 71, 0.2)' : 'rgba(229, 57, 53, 0.2)',
                border: `1px solid ${feedback.type === 'success' ? 'var(--success)' : 'var(--error)'}`,
                color: feedback.type === 'success' ? '#81C784' : '#EF5350',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px'
              }}>
                {feedback.message}
              </div>
            )}

            <form onSubmit={handleSaveProfile}>
              {/* Phần Ảnh Đại Diện */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  margin: '0 auto 12px auto',
                  overflow: 'hidden',
                  border: '3px solid var(--primary)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  background: 'var(--secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {editAvatar ? (
                    <img
                      src={editAvatar}
                      alt="Avatar Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--primary)' }}>
                      {editName ? editName[0].toUpperCase() : 'U'}
                    </span>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ width: 'auto', padding: '6px 14px', fontSize: '12px' }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📁 Tải ảnh từ máy
                  </button>
                  {editAvatar && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ width: 'auto', padding: '6px 12px', fontSize: '12px', color: 'var(--error)' }}
                      onClick={() => setEditAvatar('')}
                    >
                      Xóa ảnh
                    </button>
                  )}
                </div>

                {/* Danh sách avatar mẫu nhanh */}
                <div style={{ marginTop: '14px', textAlign: 'left' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                    Hoặc chọn ảnh đại diện chủ đề ma sói:
                  </span>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '8px'
                  }}>
                    {PRESET_AVATARS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditAvatar(p.url)}
                        style={{
                          background: editAvatar === p.url ? 'rgba(212, 175, 55, 0.25)' : 'var(--secondary)',
                          border: editAvatar === p.url ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '8px',
                          padding: '6px 4px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <img src={p.url} alt={p.label} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                        <span style={{ fontSize: '10px', color: 'var(--text)', whiteSpace: 'nowrap' }}>{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tên hiển thị */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Tên hiển thị:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tên hiển thị của bạn..."
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'var(--secondary)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    outline: 'none',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Thông tin tài khoản */}
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                padding: '10px 12px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '12px',
                color: 'var(--text-muted)',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>Tài khoản: {user.email || 'Google Auth'}</span>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>🎙️ Quản trò</span>
              </div>

              {/* Nút hành động */}
              <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
                <Button
                  type="button"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsProfileOpen(false)}
                  disabled={isSaving}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  pulse
                  style={{ flex: 1.5 }}
                  disabled={isSaving}
                >
                  {isSaving ? 'Đang lưu...' : '💾 Lưu Thay Đổi'}
                </Button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
}
