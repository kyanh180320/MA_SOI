import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validateUsername } from '../game/username';
import { lookupUsername, type UsernameLookup } from '../services/authService';
import { prepareAvatarImage } from '../services/avatarImage';
import styles from './LoginPage.module.css';

const PRESET_AVATARS = [
  { label: 'Ma Sói', url: '/assets/icons/icon_wolf_paw_fire_balanced.webp' },
  { label: 'Dân Làng', url: '/assets/icons/icon_sun.webp' },
  { label: 'Tiên Tri', url: '/assets/icons/icon_eye_balanced.webp' },
  { label: 'Phù Thủy', url: '/assets/icons/icon_potion_heal_balanced.webp' },
  { label: 'Bảo Vệ', url: '/assets/icons/icon_shield_balanced.webp' },
  { label: 'Thợ Săn', url: '/assets/icons/icon_swords_alt_balanced.webp' },
];

type LookupState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'existing'; profile: UsernameLookup }
  | { kind: 'error'; message: string };

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loginUsername } = useAuth();
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0].url);
  const [avatarBlob, setAvatarBlob] = useState<Blob | undefined>();
  const [avatarPreview, setAvatarPreview] = useState('');
  const [lookupState, setLookupState] = useState<LookupState>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && !submitting) navigate('/', { replace: true });
  }, [navigate, submitting, user]);

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  useEffect(() => {
    const validationError = validateUsername(username);
    if (validationError) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void lookupUsername(username)
        .then(profile => {
          if (cancelled) return;
          setLookupState(profile.exists
            ? { kind: 'existing', profile }
            : { kind: 'available' });
        })
        .catch((reason: unknown) => {
          if (cancelled) return;
          const firebaseCode = (reason as { code?: string }).code;
          setLookupState({
            kind: 'error',
            message: firebaseCode === 'auth/operation-not-allowed' || firebaseCode === 'auth/admin-restricted-operation'
              ? 'Firebase Anonymous Auth chưa được bật cho dự án.'
              : 'Chưa thể kiểm tra username. Hãy thử lại.',
          });
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [username]);

  const handleAvatarFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const blob = await prepareAvatarImage(file);
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarBlob(blob);
      setAvatarPreview(URL.createObjectURL(blob));
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      event.target.value = '';
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lookupState.kind !== 'available' && lookupState.kind !== 'existing') return;
    setSubmitting(true);
    setError(null);
    try {
      await loginUsername(
        username,
        selectedAvatar,
        lookupState.kind === 'existing' ? 'resume' : 'create',
        lookupState.kind === 'available' ? avatarBlob : undefined,
      );
      navigate('/', { replace: true });
    } catch (reason: unknown) {
      const firebaseCode = (reason as { code?: string }).code;
      setError(firebaseCode === 'auth/operation-not-allowed' || firebaseCode === 'auth/admin-restricted-operation'
        ? 'Cần bật phương thức Anonymous trong Firebase Authentication trước khi chơi.'
        : (reason as Error).message || 'Không thể tạo hồ sơ lúc này.');
      if ((reason as { code?: string }).code === 'username-taken') {
        setLookupState({ kind: 'checking' });
        void lookupUsername(username).then(profile => {
          setLookupState(profile.exists ? { kind: 'existing', profile } : { kind: 'available' });
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isExisting = lookupState.kind === 'existing';
  const canSubmit = lookupState.kind === 'available' || isExisting;
  const previewAvatar = isExisting
    ? lookupState.profile.avatar
    : avatarPreview || selectedAvatar;

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="player-profile-title">
        <button className={styles.backButton} type="button" onClick={() => navigate('/')}>
          ← Trang chủ
        </button>

        <div className={styles.heading}>
          <img src="/assets/home_emblem.webp" alt="" className={styles.emblem} />
          <div>
            <p className={styles.eyebrow}>HỒ SƠ NGƯỜI CHƠI</p>
            <h1 id="player-profile-title">Sẵn sàng vào làng?</h1>
            <p>Chỉ cần một username. Không email, không mật khẩu.</p>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.fieldLabel} htmlFor="username">Username</label>
          <div className={styles.nameFieldWrap}>
            <input
              id="username"
              className={styles.nameField}
              value={username}
              onChange={event => {
                const nextUsername = event.target.value;
                const validationError = validateUsername(nextUsername);
                setUsername(nextUsername);
                setLookupState(validationError
                  ? nextUsername.trim()
                    ? { kind: 'error', message: validationError }
                    : { kind: 'idle' }
                  : { kind: 'checking' });
                setError(null);
              }}
              autoComplete="username"
              autoCapitalize="words"
              maxLength={24}
              placeholder="Ví dụ: Kỳ Anh"
              autoFocus
            />
            {lookupState.kind === 'checking' && <span className={styles.spinner} aria-label="Đang kiểm tra" />}
          </div>

          <div className={`${styles.nameStatus} ${styles[lookupState.kind]}`} aria-live="polite">
            {lookupState.kind === 'idle' && 'Nhập từ 2–24 ký tự để bắt đầu.'}
            {lookupState.kind === 'checking' && 'Đang kiểm tra username…'}
            {lookupState.kind === 'available' && '✓ Tên này còn trống — bạn sẽ tạo hồ sơ mới.'}
            {lookupState.kind === 'existing' && `✓ Đã tìm thấy ${lookupState.profile.displayName || username}.`}
            {lookupState.kind === 'error' && lookupState.message}
          </div>

          <div className={styles.avatarHero}>
            <div className={styles.avatarRing}>
              {previewAvatar
                ? <img src={previewAvatar} alt="Ảnh đại diện" />
                : <span>{username.trim().charAt(0).toUpperCase() || '?'}</span>}
            </div>
            <div>
              <strong>{isExisting ? 'Hồ sơ của bạn' : 'Chọn đại diện'}</strong>
              <p>{isExisting ? 'Avatar và thành tích cũ sẽ được giữ nguyên.' : 'Bạn có thể đổi lại bất cứ lúc nào.'}</p>
            </div>
          </div>

          {!isExisting && (
            <div className={styles.avatarSection}>
              <div className={styles.avatarGrid}>
                {PRESET_AVATARS.map(avatar => (
                  <button
                    key={avatar.url}
                    type="button"
                    className={`${styles.avatarOption} ${!avatarBlob && selectedAvatar === avatar.url ? styles.selected : ''}`}
                    onClick={() => {
                      setSelectedAvatar(avatar.url);
                      setAvatarBlob(undefined);
                      setAvatarPreview('');
                    }}
                    aria-label={`Chọn avatar ${avatar.label}`}
                    aria-pressed={!avatarBlob && selectedAvatar === avatar.url}
                  >
                    <img src={avatar.url} alt="" />
                  </button>
                ))}
                <button
                  type="button"
                  className={`${styles.avatarOption} ${styles.uploadOption} ${avatarBlob ? styles.selected : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Tải ảnh đại diện lên"
                >
                  {avatarPreview ? <img src={avatarPreview} alt="" /> : <span>＋</span>}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatarFile}
              />
              <button className={styles.uploadTextButton} type="button" onClick={() => fileInputRef.current?.click()}>
                Tải ảnh của bạn lên
              </button>
            </div>
          )}

          {error && <div className={styles.submitError} role="alert">{error}</div>}

          <button className={styles.submitButton} type="submit" disabled={!canSubmit || submitting}>
            <span>{submitting ? 'ĐANG VÀO LÀNG…' : isExisting ? 'TIẾP TỤC HỒ SƠ NÀY' : 'TẠO HỒ SƠ & CHƠI NGAY'}</span>
            {!submitting && <small>{isExisting ? 'Không cần mật khẩu' : 'Chỉ mất vài giây'}</small>}
          </button>
        </form>
      </section>
    </main>
  );
}
