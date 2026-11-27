'use client';

import { getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirebase } from '@/lib/firebase/config';

/**
 * 管理画面から /api/admin/* を呼ぶときに Firebase ID トークンを
 * `Authorization: Bearer` で付ける。
 *
 * 管理画面には fetch('/api/admin/...') を直接呼んでいる箇所が多いため、
 * 呼び出し側を書き換えずに済むよう window.fetch を一度だけラップする。
 * 同一オリジンの /api/admin/ 宛てで、Authorization が未指定のリクエストだけが対象。
 */

let installed = false;

function getFirebaseAuth() {
  initializeFirebase();
  const firebaseApp = getApps()[0];
  return firebaseApp ? getAuth(firebaseApp) : null;
}

/** 現在のユーザーの ID トークン（未ログインなら null） */
export async function getAdminIdToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const auth = getFirebaseAuth();
  if (!auth) return null;
  // 起動直後は currentUser が未確定なので、認証状態の復元を待つ
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

function isAdminApiUrl(input: RequestInfo | URL): boolean {
  let raw: string;
  if (typeof input === 'string') raw = input;
  else if (input instanceof URL) raw = input.href;
  else raw = input.url;
  try {
    const url = new URL(raw, window.location.href);
    return url.origin === window.location.origin && url.pathname.startsWith('/api/admin/');
  } catch {
    return false;
  }
}

export function installAdminFetchAuth() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!isAdminApiUrl(input)) {
      return originalFetch(input, init);
    }

    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined)
    );
    if (!headers.has('authorization')) {
      try {
        const token = await getAdminIdToken();
        if (token) headers.set('authorization', `Bearer ${token}`);
      } catch (error) {
        console.error('[admin-fetch-auth] Failed to get ID token:', error);
      }
    }

    return originalFetch(input, { ...init, headers });
  };
}

if (typeof window !== 'undefined') {
  installAdminFetchAuth();
}
