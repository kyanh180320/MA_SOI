import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeRooms, createRoom, joinRoom, closeRoom } from '../services/roomService';
import type { GameRoom } from '../game/types';
import { Button, Badge, Modal } from '../components/ui';
import styles from './HomePage.module.css';

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
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(20);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);

  // State cho Modal Menu Admin / Dev / Lịch sử
  const [isAdminOpen, setIsAdminOpen] = useState(false);

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
      setIsLobbyOpen(false);
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
      setIsLobbyOpen(false);
      navigate(`/room/${roomId}`);
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || 'Không thể vào phòng.');
    } finally {
      setJoiningRoomId(null);
    }
  };

  return (
    <div className={styles.homeScreenWrapper}>
      {/* KHUNG MÀN HÌNH CHÍNH THEO GIAO DIỆN CHUẨN TỪ home.png */}
      <div className={styles.homePhoneFrame}>
        {/* THANH THÔNG TIN TÀI KHOẢN (CHỈ HIỂN THỊ KHI ĐÃ ĐĂNG NHẬP) */}
        {user && (
          <div className={styles.topUserBar}>
            <div 
              className={styles.userProfileChip} 
              onClick={openProfile}
              title="Nhấp để đổi tên & ảnh đại diện"
            >
              {user.avatar || user.photoURL ? (
                <img
                  src={user.avatar || user.photoURL}
                  alt={user.displayName}
                  className={styles.userAvatarImg}
                />
              ) : (
                <div className={styles.userAvatarFallback}>
                  {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                </div>
              )}
              <span className={styles.userNameLabel}>{user.displayName}</span>
            </div>

            <button 
              className={styles.topLogoutBtn}
              onClick={logoutUser}
              title="Đăng xuất"
            >
              Đăng xuất
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* NÚT 1: PLAY OFFLINE (NÚT VÀNG 3D VỚI RUBY BROOCH TRÊN CÙNG) */}
        {/* ======================================================== */}
        <button
          className={styles.btnHotspotPlayOffline}
          onClick={() => navigate('/setup')}
          aria-label="Play Offline (Tạo Ván Chơi)"
          title="Chơi Offline (Tạo Ván Tại Chỗ)"
        >
          <div className={styles.goldBtnShine} />
        </button>

        {/* ======================================================== */}
        {/* NÚT 2: SIGN IN WITH GOOGLE HOẶC SẢNH ONLINE */}
        {/* ======================================================== */}
        <button
          className={styles.btnHotspotSecondary}
          onClick={() => {
            if (user) {
              setIsLobbyOpen(true);
            } else {
              navigate('/login');
            }
          }}
          aria-label={user ? "Sảnh Phòng Online" : "Sign In With Google"}
          title={user ? "Vào Sảnh Chờ Phòng Online" : "Đăng Nhập Bằng Google / Tài Khoản"}
        >
          {user && (
            <div className={styles.onlineLobbyOverlay}>
              <span className={styles.onlineLobbyTitle}>🏰 VÀO SẢNH ONLINE</span>
              <span className={styles.onlineLobbySubtitle}>
                {rooms.length} phòng đang chờ • Bấm để vào
              </span>
            </div>
          )}
        </button>

        {/* ======================================================== */}
        {/* NÚT 3: ADMIN (LINK ĐIỀU HƯỚNG DƯỚI ĐÁY TỪ ART GỐC) */}
        {/* ======================================================== */}
        <button
          className={styles.btnHotspotAdmin}
          onClick={() => setIsAdminOpen(true)}
          aria-label="Admin and Menu"
          title="Mở Bảng Điều Khiển Hệ Thống & Quản Trị"
        />
      </div>

      {/* ======================================================== */}
      {/* MODAL SẢNH PHÒNG ONLINE (KHI ĐÃ ĐĂNG NHẬP) */}
      {/* ======================================================== */}
      <Modal
        isOpen={isLobbyOpen}
        onClose={() => setIsLobbyOpen(false)}
        title="🏰 SẢNH PHÒNG CHỜ ONLINE"
      >
        <div className={styles.lobbyModalContent}>
          <div className={styles.lobbyActionRow}>
            <Button
              variant="primary"
              fullWidth
              onClick={handleOpenCreateRoom}
              style={{ minHeight: '44px', fontWeight: 'bold' }}
            >
              ➕ TẠO PHÒNG MỚI (TỐI ĐA 20 NGƯỜI)
            </Button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gold-300)' }}>
              CÁC PHÒNG ĐANG MỞ ({rooms.length})
            </span>
            <span style={{ fontSize: '12px', color: 'var(--green-400)' }}>
              Trực tiếp 🟢
            </span>
          </div>

          {rooms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--s-4)', color: 'var(--text-dim)', fontSize: '13px' }}>
              Hiện chưa có phòng nào. Hãy bấm <strong>"Tạo Phòng Mới"</strong> để làm Quản trò và mời bạn bè vào chơi nhé!
            </div>
          ) : (
            rooms.map((room) => {
              const memberCount = room.members?.length || 0;
              const isFull = memberCount >= room.maxPlayers;
              const isMyRoom = user && room.hostUid === user.uid;

              return (
                <div key={room.id} className={styles.roomCard}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text)' }}>
                        {room.name}
                      </span>
                      {isMyRoom && <Badge variant="gold">Phòng bạn</Badge>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      👑 {room.hostName} • Mã: <span style={{ color: 'var(--gold-300)' }}>#{room.id}</span>
                    </div>
                    <div style={{ fontSize: '11px', marginTop: '4px', color: isFull ? 'var(--red-400)' : 'var(--green-400)' }}>
                      👥 {memberCount}/{room.maxPlayers} người • {room.status === 'playing' ? '🎮 Đang chơi' : '⏳ Đang chờ'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {isMyRoom && (
                      <Button
                        variant="danger"
                        onClick={() => handleDeleteMyRoom(room.id, room.name)}
                        style={{ minHeight: '38px', padding: '0 8px', fontSize: '12px' }}
                      >
                        🗑️
                      </Button>
                    )}
                    <Button
                      variant={isMyRoom ? "primary" : "secondary"}
                      disabled={joiningRoomId === room.id || (isFull && !isMyRoom)}
                      onClick={() => handleJoinRoom(room.id)}
                      style={{ minHeight: '38px', padding: '0 12px', fontSize: '12px' }}
                    >
                      {joiningRoomId === room.id ? '...' : (isMyRoom ? 'Vào phòng' : (isFull ? 'Đầy' : 'Tham gia'))}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL MENU ADMIN / DEV / LỊCH SỬ */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        title="⚙️ HỆ THỐNG & ĐIỀU HƯỚNG"
      >
        <div className={styles.adminMenuContainer}>
          <button 
            className={styles.adminMenuBtn}
            onClick={() => {
              setIsAdminOpen(false);
              navigate('/history');
            }}
          >
            📜 LỊCH SỬ CÁC VÁN ĐẤU
          </button>

          {import.meta.env.DEV && (
            <button 
              className={styles.adminMenuBtn}
              onClick={() => {
                setIsAdminOpen(false);
                navigate('/dev');
              }}
            >
              🎨 DEV UI SHOWCASE (XEM TOÀN BỘ ASSET & THẺ BÀI)
            </button>
          )}

          {user ? (
            <>
              <button 
                className={styles.adminMenuBtn}
                onClick={() => {
                  setIsAdminOpen(false);
                  openProfile();
                }}
              >
                👤 CHỈNH SỬA HỒ SƠ & AVATAR ({user.displayName})
              </button>
              <button 
                className={styles.adminMenuBtn}
                style={{ color: '#ff7766' }}
                onClick={() => {
                  setIsAdminOpen(false);
                  logoutUser();
                }}
              >
                🚪 ĐĂNG XUẤT TÀI KHOẢN
              </button>
            </>
          ) : (
            <button 
              className={styles.adminMenuBtn}
              onClick={() => {
                setIsAdminOpen(false);
                navigate('/login');
              }}
            >
              🔐 ĐĂNG NHẬP GOOGLE / TÀI KHOẢN
            </button>
          )}
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL TẠO PHÒNG MỚI */}
      {/* ======================================================== */}
      <Modal
        isOpen={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
        title="🏰 TẠO PHÒNG GAME MỚI"
      >
        <form onSubmit={handleConfirmCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
          {roomError && (
            <div style={{ color: 'var(--red-400)', fontSize: '13px', background: 'rgba(239,68,68,0.1)', padding: '8px', borderRadius: '4px' }}>
              ⚠️ {roomError}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-dim)' }}>
              Tên phòng chơi:
            </label>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="VD: Hội Bàn Tròn Đêm Trăng..."
              required
              maxLength={40}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(5, 7, 14, 0.8)',
                border: '1px solid var(--gold-500)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-dim)' }}>
              Số lượng người chơi tối đa: <strong>{maxPlayers} người</strong>
            </label>
            <input
              type="range"
              min="6"
              max="20"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--gold-400)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)' }}>
              <span>6 người</span>
              <span>12 người</span>
              <span>20 người</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateRoomOpen(false)}
              style={{ flex: 1, minHeight: '42px' }}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isCreatingRoom || !newRoomName.trim()}
              style={{ flex: 1, minHeight: '42px' }}
            >
              {isCreatingRoom ? 'Đang tạo...' : 'Tạo phòng ngay ➔'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL SỬA HỒ SƠ & AVATAR */}
      {/* ======================================================== */}
      <Modal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        title="👤 CHỈNH SỬA HỒ SƠ"
      >
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          {feedback && (
            <div style={{
              padding: '10px',
              borderRadius: '6px',
              fontSize: '13px',
              background: feedback.type === 'success' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: feedback.type === 'success' ? '#4ade80' : '#ef4444',
              border: `1px solid ${feedback.type === 'success' ? '#4ade80' : '#ef4444'}`
            }}>
              {feedback.message}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            {editAvatar ? (
              <img
                src={editAvatar}
                alt="Avatar xem trước"
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid var(--gold-400)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}
              />
            ) : (
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'var(--gold-500)',
                color: '#1a0f02',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                fontWeight: 'bold'
              }}>
                {editName ? editName[0].toUpperCase() : 'U'}
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              style={{ minHeight: '34px', fontSize: '12px', padding: '0 12px' }}
            >
              📁 Tải ảnh từ thiết bị
            </Button>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-dim)' }}>
              Hoặc chọn Avatar có sẵn:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {PRESET_AVATARS.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => setEditAvatar(p.url)}
                  style={{
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '8px',
                    border: editAvatar === p.url ? '2px solid var(--gold-400)' : '1px solid rgba(255,255,255,0.1)',
                    background: editAvatar === p.url ? 'rgba(201, 162, 74, 0.2)' : 'rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <img src={p.url} alt={p.label} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{p.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-dim)' }}>
              Tên hiển thị:
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Nhập tên của bạn..."
              required
              maxLength={25}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(5, 7, 14, 0.8)',
                border: '1px solid var(--gold-500)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsProfileOpen(false)}
              style={{ flex: 1, minHeight: '42px' }}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving}
              style={{ flex: 1, minHeight: '42px' }}
            >
              {isSaving ? 'Đang lưu...' : 'Lưu hồ sơ'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
