import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="container" style={{ textAlign: 'center', paddingTop: '40px' }}>
      <h1>🐺 Ma Sói Quản Trò</h1>
      <p style={{ color: 'var(--text-muted)' }}>Công cụ hỗ trợ quản trò Boardgame offline</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '40px' }}>
        <button className="btn-primary" onClick={() => navigate('/setup')}>
          Tạo Ván Mới
        </button>
        <button className="btn-primary" style={{ background: '#333', color: 'var(--text)' }} onClick={() => navigate('/history')}>
          Xem Lịch Sử
        </button>
        {/* Đăng nhập sẽ làm ở Task 6 */}
        <button className="btn-primary" style={{ background: '#333', color: 'var(--text)' }} onClick={() => alert('Tính năng đăng nhập đang được xây dựng!')}>
          Đăng Nhập
        </button>
      </div>
    </div>
  );
}
