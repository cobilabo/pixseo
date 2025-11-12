import { NextRequest, NextResponse } from 'next/server';
import { adminStorage, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

/**
 * OpenAI DALL-E APIを使用して画像を生成し、Firebase Storageに保存
 */
export async function POST(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    const body = await request.json();
    const { prompt, size = '1024x1024', n = 1 } = body;

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // OpenAI APIを呼び出し
    // Firebase Functions環境ではfunctions/src/index.tsでシークレットから環境変数に設定される
    // ローカル環境では.env.localから取得
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    // DALL-E APIを呼び出し
    const openaiResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: Math.min(n, 1), // DALL-E 3は1枚のみ
        size: size, // '1024x1024', '1792x1024', '1024x1792'
        quality: 'standard', // 'standard' or 'hd'
        response_format: 'url', // 'url' or 'b64_json'
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('[OpenAI DALL-E API Error]', errorData);
      return NextResponse.json(
        { error: 'Failed to generate image with DALL-E API', details: errorData },
        { status: openaiResponse.status }
      );
    }

    const openaiData = await openaiResponse.json();
    const imageUrl = openaiData.data?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'No image generated' },
        { status: 500 }
      );
    }

    // 生成された画像をFirebase Storageにダウンロードして保存
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to download generated image' },
        { status: 500 }
      );
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    
    // sharpで画像情報を取得
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const originalWidth = metadata.width || parseInt(size.split('x')[0]);
    const originalHeight = metadata.height || parseInt(size.split('x')[1]);

    // WebPに変換（最適化）
    const maxWidth = 2000;
    const resizedImage = originalWidth > maxWidth
      ? image.resize(maxWidth, null, { withoutEnlargement: true })
      : image;
    
    const optimizedBuffer = await resizedImage
      .webp({ quality: 80 })
      .toBuffer();

    // Firebase Storageにアップロード（WebP）
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileName = `articles/ai-generated/${timestamp}_${randomString}.webp`;
    
    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(fileName);
    
    await fileRef.save(optimizedBuffer, {
      metadata: {
        contentType: 'image/webp',
      },
    });

    // サムネイル生成（300x300）
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(300, 300, { fit: 'cover' })
      .webp({ quality: 70 })
      .toBuffer();
    
    const thumbnailFileName = `articles/ai-generated/thumbnails/${timestamp}_${randomString}_thumb.webp`;
    const thumbnailRef = bucket.file(thumbnailFileName);
    
    await thumbnailRef.save(thumbnailBuffer, {
      metadata: {
        contentType: 'image/webp',
      },
    });

    // 公開URLを生成
    await fileRef.makePublic();
    await thumbnailRef.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    const thumbnailUrl = `https://storage.googleapis.com/${bucket.name}/${thumbnailFileName}`;

    // Firestoreのmediaコレクションに登録（メディアライブラリで閲覧可能にする）
    const mediaData = {
      mediaId,
      name: `ai-generated_${timestamp}_${randomString}.webp`,
      originalName: `AI生成画像_${prompt.substring(0, 30)}....webp`,
      url: publicUrl,
      thumbnailUrl: thumbnailUrl,
      type: 'image',
      mimeType: 'image/webp',
      size: optimizedBuffer.length,
      width: originalWidth,
      height: originalHeight,
      alt: prompt, // プロンプトをaltとして保存
      isAiGenerated: true,
      aiPrompt: prompt,
      aiRevisedPrompt: openaiData.data?.[0]?.revised_prompt || prompt,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('media').add(mediaData);
    console.log('[API /admin/images/generate] メディアライブラリに登録:', docRef.id);

    return NextResponse.json({
      url: publicUrl,
      mediaId: docRef.id,
      revisedPrompt: openaiData.data?.[0]?.revised_prompt || prompt, // DALL-E 3はプロンプトを改善する場合がある
    });
  } catch (error) {
    console.error('[API /admin/images/generate] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate image', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

