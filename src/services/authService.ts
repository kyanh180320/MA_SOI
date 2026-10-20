import {
  signInAnonymously,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  setDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from './firebase';
import type { AppUser } from '../game/types';
import { normalizeUsername, validateUsername } from '../game/username';

export type UsernameMode = 'create' | 'resume';

export interface UsernameLookup {
  exists: boolean;
  displayName?: string;
  avatar?: string;
}

export class UsernameAuthError extends Error {
  readonly code: 'invalid-username' | 'username-taken' | 'username-not-found';

  constructor(
    code: 'invalid-username' | 'username-taken' | 'username-not-found',
    message: string,
  ) {
    super(message);
    this.name = 'UsernameAuthError';
    this.code = code;
  }
}

function toAppUser(playerId: string, data: Record<string, unknown>): AppUser {
  const avatar = typeof data.avatar === 'string'
    ? data.avatar
    : typeof data.photoURL === 'string'
      ? data.photoURL
      : '';
  return {
    uid: playerId,
    displayName: typeof data.displayName === 'string' ? data.displayName : 'Người chơi',
    email: typeof data.email === 'string' ? data.email : '',
    usernameKey: typeof data.usernameKey === 'string' ? data.usernameKey : undefined,
    role: 'user',
    avatar,
    photoURL: avatar,
  };
}

async function ensureFirebaseSession(): Promise<FirebaseUser> {
  if (auth.currentUser) return auth.currentUser;
  const credential = await signInAnonymously(auth);
  return credential.user;
}

/**
 * `users/{authUid}` chỉ là ánh xạ phiên -> playerId. Hồ sơ bền vững nằm ở
 * `players/{playerId}` để đổi trình duyệt không làm tách lịch sử/xếp hạng.
 * User Google/Email cũ vẫn được đọc trực tiếp để không làm hỏng dữ liệu cũ.
 */
export async function getUserProfile(firebaseUser: FirebaseUser): Promise<AppUser | null> {
  const sessionSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
  if (sessionSnap.exists()) {
    const sessionData = sessionSnap.data();
    const playerId = typeof sessionData.playerId === 'string' ? sessionData.playerId : null;
    if (playerId) {
      const playerSnap = await getDoc(doc(db, 'players', playerId));
      if (playerSnap.exists()) return toAppUser(playerId, playerSnap.data());
    }

    // Hồ sơ schema cũ: uid Firebase cũng chính là uid logic.
    if (typeof sessionData.displayName === 'string') {
      return toAppUser(firebaseUser.uid, sessionData);
    }
  }

  // Phiên ẩn danh mới chưa chọn username thì vẫn là khách.
  if (firebaseUser.isAnonymous) return null;

  const legacyUser: AppUser = {
    uid: firebaseUser.uid,
    displayName: firebaseUser.displayName || 'Người chơi',
    email: firebaseUser.email || '',
    role: 'user',
    avatar: firebaseUser.photoURL || '',
    photoURL: firebaseUser.photoURL || '',
  };
  await setDoc(doc(db, 'users', firebaseUser.uid), {
    ...legacyUser,
    createdAt: Date.now(),
  });
  return legacyUser;
}

export async function lookupUsername(displayName: string): Promise<UsernameLookup> {
  const validationError = validateUsername(displayName);
  if (validationError) return { exists: false };

  await ensureFirebaseSession();
  const usernameKey = normalizeUsername(displayName);
  const claimSnap = await getDoc(doc(db, 'usernames', usernameKey));
  if (!claimSnap.exists()) return { exists: false };

  const claim = claimSnap.data();
  const playerId = typeof claim.playerId === 'string' ? claim.playerId : null;
  if (!playerId) {
    return {
      exists: true,
      displayName: typeof claim.displayName === 'string' ? claim.displayName : displayName.trim(),
    };
  }

  const playerSnap = await getDoc(doc(db, 'players', playerId));
  const player = playerSnap.exists() ? playerSnap.data() : claim;
  return {
    exists: true,
    displayName: typeof player.displayName === 'string' ? player.displayName : displayName.trim(),
    avatar: typeof player.avatar === 'string' ? player.avatar : undefined,
  };
}

export async function loginWithUsername(
  displayName: string,
  avatarUrl: string,
  mode: UsernameMode,
): Promise<AppUser> {
  const validationError = validateUsername(displayName);
  if (validationError) throw new UsernameAuthError('invalid-username', validationError);

  const firebaseUser = await ensureFirebaseSession();
  const usernameKey = normalizeUsername(displayName);
  const trimmedName = displayName.trim().replace(/\s+/g, ' ');
  const claimRef = doc(db, 'usernames', usernameKey);
  const sessionRef = doc(db, 'users', firebaseUser.uid);
  const newPlayerId = doc(collection(db, 'players')).id;
  const now = Date.now();

  const profile = await runTransaction(db, async transaction => {
    const claimSnap = await transaction.get(claimRef);
    const sessionSnap = await transaction.get(sessionRef);
    if (mode === 'create' && claimSnap.exists()) {
      throw new UsernameAuthError(
        'username-taken',
        'Tên này vừa được người khác sử dụng. Hãy chọn một tên khác.',
      );
    }
    if (mode === 'resume' && !claimSnap.exists()) {
      throw new UsernameAuthError(
        'username-not-found',
        'Không tìm thấy hồ sơ này. Hãy kiểm tra lại username.',
      );
    }
    if (mode === 'create' && typeof sessionSnap.data()?.playerId === 'string') {
      throw new UsernameAuthError(
        'username-taken',
        'Một tab khác vừa tạo hồ sơ cho phiên này. Hãy tải lại trang để tiếp tục.',
      );
    }

    const claimData = claimSnap.exists() ? claimSnap.data() : null;
    const playerId = typeof claimData?.playerId === 'string' ? claimData.playerId : newPlayerId;
    const playerRef = doc(db, 'players', playerId);
    const playerSnap = claimSnap.exists() ? await transaction.get(playerRef) : null;
    const existingPlayer = playerSnap?.exists() ? playerSnap.data() : null;
    const resolvedName = typeof existingPlayer?.displayName === 'string'
      ? existingPlayer.displayName
      : typeof claimData?.displayName === 'string'
        ? claimData.displayName
        : trimmedName;
    const resolvedAvatar = typeof existingPlayer?.avatar === 'string'
      ? existingPlayer.avatar
      : mode === 'create'
        ? avatarUrl
        : '';
    const playerData = {
      playerId,
      usernameKey,
      displayName: resolvedName,
      avatar: resolvedAvatar,
      photoURL: resolvedAvatar,
      updatedAt: now,
      ...(existingPlayer ? {} : { createdAt: now }),
    };

    transaction.set(playerRef, playerData, { merge: true });
    transaction.set(claimRef, {
      playerId,
      displayName: resolvedName,
      updatedAt: now,
      ...(claimSnap.exists() ? {} : { createdAt: now }),
    }, { merge: true });
    transaction.set(sessionRef, {
      playerId,
      displayName: resolvedName,
      usernameKey,
      avatar: resolvedAvatar,
      updatedAt: now,
    }, { merge: true });

    return toAppUser(playerId, playerData);
  });

  try {
    await updateProfile(firebaseUser, {
      displayName: profile.displayName,
      photoURL: profile.avatar || null,
    });
  } catch (error) {
    console.warn('Không thể cập nhật profile cục bộ của Firebase Auth:', error);
  }
  return profile;
}

export async function uploadUserAvatar(blob: Blob): Promise<string> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Chưa có phiên người chơi.');
  const profile = await getUserProfile(firebaseUser);
  if (!profile) throw new Error('Hãy tạo hồ sơ trước khi tải ảnh đại diện.');

  const avatarRef = ref(storage, `avatars/${profile.uid}/profile.webp`);
  await uploadBytes(avatarRef, blob, {
    contentType: blob.type || 'image/webp',
    cacheControl: 'public,max-age=3600',
  });
  return getDownloadURL(avatarRef);
}

export async function updateUserProfile(displayName: string, avatarUrl: string): Promise<AppUser> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Chưa có phiên người chơi.');
  const validationError = validateUsername(displayName);
  if (validationError) throw new UsernameAuthError('invalid-username', validationError);

  const sessionRef = doc(db, 'users', firebaseUser.uid);
  const usernameKey = normalizeUsername(displayName);
  const trimmedName = displayName.trim().replace(/\s+/g, ' ');
  const now = Date.now();

  const updated = await runTransaction(db, async transaction => {
    const sessionSnap = await transaction.get(sessionRef);
    const sessionData = sessionSnap.exists() ? sessionSnap.data() : {};
    const playerId = typeof sessionData.playerId === 'string' ? sessionData.playerId : firebaseUser.uid;
    const playerRef = doc(db, 'players', playerId);
    const playerSnap = await transaction.get(playerRef);
    const playerData = playerSnap.exists() ? playerSnap.data() : sessionData;
    const oldUsernameKey = typeof playerData.usernameKey === 'string' ? playerData.usernameKey : null;
    const newClaimRef = doc(db, 'usernames', usernameKey);
    const newClaimSnap = await transaction.get(newClaimRef);
    const claimedPlayerId = newClaimSnap.exists() ? newClaimSnap.data().playerId : null;
    if (claimedPlayerId && claimedPlayerId !== playerId) {
      throw new UsernameAuthError('username-taken', 'Username này đã có người sử dụng.');
    }

    const oldClaimRef = oldUsernameKey && oldUsernameKey !== usernameKey
      ? doc(db, 'usernames', oldUsernameKey)
      : null;
    const oldClaimSnap = oldClaimRef ? await transaction.get(oldClaimRef) : null;
    const nextData = {
      playerId,
      usernameKey,
      displayName: trimmedName,
      avatar: avatarUrl,
      photoURL: avatarUrl,
      updatedAt: now,
      ...(playerSnap.exists() ? {} : { createdAt: now }),
    };

    transaction.set(playerRef, nextData, { merge: true });
    transaction.set(sessionRef, nextData, { merge: true });
    transaction.set(newClaimRef, {
      playerId,
      displayName: trimmedName,
      updatedAt: now,
      ...(newClaimSnap.exists() ? {} : { createdAt: now }),
    }, { merge: true });
    if (oldClaimRef && oldClaimSnap?.exists() && oldClaimSnap.data().playerId === playerId) {
      transaction.delete(oldClaimRef);
    }
    return toAppUser(playerId, nextData);
  });

  try {
    await updateProfile(firebaseUser, { displayName: trimmedName, photoURL: avatarUrl || null });
  } catch (error) {
    console.warn('Không thể cập nhật profile cục bộ của Firebase Auth:', error);
  }
  return updated;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}
