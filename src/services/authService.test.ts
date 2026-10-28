import { describe, expect, it, vi, beforeEach } from 'vitest';
import { uploadUserAvatar } from './authService';
import { auth } from './firebase';

vi.mock('./firebase', () => ({
  app: {},
  auth: { currentUser: null },
  db: {},
}));

const mockGetDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn().mockReturnValue({}),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  runTransaction: vi.fn(),
  setDoc: vi.fn(),
}));

const mockUploadBytesResumable = vi.fn();

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn().mockReturnValue({}),
  ref: vi.fn().mockReturnValue({}),
  uploadBytesResumable: (...args: unknown[]) => mockUploadBytesResumable(...args),
  getDownloadURL: vi.fn().mockResolvedValue('https://example.com/avatar.webp'),
}));

describe('uploadUserAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as { currentUser: unknown }).currentUser = null;
  });

  it('báo lỗi khi chưa có phiên đăng nhập', async () => {
    const dummyBlob = new Blob(['dummy'], { type: 'image/webp' });
    await expect(uploadUserAvatar(dummyBlob)).rejects.toThrow('Chưa có phiên người chơi.');
  });

  it('chuyển mã lỗi Firebase Storage 404 thành thông báo tiếng Việt dễ hiểu', async () => {
    (auth as { currentUser: unknown }).currentUser = { uid: 'user_123', isAnonymous: false };

    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ displayName: 'Test User', avatar: '' }),
    });

    mockUploadBytesResumable.mockReturnValueOnce({
      cancel: vi.fn(),
      then: (_onSuccess: unknown, onError: (err: unknown) => unknown) => {
        return Promise.resolve(onError({ status_: 404, code: 'storage/unknown' }));
      },
    });

    const dummyBlob = new Blob(['dummy'], { type: 'image/webp' });
    await expect(uploadUserAvatar(dummyBlob)).rejects.toThrow(
      'Dịch vụ lưu trữ (Firebase Storage) chưa được kích hoạt cho dự án hoặc chưa mở quyền.',
    );
  });

  it('tải ảnh thành công và trả về URL ảnh', async () => {
    (auth as { currentUser: unknown }).currentUser = { uid: 'user_123', isAnonymous: false };

    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ displayName: 'Test User', avatar: '' }),
    });

    mockUploadBytesResumable.mockReturnValueOnce({
      cancel: vi.fn(),
      then: (onSuccess: (val: unknown) => unknown) => {
        return Promise.resolve(onSuccess({}));
      },
    });

    const dummyBlob = new Blob(['dummy'], { type: 'image/webp' });
    const url = await uploadUserAvatar(dummyBlob);
    expect(url).toBe('https://example.com/avatar.webp');
  });
});
