import { NextResponse } from 'next/server';
import { adminStorage, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

// メディアアップロード
export async function POST(request: Request) {
  try {
    console.log('[API Media Upload] アップロード開始');
    
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.log('[API Media Upload] ファイル名:', file.name);
    console.log('[API Media Upload] MIMEタイプ:', file.type);
    console.log('[API Media Upload] サイズ:', file.size);

    const buffer = Buffer.from(await file.arrayBuffer());
    const bucket = adminStorage.bucket();
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    let uploadUrl = '';
    let thumbnailUrl = '';
    let width = 0;
    let height = 0;
    let finalSize = file.size;

    if (isImage) {
      // 画像の場合：最適化処理
      console.log('[API Media Upload] 画像を最適化中...');
      
      const image = sharp(buffer);
      const metadata = await image.metadata();
      width = metadata.width || 0;
      height = metadata.height || 0;

      // 最大幅2000pxにリサイズ（アスペクト比維持）
      const maxWidth = 2000;
      const resizedImage = width > maxWidth 
        ? image.resize(maxWidth, null, { withoutEnlargement: true })
        : image;

      // WebP形式に変換（品質80%）
      const optimizedBuffer = await resizedImage
        .webp({ quality: 80 })
        .toBuffer();
      
      finalSize = optimizedBuffer.length;
      
      console.log('[API Media Upload] 最適化完了:', {
        original: file.size,
        optimized: finalSize,
        reduction: `${((1 - finalSize / file.size) * 100).toFixed(1)}%`,
      });

      // メイン画像をアップロード
      const mainPath = `media/images/${timestamp}_${sanitizedName.replace(/\.[^.]+$/, '.webp')}`;
      const mainFile = bucket.file(mainPath);
      await mainFile.save(optimizedBuffer, {
        metadata: { contentType: 'image/webp' },
      });
      uploadUrl = await getPublicUrl(mainFile);

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
      thumbnailUrl = await getPublicUrl(thumbnailFile);

    } else if (isVideo) {
      // 動画の場合：そのままアップロード
      console.log('[API Media Upload] 動画をアップロード中...');
      
      const videoPath = `media/videos/${timestamp}_${sanitizedName}`;
      const videoFile = bucket.file(videoPath);
      await videoFile.save(buffer, {
        metadata: { contentType: file.type },
      });
      uploadUrl = await getPublicUrl(videoFile);

      // 動画のサムネイルは別途生成が必要（今回は省略）
      // thumbnailUrl = ''; // 実装する場合はffmpegなどを使用

    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    // Firestoreにメタデータを保存
    const mediaData = {
      name: `${timestamp}_${sanitizedName}`,
      originalName: file.name,
      url: uploadUrl,
      thumbnailUrl: thumbnailUrl || uploadUrl,
      type: isImage ? 'image' : 'video',
      mimeType: isImage ? 'image/webp' : file.type,
      size: finalSize,
      width,
      height,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('media').add(mediaData);
    console.log('[API Media Upload] アップロード成功:', docRef.id);

    return NextResponse.json({ 
      id: docRef.id,
      url: uploadUrl,
      thumbnailUrl: thumbnailUrl || uploadUrl,
    });
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

