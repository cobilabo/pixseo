/**
 * next.config.js の images.domains / remotePatterns と整合させる。
 * 一致しない外部 URL は next/image ではなく通常の <img> で描画する（ランタイムエラー防止）。
 */
export function isSrcAllowedForNextImage(src: string): boolean {
  if (!src || typeof src !== 'string') return false;
  const s = src.trim();
  if (!s) return false;
  if (s.startsWith('/')) return true;
  if (s.startsWith('data:')) return false;

  try {
    const url = new URL(s);
    const h = url.hostname.toLowerCase();

    if (h === 'firebasestorage.googleapis.com') return true;
    if (h.endsWith('.the-ayumi.jp') || h === 'the-ayumi.jp') return true;
    if (h.endsWith('.googleusercontent.com')) return true;
    if (h.endsWith('.firebaseapp.com')) return true;
    if (h.endsWith('.web.app')) return true;
    if (h.endsWith('.googleapis.com')) return true;
    if (h === 'secure.gravatar.com' || h.endsWith('.gravatar.com')) return true;

    return false;
  } catch {
    return false;
  }
}
