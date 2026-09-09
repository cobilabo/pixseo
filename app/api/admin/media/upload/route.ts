import { NextResponse } from 'next/server';
import { adminStorage, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import sharp from 'sharp';
import { findReusableMedia, hashMediaBuffer } from '@/lib/admin/media-dedup';

export const dynamic = 'force-dynamic';

// 注意: Vercel Functions のリクエストボディ上限は 4.5MB。
// クライアント側で lib/admin/prepare-image-for-upload.ts により縮小してから送ること。

// メディアアップロード
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const mediaId = formData.get('mediaId') as string | null;
    const alt = (formData.get('alt') as string | null) || '';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const bucket = adminStorage.bucket();
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (isImage) {
      // 画像の場合：最適化処理
      const image = sharp(buffer);
      const metadata = await image.metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      // 最大幅2000pxにリサイズ（アスペクト比維持）
      const maxWidth = 2000;
      const resizedImage = width > maxWidth 
        ? image.resize(maxWidth, null, { withoutEnlargement: true })
        : image;

      // WebP形式に変換（品質80%）
      const optimizedBuffer = await resizedImage
        .webp({ quality: 80 })
        .toBuffer();
      
      const finalSize = optimizedBuffer.length;
      const contentHash = hashMediaBuffer(optimizedBuffer);
      const existing = await findReusableMedia(adminDb, {
        mediaId,
        contentHash,
        originalName: file.name,
        size: finalSize,
        width,
        height,
        allowOriginalMetaFallback: true,
      });
      if (existing) {
        return NextResponse.json({
          id: existing.id,
          url: existing.url,
          thumbnailUrl: existing.thumbnailUrl || existing.url,
          reused: true,
        });
      }

      // メイン画像をアップロード
      const mainPath = `media/images/${timestamp}_${sanitizedName.replace(/\.[^.]+$/, '.webp')}`;
      const mainFile = bucket.file(mainPath);
      await mainFile.save(optimizedBuffer, {
        metadata: { contentType: 'image/webp' },
      });
      const uploadUrl = await getPublicUrl(mainFile);

      // サムネイル生成（300x300）
      const thumbnailBuffer = await sharp(buffer)
        .resize(300, 300, { fit: 'cover' })
        .webp({ quality: 70 })
        .toBuffer();
      
      const thumbnailPath = `media/thumbnails/${timestamp}_${sanitizedName.replace(/\.[^.]+$/, '.webp')}`;
      const thumbnailFile = bucket.file(thumbnailPath);
      await thumbnailFile.save(thumbnailBuffer, {
        metadata: { contentType: 'image/webp' },
      });
      const thumbnailUrl = await getPublicUrl(thumbnailFile);

      const mediaData = {
        mediaId,
        name: `${timestamp}_${sanitizedName}`,
        originalName: file.name,
        url: uploadUrl,
        thumbnailUrl: thumbnailUrl || uploadUrl,
        type: 'image' as const,
        mimeType: 'image/webp',
        size: finalSize,
        width,
        height,
        contentHash,
        alt: alt || file.name.replace(/\.[^.]+$/, ''),
        usageContext: 'general',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      const docRef = await adminDb.collection('mediaLibrary').add(mediaData);
      return NextResponse.json({
        id: docRef.id,
        url: uploadUrl,
        thumbnailUrl: thumbnailUrl || uploadUrl,
        reused: false,
      });

    } else if (isVideo) {
      const contentHash = hashMediaBuffer(buffer);
      const existing = await findReusableMedia(adminDb, {
        mediaId,
        contentHash,
        originalName: file.name,
        size: file.size,
        allowOriginalMetaFallback: true,
      });
      if (existing) {
        return NextResponse.json({
          id: existing.id,
          url: existing.url,
          thumbnailUrl: existing.thumbnailUrl || existing.url,
          reused: true,
        });
      }

      const videoPath = `media/videos/${timestamp}_${sanitizedName}`;
      const videoFile = bucket.file(videoPath);
      await videoFile.save(buffer, {
        metadata: { contentType: file.type },
      });
      const uploadUrl = await getPublicUrl(videoFile);

      const mediaData = {
        mediaId,
        name: `${timestamp}_${sanitizedName}`,
        originalName: file.name,
        url: uploadUrl,
        thumbnailUrl: uploadUrl,
        type: 'video' as const,
        mimeType: file.type,
        size: file.size,
        width: 0,
        height: 0,
        contentHash,
        alt: alt || file.name.replace(/\.[^.]+$/, ''),
        usageContext: 'general',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      const docRef = await adminDb.collection('mediaLibrary').add(mediaData);
      return NextResponse.json({
        id: docRef.id,
        url: uploadUrl,
        thumbnailUrl: uploadUrl,
        reused: false,
      });
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[API Media Upload] エラー:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload media' }, { status: 500 });
  }
}

// 公開URLを取得
async function getPublicUrl(file: any): Promise<string> {
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: '03-09-2491',
  });
  return url;
}

