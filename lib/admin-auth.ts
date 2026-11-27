import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import type { UserRole } from '@/types/user';

/**
 * 管理API（/api/admin/*）の認証・認可ヘルパー。
 *
 * - クライアントは Firebase ID トークンを `Authorization: Bearer <token>` で送る
 *   （管理画面では lib/admin-fetch-auth.ts が自動で付ける）。
 * - サーバー側で verifyIdToken し、users ドキュメントのロールと
 *   アクセスできる mediaId（テナント）を確かめる。
 * - リクエストが mediaId（x-media-id ヘッダー / mediaId クエリ / JSON・multipart 本文の mediaId）を
 *   指定している場合、そのテナントへのアクセス権がなければ 403。
 */

export interface AdminAuthContext {
  uid: string;
  email?: string;
  role: UserRole;
  isSuperAdmin: boolean;
  /** アクセスできる mediaId。super_admin は全テナントにアクセスできるため null */
  mediaIds: Set<string> | null;
  /** CRON_SECRET による内部呼び出しの場合 true */
  isService: boolean;
}

export interface RequireAdminOptions {
  /** super_admin のみ許可する */
  superAdminOnly?: boolean;
  /** `Authorization: Bearer ${CRON_SECRET}` による内部呼び出しを許可する */
  allowCronSecret?: boolean;
  /**
   * 対象ドキュメント（/[id] ルート）。super_admin 以外は、ドキュメントの mediaId に
   * アクセス権がなければ 403。ドキュメントが存在しない・mediaId を持たない場合は通す（各ルートで 404 など）。
   */
  doc?: { collection: string; id: string };
}

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const;

function deny(status: 401 | 403, error: string) {
  return NextResponse.json({ error }, { status, headers: NO_STORE_HEADERS });
}

/** CRON_SECRET が設定されていて、Authorization ヘッダーと一致するか */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

interface CachedPrincipal {
  role: UserRole;
  mediaIds: Set<string> | null;
  /** users ドキュメントもテナント所属もない（管理者として登録されていない） */
  unregistered: boolean;
  expiresAt: number;
}

const PRINCIPAL_TTL_MS = 60 * 1000;
const principalCache = new Map<string, CachedPrincipal>();

async function loadPrincipal(uid: string): Promise<CachedPrincipal> {
  const cached = principalCache.get(uid);
  if (cached && cached.expiresAt > Date.now()) return cached;

  const userDoc = await adminDb.collection('users').doc(uid).get();
  const userData = userDoc.exists ? userDoc.data() : undefined;
  const role: UserRole = userData?.role === 'super_admin' ? 'super_admin' : 'admin';

  let mediaIds: Set<string> | null = null;
  let unregistered = false;

  if (role !== 'super_admin') {
    const [owned, member] = await Promise.all([
      adminDb.collection('mediaTenants').where('ownerId', '==', uid).get(),
      adminDb.collection('mediaTenants').where('memberIds', 'array-contains', uid).get(),
    ]);
    mediaIds = new Set<string>();
    owned.docs.forEach((d) => mediaIds!.add(d.id));
    member.docs.forEach((d) => mediaIds!.add(d.id));
    const extra = Array.isArray(userData?.mediaIds) ? userData!.mediaIds : [];
    extra.forEach((id: unknown) => {
      if (typeof id === 'string' && id) mediaIds!.add(id);
    });
    // Firebase Auth にアカウントがあるだけ（自己登録など）のユーザーは管理者として扱わない
    unregistered = !userDoc.exists && mediaIds.size === 0;
  }

  const principal: CachedPrincipal = {
    role,
    mediaIds,
    unregistered,
    expiresAt: Date.now() + PRINCIPAL_TTL_MS,
  };
  principalCache.set(uid, principal);
  return principal;
}

/** テナントの作成・メンバー変更後などに呼んでキャッシュを捨てる */
export function invalidateAdminPrincipalCache(uid?: string) {
  if (uid) principalCache.delete(uid);
  else principalCache.clear();
}

/** リクエストが対象としている mediaId を集める（ヘッダー / クエリ / JSON 本文） */
async function collectRequestedMediaIds(request: Request): Promise<string[]> {
  const ids = new Set<string>();
  const header = request.headers.get('x-media-id');
  if (header) ids.add(header);
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('mediaId');
    if (q) ids.add(q);
  } catch {
    /* ignore */
  }
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json') && request.method !== 'GET') {
    try {
      const body = await request.clone().json();
      if (body && typeof body === 'object' && typeof body.mediaId === 'string' && body.mediaId) {
        ids.add(body.mediaId);
      }
    } catch {
      /* 本文が JSON でなければ無視（各ルートで 400 になる） */
    }
  } else if (contentType.includes('multipart/form-data')) {
    try {
      const form = await request.clone().formData();
      const value = form.get('mediaId');
      if (typeof value === 'string' && value) ids.add(value);
    } catch {
      /* ignore */
    }
  }
  return Array.from(ids);
}

/** ctx がその mediaId にアクセスできるか */
export function canAccessMedia(ctx: AdminAuthContext, mediaId: string | null | undefined): boolean {
  if (!mediaId) return false;
  if (ctx.isSuperAdmin || ctx.mediaIds === null) return true;
  return ctx.mediaIds.has(mediaId);
}

/**
 * 管理APIの先頭で呼ぶ。認証に失敗したら NextResponse（401/403）を返すので、そのまま return する。
 *
 * ```ts
 * const adminCtx = await requireAdmin(request);
 * if (adminCtx instanceof NextResponse) return adminCtx;
 * ```
 */
export async function requireAdmin(
  request: Request,
  options: RequireAdminOptions = {}
): Promise<AdminAuthContext | NextResponse> {
  if (options.allowCronSecret && isCronAuthorized(request)) {
    return {
      uid: 'cron',
      role: 'super_admin',
      isSuperAdmin: true,
      mediaIds: null,
      isService: true,
    };
  }

  const authHeader = request.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return deny(401, 'Unauthorized');
  }

  let uid: string;
  let email: string | undefined;
  try {
    const decoded = await adminAuth.verifyIdToken(match[1]);
    uid = decoded.uid;
    email = decoded.email;
  } catch {
    return deny(401, 'Unauthorized');
  }

  let principal: CachedPrincipal;
  try {
    principal = await loadPrincipal(uid);
  } catch (error) {
    console.error('[admin-auth] Failed to load principal:', error);
    return NextResponse.json(
      { error: 'Failed to verify permissions' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  if (principal.unregistered) {
    return deny(403, 'Forbidden');
  }

  const ctx: AdminAuthContext = {
    uid,
    email,
    role: principal.role,
    isSuperAdmin: principal.role === 'super_admin',
    mediaIds: principal.mediaIds,
    isService: false,
  };

  if (options.superAdminOnly && !ctx.isSuperAdmin) {
    return deny(403, 'Forbidden');
  }

  if (!ctx.isSuperAdmin) {
    const requested = await collectRequestedMediaIds(request);
    for (const mediaId of requested) {
      if (!canAccessMedia(ctx, mediaId)) {
        return deny(403, 'Forbidden');
      }
    }
  }

  if (options.doc && !ctx.isSuperAdmin && options.doc.id) {
    try {
      const snap = await adminDb.collection(options.doc.collection).doc(options.doc.id).get();
      const docMediaId = snap.exists ? snap.get('mediaId') : undefined;
      if (typeof docMediaId === 'string' && docMediaId && !canAccessMedia(ctx, docMediaId)) {
        return deny(403, 'Forbidden');
      }
    } catch (error) {
      console.error('[admin-auth] Failed to check document tenant:', error);
      return NextResponse.json(
        { error: 'Failed to verify permissions' },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }
  }

  return ctx;
}

/**
 * ctx が targetUid のアカウントを参照・変更できるか。
 * super_admin はすべて、それ以外は自分自身と、同じテナントに属する super_admin 以外のユーザーのみ。
 */
export async function canManageUser(ctx: AdminAuthContext, targetUid: string): Promise<boolean> {
  if (ctx.isSuperAdmin) return true;
  if (targetUid === ctx.uid) return true;
  const target = await loadPrincipal(targetUid);
  if (target.role === 'super_admin' || !target.mediaIds) return false;
  for (const mediaId of Array.from(target.mediaIds)) {
    if (canAccessMedia(ctx, mediaId)) return true;
  }
  return false;
}
