import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginGoogle, loginEmail, registerEmail } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginGoogle();
      navigate('/');
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      if (errorObj.code === 'auth/unauthorized-domain') {
        setError('Tên miền Vercel này đang đợi Google cập nhật (thường mất 1 - 3 phút sau khi thêm vào Firebase). Bạn có thể đăng nhập bằng Email ở bên dưới để chơi ngay!');
      } else {
        setError(errorObj.message || 'Đăng nhập Google thất bại');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ Email và Mật khẩu');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        await registerEmail(email, password);
      } else {
        await loginEmail(email, password);
      }
      navigate('/');
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      if (errorObj.code === 'auth/invalid-credential' || errorObj.code === 'auth/wrong-password') {
        setError('Email hoặc mật khẩu không chính xác');
      } else if (errorObj.code === 'auth/email-already-in-use') {
        setError('Email này đã được sử dụng');
      } else if (errorObj.code === 'auth/weak-password') {
        setError('Mật khẩu quá yếu (cần tối thiểu 6 ký tự)');
      } else {
        setError(errorObj.message || 'Xác thực thất bại, vui lòng thử lại');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '420px', paddingTop: '30px' }}>
      <button 
        className="btn-secondary" 
        style={{ width: 'auto', padding: '6px 12px', fontSize: '13px', marginBottom: '20px' }}
        onClick={() => navigate('/')}
      >
        ← Về Trang Chủ
      </button>

      <div className="card" style={{ textAlign: 'center', padding: '28px 22px' }}>
        <div style={{ fontSize: '36px', marginBottom: '8px' }}>🐺</div>
        <h2 style={{ margin: '0 0 8px 0', fontFamily: 'Cinzel', color: 'var(--primary)' }}>
          {isRegister ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập Quản Trò'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>
          Đăng nhập để đồng bộ lịch sử ván chơi, tùy chỉnh hồ sơ và quản lý danh sách người chơi mẫu.
        </p>

        {error && (
          <div style={{
            background: 'rgba(229, 57, 53, 0.15)',
            border: '1px solid var(--error)',
            color: 'var(--error)',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            {error}
          </div>
        )}

        {/* Nút đăng nhập Google */}
        <button
          type="button"
          className="btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            background: '#ffffff',
            color: '#333333',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            marginBottom: '20px'
          }}
          disabled={loading}
          onClick={handleGoogleLogin}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          {loading ? 'Đang kết nối...' : 'Tiếp tục với Google (1-Click)'}
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          margin: '20px 0',
          color: 'var(--text-muted)',
          fontSize: '12px'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <span>hoặc dùng Email</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* Form Email / Password */}
        <form onSubmit={handleEmailAuth}>
          <div style={{ textAlign: 'left', marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Email:
            </label>
            <input
              type="email"
              required
              placeholder="tenban@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
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

          <div style={{ textAlign: 'left', marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Mật khẩu:
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
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

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ fontWeight: 'bold' }}
          >
            {loading ? 'Đang xử lý...' : (isRegister ? 'Tạo Tài Khoản Mới' : 'Đăng Nhập')}
          </button>

          <div style={{ marginTop: '16px' }}>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '13px' }}
              onClick={() => { setIsRegister(!isRegister); setError(null); }}
            >
              {isRegister ? 'Đã có tài khoản? Bấm để Đăng nhập' : 'Chưa có tài khoản? Bấm để Đăng ký nhanh'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
