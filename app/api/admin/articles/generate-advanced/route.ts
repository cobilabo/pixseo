import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import OpenAI from 'openai';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { translateText, generateAISummary, translateFAQs } from '@/lib/openai/translate';
import { improveImagePrompt } from '@/lib/openai/improve-prompt';
import { SUPPORTED_LANGS } from '@/types/lang';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5分

/**
 * 12ステップの高度な記事生成フロー
 */
export async function POST(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    const body = await request.json();
    const {
      categoryId,
      patternId,
      writerId,
      writingStyleId,
      imagePromptPatternId,
    } = body;

    console.log('[Advanced Generate] Starting 12-step article generation...');

    if (!mediaId || !categoryId || !patternId || !writerId || !imagePromptPatternId) {
      return NextResponse.json(
        { error: 'All parameters are required' },
        { status: 400 }
      );
    }

    // === STEP 0: データ取得 ===
    console.log('[Step 0] Fetching configuration data...');

    const [categoryDoc, patternDoc, writerDoc, imagePatternDoc] = await Promise.all([
      adminDb.collection('categories').doc(categoryId).get(),
      adminDb.collection('articlePatterns').doc(patternId).get(),
      adminDb.collection('writers').doc(writerId).get(),
      adminDb.collection('imagePromptPatterns').doc(imagePromptPatternId).get(),
    ]);

    if (!categoryDoc.exists || !patternDoc.exists || !writerDoc.exists || !imagePatternDoc.exists) {
      return NextResponse.json({ error: 'One or more resources not found' }, { status: 404 });
    }

    const categoryName = categoryDoc.data()!.name;
    const patternData = patternDoc.data()!;
    const imagePatternData = imagePatternDoc.data()!;

    const grokApiKey = process.env.GROK_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!grokApiKey || !openaiApiKey) {
      return NextResponse.json({ error: 'API keys not configured' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    // === STEP 1: テーマ5つ生成 ===
    console.log('[Step 1] Generating 5 article themes...');

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const dateString = `${currentYear}年${currentMonth}月`;

    const themePrompt = `【現在の日付】${dateString}

【重要】必ず${currentYear}年の最新情報に基づいてテーマを提案してください。

以下の条件に基づいて、記事テーマを5つ提案してください。

カテゴリー: ${categoryName}
構成パターン: ${patternData.name}

構成の詳細:
${patternData.prompt}

提案する記事テーマの要件:
- ${currentYear}年の最新トレンドや情報を反映
- SEOを意識したキーワードを含む
- 読者の興味を引く魅力的なテーマ
- 上記の構成パターンで記事化しやすいテーマ
- それぞれのテーマは独立しており、重複しない

出力形式（必ず以下の形式で出力してください）:
テーマ1: [記事テーマ]
テーマ2: [記事テーマ]
テーマ3: [記事テーマ]
テーマ4: [記事テーマ]
テーマ5: [記事テーマ]`;

    const themeResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${grokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4-fast-reasoning',
        messages: [
          {
            role: 'system',
            content: `あなたはSEOに強い記事企画の専門家です。現在は${currentYear}年${currentMonth}月です。`,
          },
          {
            role: 'user',
            content: themePrompt,
          },
        ],
        stream: false,
        temperature: 0.8,
        max_tokens: 1000,
      }),
    });

    if (!themeResponse.ok) {
      throw new Error('Failed to generate themes');
    }

    const themeData = await themeResponse.json();
    const themeContent = themeData.choices?.[0]?.message?.content || '';
    
    const themeMatches = themeContent.match(/テーマ\d+[：:]\s*(.+)/g);
    const themes: string[] = [];
    
    if (themeMatches) {
      for (const match of themeMatches) {
        const theme = match.replace(/テーマ\d+[：:]\s*/, '').trim();
        if (theme) themes.push(theme);
      }
    }

    if (themes.length === 0) {
      throw new Error('No themes generated');
    }

    console.log(`[Step 1] Generated ${themes.length} themes`);

    // === STEP 2: 重複チェック ===
    console.log('[Step 2] Checking for duplicate themes...');

    const existingArticles = await adminDb
      .collection('articles')
      .where('mediaId', '==', mediaId)
      .where('isPublished', '==', true)
      .get();

    const existingTitles = existingArticles.docs.map(doc => doc.data().title);

    let selectedTheme = '';
    for (const theme of themes) {
      let isDuplicate = false;
      for (const existing of existingTitles) {
        const similarity = calculateTextSimilarity(theme, existing);
        if (similarity > 0.7) {
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) {
        selectedTheme = theme;
        break;
      }
    }

    if (!selectedTheme) {
      selectedTheme = themes[0]; // フォールバック
    }

    console.log(`[Step 2] Selected theme: ${selectedTheme}`);

    // === STEP 3: 記事ベース作成 ===
    console.log('[Step 3] Generating article base...');

    const articlePrompt = `【現在の日付】${dateString}

【重要】必ず${currentYear}年の最新情報に基づいて記事を作成してください。

以下の条件に基づいて、記事を作成してください。

記事タイトル: ${selectedTheme}
カテゴリー: ${categoryName}
構成パターン: ${patternData.name}

構成の詳細:
${patternData.prompt}

記事の要件:
- 必ず${currentYear}年の最新の情報を含む
- SEOを意識した構成
- 合計5,000文字以上の充実した記事
- 見出し構造：H2を3～5個、各H2の下にH3を2～3個配置
- 各H2見出しの下には最低600文字以上の詳細な説明文を記載
- 各H3見出しの下には最低400文字以上の具体的な説明文を記載
- 単なる概要ではなく、具体的な事例、データ、手順、メリット・デメリットなどを含む実用的な内容
- 情報が整理しやすい場合は表（<table>タグ）を使用
- 箇条書き（<ul>、<ol>）は適度に使用し、文章の流れを重視
- 各セクションで読者が実際に行動できる具体的な情報を提供
- 自然で親しみやすい、プロのライターが書いたような文章
- 「〜如き」「〜べき」のような古い表現や不自然な日本語は使わない
- 「〜してください」のような指示形の過度な使用を避ける
- 文末に文字数やメタ情報は含めない

記事の形式（必ず以下の形式で出力してください）:
タイトル: [記事タイトル]
メタディスクリプション: [SEO用の説明文、160文字以内]
本文: [HTML形式の記事本文]`;

    const articleResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${grokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4-fast-reasoning',
        messages: [
          {
            role: 'system',
            content: `あなたはSEOに強いプロのライターです。現在は${currentYear}年${currentMonth}月です。

【最重要】
1. 自然で読みやすい日本語を使用してください
2. AIが生成したような不自然な表現は避けてください
3. 「〜如き」のような古い表現は使わないでください
4. 「デザイナーは〜してください」のような指示形を過度に使わないでください
5. 文末に文字数などのメタ情報は絶対に含めないでください
6. 説教臭い文章ではなく、情報提供型の自然な文章にしてください

【記事の要件】
- 各H2見出しの下には最低600文字以上の充実した説明文
- 各H3見出しの下には最低400文字以上の具体的な説明文
- 具体的な事例、データ、手順、メリット・デメリットを含む実用的な内容
- 読者が実際に行動できる具体的な情報を提供
- 箇条書きは適度に使用し、過度な使用は避ける
- 文章の流れを重視し、段落間の接続を自然に
- 専門用語は適切に説明し、読者に優しい表現を心がける`,
          },
          {
            role: 'user',
            content: articlePrompt,
          },
        ],
        stream: false,
        temperature: 0.7,
        max_tokens: 10000,
      }),
    });

    if (!articleResponse.ok) {
      throw new Error('Failed to generate article base');
    }

    const articleData = await articleResponse.json();
    const articleContent = articleData.choices?.[0]?.message?.content || '';

    const titleMatch = articleContent.match(/タイトル[：:]\s*(.+?)(?:\n|メタディスクリプション|本文)/is);
    const metaDescMatch = articleContent.match(/メタディスクリプション[：:]\s*(.+?)(?:\n|本文)/is);
    const contentMatch = articleContent.match(/本文[：:]\s*([\s\S]+)/i);

    let title = titleMatch?.[1]?.trim() || selectedTheme;
    let metaDescription = metaDescMatch?.[1]?.trim() || '';
    let content = contentMatch?.[1]?.trim() || articleContent;

    console.log(`[Step 3] Article base created (${content.length} chars)`);

    // === STEP 4: ライティング特徴リライト（スキップ） ===
    // リライト処理は記事品質を低下させる可能性があるため、スキップします
    console.log('[Step 4] Skipping rewrite step, using original content from Grok');

    // === STEP 5 & 6: タグ自動割り当て＆新規タグ登録 ===
    console.log('[Step 5-6] Generating and assigning tags...');

    // タグ生成用にプレーンテキストを抽出
    const plainContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    const tagPrompt = `以下の記事から、検索されやすい広義で汎用的なタグを日本語で5個生成してください。

既存タグがある場合は類似するものを使用してください。
カテゴリー名（${categoryName}）と重複するタグは生成しないでください。

タイトル: ${title}
本文: ${plainContent.substring(0, 1000)}

日本語のタグをカンマ区切りで出力してください（説明は不要）。`;

    const tagResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたはSEOに強いタグ生成の専門家です。必ず日本語でタグを生成してください。',
        },
        {
          role: 'user',
          content: tagPrompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 200,
    });

    const tagsText = tagResponse.choices[0].message.content?.trim() || '';
    const generatedTags = tagsText
      .split(/[,、]/)
      .map(tag => tag.trim())
      .filter(tag => tag && tag !== categoryName);

    const tagIds: string[] = [];
    const existingTags = await adminDb
      .collection('tags')
      .where('mediaId', '==', mediaId)
      .get();

    const existingTagMap = new Map<string, string>();
    existingTags.docs.forEach(doc => {
      existingTagMap.set(doc.data().name.toLowerCase(), doc.id);
    });

    for (const tagName of generatedTags) {
      const normalizedTag = tagName.toLowerCase();
      
      if (existingTagMap.has(normalizedTag)) {
        tagIds.push(existingTagMap.get(normalizedTag)!);
      } else {
        // 新規タグを作成し、翻訳
        const slug = tagName.toLowerCase().replace(/\s+/g, '-');
        const tagData: any = {
          name: tagName,
          name_ja: tagName,
          slug,
          mediaId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        // 他言語へ翻訳
        const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');
        for (const lang of otherLangs) {
          try {
            tagData[`name_${lang}`] = await translateText(tagName, lang, 'タグ名');
          } catch (error) {
            tagData[`name_${lang}`] = tagName;
          }
        }

        const newTagRef = await adminDb.collection('tags').add(tagData);
        tagIds.push(newTagRef.id);
        existingTagMap.set(normalizedTag, newTagRef.id);
      }
    }

    console.log(`[Step 5-6] Assigned ${tagIds.length} tags`);

    // === STEP 7: アイキャッチ画像生成 ===
    console.log('[Step 7] Generating featured image...');

    const imagePrompt = `${imagePatternData.prompt}\n\nContext: This is a featured image for an article titled "${title}". ${plainContent.substring(0, 200)}`;
    
    // GPT-4oでプロンプトを改善
    const improvedFeaturedImagePrompt = await improveImagePrompt(imagePrompt, openai);

    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: improvedFeaturedImagePrompt,
      n: 1,
      size: imagePatternData.size as '1024x1024' | '1792x1024' | '1024x1792',
      quality: 'standard',
    });

    const imageUrl = imageResponse.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error('Failed to generate featured image');
    }

    const imageBuffer = Buffer.from(await (await fetch(imageUrl)).arrayBuffer());
    const optimizedImageBuffer = await sharp(imageBuffer)
      .resize(1200, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const featuredImageFileName = `featured-images/${Date.now()}-${uuidv4()}.webp`;
    const featuredImageFile = adminStorage.bucket().file(featuredImageFileName);

    await featuredImageFile.save(optimizedImageBuffer, {
      metadata: {
        contentType: 'image/webp',
        metadata: { mediaId, type: 'featured-image' },
      },
    });

    await featuredImageFile.makePublic();
    const featuredImageUrl = `https://storage.googleapis.com/${adminStorage.bucket().name}/${featuredImageFileName}`;

    await adminDb.collection('mediaLibrary').add({
      name: featuredImageFileName,
      originalName: `featured-${title}.webp`,
      url: featuredImageUrl,
      type: 'image',
      mimeType: 'image/webp',
      size: optimizedImageBuffer.length,
      mediaId,
      createdAt: new Date(),
      usageContext: 'featured-image',
    });

    console.log('[Step 7] Featured image generated');

    // === STEP 8: ライター選択（指定済み） ===
    console.log('[Step 8] Writer assigned:', writerId);

    // === STEP 9: スラッグ、メタタイトル、メタディスクリプション生成 ===
    console.log('[Step 9] Generating metadata...');

    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 60);

    if (!metaDescription) {
      metaDescription = plainContent.substring(0, 160);
    }

    const metaTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;

    console.log('[Step 9] Metadata generated');

    // === STEP 10: FAQ生成 ===
    console.log('[Step 10] Generating FAQ...');

    const faqPrompt = `以下の記事から、読者が持ちそうな質問と回答を3〜5個生成してください。

タイトル: ${title}
本文: ${plainContent.substring(0, 1500)}

出力形式:
Q: [質問]
A: [回答]

Q: [質問]
A: [回答]`;

    const faqResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたはFAQ生成の専門家です。読者の疑問を先回りして、分かりやすい回答を作成してください。',
        },
        {
          role: 'user',
          content: faqPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const faqText = faqResponse.choices[0].message.content?.trim() || '';
    const faqMatches = faqText.matchAll(/Q:\s*(.+?)\nA:\s*(.+?)(?=\n\nQ:|$)/gs);
    
    const faqs_ja: Array<{ question: string; answer: string }> = [];
    for (const match of faqMatches) {
      faqs_ja.push({
        question: match[1].trim(),
        answer: match[2].trim(),
      });
    }

    console.log(`[Step 10] Generated ${faqs_ja.length} FAQs`);

    // === STEP 11: 記事内画像生成＆配置 ===
    console.log('[Step 11] Generating inline images...');

    const headingMatches = Array.from(content.matchAll(/<h2[^>]*>.*?<\/h2>/gi)) as RegExpMatchArray[];
    const headingTexts = headingMatches.map((match: RegExpMatchArray) => match[0].replace(/<[^>]*>/g, '').trim());

    // h2タグが2つ以上ある場合のみ画像を挿入（最大2枚）
    if (headingMatches.length >= 2) {
      // 1枚目: 最初のh2タグの直後
      // 2枚目: 2番目のh2タグの直後
      const targetPositions = [0, 1].filter(idx => idx < headingMatches.length);

      // 後ろから順に挿入（インデックスがずれないように）
      for (let i = targetPositions.length - 1; i >= 0; i--) {
        try {
          const position = targetPositions[i];
          const headingMatch = headingMatches[position];
          const headingContext = headingTexts[position];

          // h2見出しの後のコンテキストテキストを抽出（最大500文字）
          const nextHeadingIndex = headingMatches[position + 1]?.index;
          const startIndex = (headingMatch.index || 0) + headingMatch[0].length;
          const endIndex = nextHeadingIndex || content.length;
          const sectionContent = content
            .substring(startIndex, endIndex)
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 500);

          const inlineImagePrompt = `${imagePatternData.prompt}

Context: This image is for an article titled "${title}". 
Section heading: "${headingContext}"
Section content: "${sectionContent}"

The image should visually represent the main concept of this section.`;

          // GPT-4oでプロンプトを改善
          const improvedInlineImagePrompt = await improveImagePrompt(inlineImagePrompt, openai);

          const inlineImageResponse = await openai.images.generate({
            model: 'dall-e-3',
            prompt: improvedInlineImagePrompt,
            n: 1,
            size: imagePatternData.size as '1024x1024' | '1792x1024' | '1024x1792',
            quality: 'standard',
          });

          const inlineImageUrl = inlineImageResponse.data?.[0]?.url;
          if (!inlineImageUrl) continue;

          const inlineImageBuffer = Buffer.from(await (await fetch(inlineImageUrl)).arrayBuffer());
          const optimizedInlineBuffer = await sharp(inlineImageBuffer)
            .resize(1200, null, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer();

          const inlineImageFileName = `inline-images/${Date.now()}-${uuidv4()}.webp`;
          const inlineImageFile = adminStorage.bucket().file(inlineImageFileName);

          await inlineImageFile.save(optimizedInlineBuffer, {
            metadata: {
              contentType: 'image/webp',
              metadata: { mediaId, type: 'inline-image' },
            },
          });

          await inlineImageFile.makePublic();
          const inlineImagePublicUrl = `https://storage.googleapis.com/${adminStorage.bucket().name}/${inlineImageFileName}`;

          await adminDb.collection('mediaLibrary').add({
            name: inlineImageFileName,
            originalName: `inline-${title}-${i}.webp`,
            url: inlineImagePublicUrl,
            type: 'image',
            mimeType: 'image/webp',
            size: optimizedInlineBuffer.length,
            mediaId,
            createdAt: new Date(),
            usageContext: 'inline-image',
          });

          // h2タグの直後に画像を挿入
          if (!headingMatch || headingMatch.index === undefined) continue;
          const insertPosition = headingMatch.index + headingMatch[0].length;
          
          const imageHtml = `\n<figure class="inline-image my-6">
  <img src="${inlineImagePublicUrl}" alt="${title} - ${headingContext}" class="w-full rounded-lg shadow-md" />
</figure>\n`;

          content = 
            content.substring(0, insertPosition) + 
            imageHtml + 
            content.substring(insertPosition);
          
          console.log(`[Step 11] Inserted image after h2 tag #${position + 1}`);
        } catch (error) {
          console.error('[Step 11] Error generating inline image:', error);
        }
      }
    }

    console.log('[Step 11] Inline images generated');

    // === STEP 12: 非公開として記事を保存 ===
    console.log('[Step 12] Saving article as draft...');

    const articleId = adminDb.collection('articles').doc().id;

    const articleDataToSave: any = {
      title,
      title_ja: title,
      content,
      content_ja: content,
      excerpt: metaDescription,
      excerpt_ja: metaDescription,
      metaTitle,
      metaTitle_ja: metaTitle,
      metaDescription,
      metaDescription_ja: metaDescription,
      slug,
      categoryIds: [categoryId],
      tagIds,
      writerId,
      featuredImage: featuredImageUrl,
      featuredImageAlt: title,
      faqs_ja,
      isPublished: false, // 非公開
      isFeatured: false,
      mediaId,
      publishedAt: new Date(),
      updatedAt: new Date(),
      createdAt: FieldValue.serverTimestamp(),
      viewCount: 0,
      likeCount: 0,
    };

    // AI Summary生成
    try {
      articleDataToSave.aiSummary = await generateAISummary(plainContent.substring(0, 1000), 'ja');
      articleDataToSave.aiSummary_ja = articleDataToSave.aiSummary;
    } catch (error) {
      console.error('[Step 12] AI Summary generation failed:', error);
    }

    await adminDb.collection('articles').doc(articleId).set(articleDataToSave);

    console.log('[Step 12] Article saved as draft');
    console.log('[Advanced Generate] 12-step generation completed!');

    return NextResponse.json({
      success: true,
      articleId,
      title,
      message: '記事を非公開として保存しました',
    });
  } catch (error) {
    console.error('[API /admin/articles/generate-advanced] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate advanced article', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

/**
 * テキストの類似度を計算（簡易版）
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;

  const normalized1 = text1.toLowerCase().trim().replace(/\s+/g, ' ');
  const normalized2 = text2.toLowerCase().trim().replace(/\s+/g, ' ');

  if (normalized1 === normalized2) return 1.0;

  const words1 = normalized1.split(/\s+/);
  const words2 = normalized2.split(/\s+/);

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

