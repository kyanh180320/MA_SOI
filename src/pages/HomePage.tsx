import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeRooms, createRoom, joinRoom } from '../services/roomService';
import type { GameRoom } from '../game/types';

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
    <div className="container" style={{ textAlign: 'center', paddingTop: '20px' }}>
      {/* Thanh trạng thái người dùng trên cùng */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--card-bg)',
        padding: '10px 16px',
        borderRadius: '12px',
        marginBottom: '26px',
        border: '1px solid rgba(255,255,255,0.05)'
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
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--primary)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
                }}
              />
            ) : (
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: '#1a1614',
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
              <span style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(212, 175, 55, 0.2)',
                color: 'var(--primary)',
                fontWeight: '600'
              }}>
                🎙️ Quản trò
              </span>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Chế độ: <strong>Khách (Offline)</strong>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {user && (
            <button
              className="btn-secondary"
              style={{
                width: 'auto',
                padding: '6px 12px',
                fontSize: '12px',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                color: 'var(--primary)'
              }}
              onClick={openProfile}
            >
              ✏️ Sửa hồ sơ
            </button>
          )}

          {user ? (
            <button
              className="btn-secondary"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
              onClick={logoutUser}
            >
              Đăng xuất
            </button>
          ) : (
            <button
              className="btn-primary"
              style={{ width: 'auto', padding: '6px 14px', fontSize: '12px' }}
              onClick={() => navigate('/login')}
            >
              Đăng nhập
            </button>
          )}
        </div>
      </div>

      <h1>🐺 Ma Sói Quản Trò</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '6px', marginBottom: '24px' }}>
        Công cụ quản trò Boardgame thông minh & tiện lợi
      </p>

      {/* ======================================================== */}
      {/* GIAO DIỆN KHI CHƯA ĐĂNG NHẬP (CHẾ ĐỘ OFFLINE) */}
      {/* ======================================================== */}
      {!user && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button className="btn-primary" style={{ padding: '16px', fontSize: '17px' }} onClick={() => navigate('/setup')}>
            🎮 Tạo Ván Mới (Chơi Offline)
          </button>
          <button 
            className="btn-secondary" 
            style={{ padding: '16px', fontSize: '16px' }} 
            onClick={() => navigate('/history')}
          >
            📜 Xem Lịch Sử Ván Đấu
          </button>

          <div className="card" style={{ marginTop: '16px', padding: '16px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '20px' }}>🌐</span>
              <strong style={{ color: 'var(--primary)', fontSize: '14px' }}>Chơi Trực Tuyến Cùng Bạn Bè</strong>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Đăng nhập để vào sảnh phòng game online, tạo phòng lên tới 20 người và mời bạn bè tham gia ván đấu qua mạng!
            </p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* GIAO DIỆN KHI ĐÃ ĐĂNG NHẬP (DANH SÁCH PHÒNG & TẠO PHÒNG) */}
      {/* ======================================================== */}
      {user && (
        <div>
          {/* Nút Tạo Phòng Mới Nổi Bật */}
          <button
            type="button"
            className="btn-primary"
            style={{
              padding: '16px',
              fontSize: '17px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              marginBottom: '24px',
              boxShadow: '0 6px 18px rgba(255, 112, 67, 0.4)'
            }}
            onClick={handleOpenCreateRoom}
          >
            <span style={{ fontSize: '20px' }}>➕</span>
            <strong>Tạo Phòng Game Mới (Max 20 Người)</strong>
          </button>

          {/* Tiêu đề danh sách phòng */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            textAlign: 'left'
          }}>
            <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--text)' }}>
              🏰 Các Phòng Đang Chờ ({rooms.length})
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Cập nhật trực tiếp 🟢
            </span>
          </div>

          {/* Danh sách phòng */}
          {rooms.length === 0 ? (
            <div className="card" style={{ padding: '36px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '42px', marginBottom: '12px' }}>🏰</div>
              <h4 style={{ margin: '0 0 6px 0', color: 'var(--primary)' }}>Chưa Có Phòng Nào</h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Hiện tại chưa có ai tạo phòng. Bạn hãy bấm <strong>"Tạo Phòng Game Mới"</strong> ở trên để làm Quản trò và mời bạn bè vào nhé!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {rooms.map(room => {
                const memberCount = room.members?.length || 0;
                const isFull = memberCount >= room.maxPlayers;
                const isMyRoom = room.hostUid === user.uid;

                return (
                  <div
                    key={room.id}
                    className="card"
                    style={{
                      margin: 0,
                      padding: '16px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: isMyRoom ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                      transition: 'transform 0.1s ease',
                      textAlign: 'left'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text)' }}>
                          {room.name}
                        </span>
                        {isMyRoom && (
                          <span style={{
                            fontSize: '10px',
                            background: 'rgba(212, 175, 55, 0.25)',
                            color: 'var(--primary)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 'bold'
                          }}>
                            Phòng của bạn
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        👑 Quản trò: <strong>{room.hostName}</strong> • Mã: <strong>#{room.id}</strong>
                      </div>
                      <div style={{ fontSize: '12px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          color: isFull ? 'var(--error)' : '#4CAF50',
                          fontWeight: 'bold'
                        }}>
                          👥 {memberCount}/{room.maxPlayers} người
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>•</span>
                        <span style={{ color: room.status === 'playing' ? '#FF9800' : '#81C784', fontSize: '11px' }}>
                          {room.status === 'playing' ? '🎮 Đang diễn ra' : '⏳ Đang chờ người'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-primary"
                      style={{
                        width: 'auto',
                        padding: '10px 18px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        background: isFull && !isMyRoom ? '#555' : undefined,
                        cursor: isFull && !isMyRoom ? 'not-allowed' : 'pointer'
                      }}
                      disabled={joiningRoomId === room.id || (isFull && !isMyRoom)}
                      onClick={() => handleJoinRoom(room.id)}
                    >
                      {joiningRoomId === room.id ? '...' : (isMyRoom ? 'Vào phòng' : (isFull ? 'Đã đầy' : 'Tham gia ➔'))}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tùy chọn chơi offline và xem lịch sử */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button 
              className="btn-secondary" 
              style={{ flex: 1, padding: '12px', fontSize: '13px' }} 
              onClick={() => navigate('/setup')}
            >
              🎮 Tạo Ván Chơi Offline
            </button>
            <button 
              className="btn-secondary" 
              style={{ flex: 1, padding: '12px', fontSize: '13px' }} 
              onClick={() => navigate('/history')}
            >
              📜 Lịch Sử Ván Đấu
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL TẠO PHÒNG MỚI */}
      {/* ======================================================== */}
      {isCreateRoomOpen && (
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
            maxWidth: '420px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '18px' }}>
                ➕ Tạo Phòng Game Mới
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateRoomOpen(false)}
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

            {roomError && (
              <div style={{
                background: 'rgba(229, 57, 53, 0.15)',
                border: '1px solid var(--error)',
                color: 'var(--error)',
                padding: '10px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px'
              }}>
                {roomError}
              </div>
            )}

            <form onSubmit={handleConfirmCreateRoom}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
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
                    background: 'var(--secondary)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Số lượng người tối đa:
                  </label>
                  <strong style={{ color: 'var(--primary)', fontSize: '14px' }}>
                    {maxPlayers} người
                  </strong>
                </div>
                <input
                  type="range"
                  min="6"
                  max="20"
                  value={maxPlayers}
                  onChange={e => setMaxPlayers(parseInt(e.target.value) || 20)}
                  style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <span>Tối thiểu 6 người</span>
                  <span>Tối đa 20 người</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, padding: '12px' }}
                  onClick={() => setIsCreateRoomOpen(false)}
                  disabled={isCreatingRoom}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 2, padding: '12px', fontWeight: 'bold' }}
                  disabled={isCreatingRoom || !newRoomName.trim()}
                >
                  {isCreatingRoom ? 'Đang tạo phòng...' : '🚀 Tạo & Vào Phòng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL CHỈNH SỬA HỒ SƠ */}
      {/* ======================================================== */}
      {isProfileOpen && user && (
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
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '18px' }}>
                ✏️ Chỉnh Sửa Hồ Sơ
              </h3>
              <button
                onClick={() => setIsProfileOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

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
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, padding: '12px' }}
                  onClick={() => setIsProfileOpen(false)}
                  disabled={isSaving}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 2, padding: '12px' }}
                  disabled={isSaving}
                >
                  {isSaving ? 'Đang lưu...' : '💾 Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
