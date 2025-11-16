import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { adminDb, adminStorage } from '@/lib/firebase/admin';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

/**
 * 記事内に配置する画像を生成し、適切な場所に挿入
 */
export async function POST(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    const body = await request.json();
    const { title, content, imagePromptPatternId, imageCount = 2 } = body;

    if (!mediaId || !title || !content || !imagePromptPatternId) {
      return NextResponse.json(
        { error: 'Media ID, title, content, and image prompt pattern ID are required' },
        { status: 400 }
      );
    }

    // 画像プロンプトパターン情報を取得
    const patternDoc = await adminDb.collection('imagePromptPatterns').doc(imagePromptPatternId).get();
    if (!patternDoc.exists) {
      return NextResponse.json({ error: 'Image prompt pattern not found' }, { status: 404 });
    }
    const patternData = patternDoc.data()!;
    const basePrompt = patternData.prompt;
    const imageSize = patternData.size;

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    // HTMLタグを除去してテキストのみを抽出
    const plainContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    // 見出しを抽出（H2タグ）
    const headings = content.match(/<h2[^>]*>(.*?)<\/h2>/gi) || [];
    const headingTexts = headings.map(h => h.replace(/<[^>]*>/g, '').trim());

    console.log(`[Generate Inline Images] Found ${headingTexts.length} headings`);

    // 生成する画像の数を決定（最大3つ、見出しの数に応じて）
    const targetImageCount = Math.min(imageCount, 3, Math.max(1, Math.floor(headingTexts.length / 2)));

    console.log(`[Generate Inline Images] Generating ${targetImageCount} images`);

    const generatedImages: Array<{
      url: string;
      position: number; // 挿入位置（H2タグのインデックス）
      prompt: string;
    }> = [];

    // 画像を生成する位置を均等に分散
    const positions: number[] = [];
    if (targetImageCount === 1) {
      positions.push(Math.floor(headingTexts.length / 2));
    } else if (targetImageCount === 2) {
      positions.push(Math.floor(headingTexts.length / 3));
      positions.push(Math.floor((headingTexts.length * 2) / 3));
    } else {
      positions.push(Math.floor(headingTexts.length / 4));
      positions.push(Math.floor(headingTexts.length / 2));
      positions.push(Math.floor((headingTexts.length * 3) / 4));
    }

    // 各位置で画像を生成
    for (let i = 0; i < targetImageCount; i++) {
      try {
        const position = positions[i];
        if (position >= headingTexts.length) continue;

        const headingContext = headingTexts[position];
        
        // 画像生成プロンプトを構築
        const imagePrompt = `${basePrompt}\n\nContext: This image is for an article titled "${title}". The image should represent the following section: "${headingContext}". ${plainContent.substring(0, 200)}`;

        console.log(`[Generate Inline Images] Generating image ${i + 1}/${targetImageCount} for position ${position}`);

        // DALL-E 3で画像を生成
        const response = await openai.images.generate({
          model: 'dall-e-3',
          prompt: imagePrompt,
          n: 1,
          size: imageSize as '1024x1024' | '1792x1024' | '1024x1792',
          quality: 'standard',
        });

        const imageUrl = response.data[0]?.url;
        if (!imageUrl) {
          console.error(`[Generate Inline Images] No image URL returned for image ${i + 1}`);
          continue;
        }

        console.log(`[Generate Inline Images] Image ${i + 1} generated, downloading...`);

        // 画像をダウンロード
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

        // 画像を最適化（WebP変換、リサイズ）
        const optimizedBuffer = await sharp(imageBuffer)
          .resize(1200, null, { // 最大幅1200px
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 85 })
          .toBuffer();

        // Firebase Storageにアップロード
        const fileName = `inline-images/${Date.now()}-${uuidv4()}.webp`;
        const file = adminStorage.bucket().file(fileName);

        await file.save(optimizedBuffer, {
          metadata: {
            contentType: 'image/webp',
            metadata: {
              mediaId,
              type: 'inline-image',
              articleTitle: title,
            },
          },
        });

        await file.makePublic();
        const publicUrl = `https://storage.googleapis.com/${adminStorage.bucket().name}/${fileName}`;

        console.log(`[Generate Inline Images] Image ${i + 1} uploaded to ${publicUrl}`);

        // メディアライブラリに登録
        await adminDb.collection('mediaLibrary').add({
          name: fileName,
          originalName: `inline-${title}-${i + 1}.webp`,
          url: publicUrl,
          type: 'image',
          mimeType: 'image/webp',
          size: optimizedBuffer.length,
          mediaId,
          createdAt: new Date(),
          usageContext: 'inline-image',
        });

        generatedImages.push({
          url: publicUrl,
          position,
          prompt: imagePrompt,
        });
      } catch (error) {
        console.error(`[Generate Inline Images] Error generating image ${i + 1}:`, error);
        // 個別の画像生成エラーは無視して続行
      }
    }

    console.log(`[Generate Inline Images] Generated ${generatedImages.length} images`);

    // 画像を記事内に挿入
    let updatedContent = content;
    const headingMatches = Array.from(content.matchAll(/<h2[^>]*>.*?<\/h2>/gi));

    // 後ろから挿入することで位置がずれないようにする
    for (let i = generatedImages.length - 1; i >= 0; i--) {
      const image = generatedImages[i];
      if (image.position < headingMatches.length) {
        const headingMatch = headingMatches[image.position];
        const insertPosition = headingMatch.index! + headingMatch[0].length;
        
        const imageHtml = `\n<figure class="inline-image my-6">
  <img src="${image.url}" alt="${title} - ${headingTexts[image.position]}" class="w-full rounded-lg shadow-md" />
</figure>\n`;

        updatedContent = 
          updatedContent.substring(0, insertPosition) + 
          imageHtml + 
          updatedContent.substring(insertPosition);
      }
    }

    return NextResponse.json({
      content: updatedContent,
      generatedImages: generatedImages.map(img => ({
        url: img.url,
        position: img.position,
      })),
      imageCount: generatedImages.length,
    });
  } catch (error) {
    console.error('[API /admin/articles/generate-inline-images] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate inline images', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

