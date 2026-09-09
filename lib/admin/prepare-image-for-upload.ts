/**
 * Vercel Functions のリクエストボディ上限は 4.5MB（変更不可）。
 * カメラ写真などをそのまま送ると 413 FUNCTION_PAYLOAD_TOO_LARGE になるため、
 * アップロード前に長辺 2000px へ縮小する（サーバー側の最適化と同じ上限）。
 */

export const UPLOAD_MAX_EDGE_PX = 2000;
/** multipart オーバーヘッドを見込み、実ファイルはこれ以下にする */
export const UPLOAD_SAFE_MAX_BYTES = Math.floor(3.5 * 1024 * 1024);

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function loadBitmap(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode'));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('toBlob'));
      else resolve(blob);
    }, type, quality);
  });
}

function renameWithExt(name: string, ext: string): string {
  const base = name.replace(/\.[^.]+$/, '') || 'image';
  return `${base}.${ext}`;
}

export async function prepareImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    if (file.size > UPLOAD_SAFE_MAX_BYTES) {
      throw new Error(
        `ファイルサイズが大きすぎます（${formatMb(file.size)}）。${formatMb(UPLOAD_SAFE_MAX_BYTES)}以下にしてください。`
      );
    }
    return file;
  }

  if (file.type === 'image/svg+xml') {
    if (file.size > UPLOAD_SAFE_MAX_BYTES) {
      throw new Error(
        'SVGが大きすぎます。JPEG / PNG / WebP でアップロードしてください。'
      );
    }
    return file;
  }

  let img: HTMLImageElement;
  try {
    img = await loadBitmap(file);
  } catch {
    if (file.size > UPLOAD_SAFE_MAX_BYTES) {
      throw new Error(
        `この形式の画像（${formatMb(file.size)}）はアップロードできません。JPEG / PNG / WebP に変換してください。`
      );
    }
    return file;
  }

  const longest = Math.max(img.width, img.height);
  const scale = longest > UPLOAD_MAX_EDGE_PX ? UPLOAD_MAX_EDGE_PX / longest : 1;
  const needsResize = scale < 1;
  const needsCompress = file.size > UPLOAD_SAFE_MAX_BYTES;

  if (!needsResize && !needsCompress) {
    return file;
  }

  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('画像の最適化に失敗しました');
  }
  ctx.drawImage(img, 0, 0, width, height);

  const keepAlpha =
    file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif';
  const outputType = keepAlpha ? 'image/webp' : 'image/jpeg';
  const ext = keepAlpha ? 'webp' : 'jpg';

  let quality = 0.82;
  let blob = await canvasToBlob(canvas, outputType, quality);
  while (blob.size > UPLOAD_SAFE_MAX_BYTES && quality > 0.5) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, outputType, quality);
  }

  if (blob.size > UPLOAD_SAFE_MAX_BYTES) {
    throw new Error(
      `画像を縮小してもサイズが大きすぎます（${formatMb(blob.size)}）。別の画像を指定してください。`
    );
  }

  return new File([blob], renameWithExt(file.name, ext), {
    type: outputType,
    lastModified: Date.now(),
  });
}
