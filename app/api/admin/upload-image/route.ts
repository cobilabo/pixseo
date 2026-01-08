import { NextResponse } from 'next/server';
import { adminStorage } from '@/lib/firebase/admin';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.error('[API Upload] ファイルが見つかりません');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    // ArrayBufferに変換
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const bucket = adminStorage.bucket();
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);

    // 画像かどうかをチェック
    const isImage = file.type.startsWith('image/');

    if (isImage) {
      // sharpで画像情報を取得
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
      
      // WebP画像をアップロード
      const fileName = `articles/${timestamp}_${randomString}.webp`;
      const fileRef = bucket.file(fileName);
      
      await fileRef.save(optimizedBuffer, {
        metadata: {
          contentType: 'image/webp',
        },
      });
      // 公開URLを生成
      await fileRef.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      return NextResponse.json({ url: publicUrl });
    } else {
      // 画像以外はそのままアップロード
      const extension = file.name.split('.').pop();
      const fileName = `articles/${timestamp}_${randomString}.${extension}`;
      const fileRef = bucket.file(fileName);
      
      await fileRef.save(buffer, {
        metadata: {
          contentType: file.type,
        },
      });

      await fileRef.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      return NextResponse.json({ url: publicUrl });
    }
  } catch (error: any) {
    console.error('[API Upload] エラー:', error);
    console.error('[API Upload] エラー詳細:', error?.message);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
