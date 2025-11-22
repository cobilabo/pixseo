import { adminDb, adminStorage } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import OpenAI from 'openai';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { translateText, generateAISummary } from '@/lib/openai/translate';
import { improveImagePrompt } from '@/lib/openai/improve-prompt';
import { SUPPORTED_LANGS } from '@/types/lang';

export interface GenerateAdvancedArticleParams {
  mediaId: string;
  categoryId: string;
  writerId: string;
  imagePromptPatternId: string;
}

export interface GenerateAdvancedArticleResult {
  success: boolean;
  articleId: string;
  title: string;
  message: string;
}

/**
 * 13ステップの高度な記事生成ロジック（共通関数）
 * 手動実行とCron実行の両方で使用
 */
export async function generateAdvancedArticle(
  params: GenerateAdvancedArticleParams
): Promise<GenerateAdvancedArticleResult> {
  const {
    mediaId,
    categoryId,
    writerId,
    imagePromptPatternId,
  } = params;

  console.log('[Advanced Generate] Starting 13-step article generation...');
  console.log('[Advanced Generate] Parameters:', { mediaId, categoryId, writerId, imagePromptPatternId });

  if (!mediaId || !categoryId || !writerId || !imagePromptPatternId) {
    throw new Error('All parameters are required');
  }

  // === STEP 0: データ取得 ===
  console.log('[Step 0] Fetching configuration data...');

  const [categoryDoc, writerDoc, imagePatternDoc] = await Promise.all([
    adminDb.collection('categories').doc(categoryId).get(),
    adminDb.collection('writers').doc(writerId).get(),
    adminDb.collection('imagePromptPatterns').doc(imagePromptPatternId).get(),
  ]);

  if (!categoryDoc.exists || !writerDoc.exists || !imagePatternDoc.exists) {
    throw new Error('One or more resources not found');
  }

  const categoryName = categoryDoc.data()!.name;
  const imagePatternData = imagePatternDoc.data()!;

  const grokApiKey = process.env.GROK_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  console.log('[Step 0] API keys check:', {
    hasGrokKey: !!grokApiKey,
    hasOpenaiKey: !!openaiApiKey,
  });

  if (!grokApiKey || !openaiApiKey) {
    throw new Error(`API keys not configured - GROK: ${!!grokApiKey}, OpenAI: ${!!openaiApiKey}`);
  }

  const openai = new OpenAI({ apiKey: openaiApiKey });

  // === STEP 1: キーワード選定 ===
  console.log('[Step 1] Keyword selection...');

  // 同カテゴリーの直近5記事のキーワードを取得
  let recentArticles;
  try {
    recentArticles = await adminDb
      .collection('articles')
      .where('mediaId', '==', mediaId)
      .where('categoryIds', 'array-contains', categoryId)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    console.log('[Step 1] Recent articles fetched:', recentArticles.docs.length);
  } catch (error: any) {
    console.error('[Step 1] Error fetching recent articles:', error.message);
    // Firestoreインデックスエラーの場合は、インデックスなしでクエリ
    if (error.message?.includes('index')) {
      console.log('[Step 1] Index error detected, fetching without orderBy');
      recentArticles = await adminDb
        .collection('articles')
        .where('mediaId', '==', mediaId)
        .where('categoryIds', 'array-contains', categoryId)
        .limit(5)
        .get();
    } else {
      throw error;
    }
  }

  const recentKeywords = recentArticles.docs
    .map((doc: any) => doc.data().selectedKeyword)
    .filter(Boolean);

  const recentKeywordsText = recentKeywords.length > 0
    ? `\n同カテゴリーの直近5記事のキーワード:\n${recentKeywords.map((kw: string, i: number) => `${i + 1}. ${kw}`).join('\n')}\n\n上記のキーワードとは重複しないものを選定してください。`
    : '';

  const keywordPrompt = `プロのSEOライターとして、記事を書く上で「${categoryName}」にマッチした最近話題のキーワードを選定してください。${recentKeywordsText}

出力形式:
キーワード: [選定したキーワード]`;

  let selectedKeyword = '';
  let attempts = 0;
  const maxAttempts = 3;

  while (!selectedKeyword && attempts < maxAttempts) {
    attempts++;
    
    console.log(`[Step 1] Keyword selection attempt ${attempts}/${maxAttempts}`);
    
    const keywordResponse = await fetch('https://api.x.ai/v1/chat/completions', {
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
            content: 'あなたはプロのSEOライターです。',
          },
          {
            role: 'user',
            content: keywordPrompt,
          },
        ],
        stream: false,
        temperature: 0.8,
        max_tokens: 200,
      }),
    });

    if (!keywordResponse.ok) {
      const errorText = await keywordResponse.text();
      console.error('[Step 1] Grok API error:', keywordResponse.status, errorText);
      throw new Error(`Failed to select keyword: ${keywordResponse.status} - ${errorText}`);
    }

    const keywordData = await keywordResponse.json();
    const keywordContent = keywordData.choices?.[0]?.message?.content || '';
    
    const keywordMatch = keywordContent.match(/キーワード[：:]\s*(.+)/i);
    const candidateKeyword = keywordMatch?.[1]?.trim() || '';

    // 重複チェック
    if (candidateKeyword && !recentKeywords.includes(candidateKeyword)) {
      selectedKeyword = candidateKeyword;
    }
  }

  if (!selectedKeyword) {
    throw new Error('Failed to select a unique keyword');
  }

  console.log(`[Step 1] Selected keyword: ${selectedKeyword}`);

  // === STEP 2: 事前調査 ===
  console.log('[Step 2] Preliminary research...');

  const researchPrompt = `プロのSEOライターとして、「${selectedKeyword}」を分析して、SEO記事の指示書を作成してください。

手順1: 「${selectedKeyword}」をWebで検索し、ユーザーが知りたいニーズを分析してください。

手順2: ニーズを基に、以下のフォーマットに沿って箇条書きで指示書を出力してください。

出力形式:
検索ユーザーのペルソナ（人物像）: [ペルソナ]
検索意図（顕在ニーズ）: [顕在ニーズ]
検索意図（潜在ニーズ）: [潜在ニーズ]
記事のゴール: [記事のゴール]
記事に記載すべき内容: [記事に記載すべき内容]
関連キーワード: [キーワード1], [キーワード2], [キーワード3], [キーワード4]`;

  const researchResponse = await fetch('https://api.x.ai/v1/chat/completions', {
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
          content: 'あなたはプロのSEOライターです。Web検索機能を使用して最新の情報を調査してください。',
        },
        {
          role: 'user',
          content: researchPrompt,
        },
      ],
      stream: false,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!researchResponse.ok) {
    throw new Error('Failed to conduct research');
  }

  const researchData = await researchResponse.json();
  const researchContent = researchData.choices?.[0]?.message?.content || '';

  // 正規表現で各項目を抽出
  const personaMatch = researchContent.match(/検索ユーザーのペルソナ[（(]人物像[)）][：:]\s*(.+)/i);
  const explicitNeedsMatch = researchContent.match(/検索意図[（(]顕在ニーズ[)）][：:]\s*(.+)/i);
  const latentNeedsMatch = researchContent.match(/検索意図[（(]潜在ニーズ[)）][：:]\s*(.+)/i);
  const goalMatch = researchContent.match(/記事のゴール[：:]\s*(.+)/i);
  const contentReqMatch = researchContent.match(/記事に記載すべき内容[：:]\s*(.+)/i);
  const relatedKeywordsMatch = researchContent.match(/関連キーワード[：:]\s*(.+)/i);

  const targetAudience = personaMatch?.[1]?.trim() || '';
  const explicitNeeds = explicitNeedsMatch?.[1]?.trim() || '';
  const latentNeeds = latentNeedsMatch?.[1]?.trim() || '';
  const articleGoal = goalMatch?.[1]?.trim() || '';
  const contentRequirements = contentReqMatch?.[1]?.trim() || '';
  const relatedKeywordsText = relatedKeywordsMatch?.[1]?.trim() || '';
  const relatedKeywords = relatedKeywordsText
    .split(/[,、]/)
    .map((kw: string) => kw.trim())
    .filter(Boolean)
    .slice(0, 4);

  console.log('[Step 2] Research completed');
  console.log(`  - Persona: ${targetAudience}`);
  console.log(`  - Related keywords: ${relatedKeywords.join(', ')}`);

  // === STEP 3: タイトル作成 ===
  console.log('[Step 3] Creating title...');

  const titlePrompt = `プロのSEOライターとして回答してください。

「${targetAudience}」をターゲットにした記事を書きたいです。

キーワードは「${selectedKeyword}」です。

キーワードを含めた、ユーザーが読みたくなるようなタイトルを25-32文字で作成してください。

出力形式:
タイトル: [タイトル]`;

  const titleResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'あなたはプロのSEOライターです。',
      },
      {
        role: 'user',
        content: titlePrompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 200,
  });

  const titleContent = titleResponse.choices[0].message.content?.trim() || '';
  const titleMatch = titleContent.match(/タイトル[：:]\s*(.+)/i);
  const title = titleMatch?.[1]?.trim() || selectedKeyword;

  console.log(`[Step 3] Title created: ${title}`);

  // === STEP 4: アウトライン作成 ===
  console.log('[Step 4] Creating outline...');

  const outlinePrompt = `プロのSEOライターとして回答してください。

以下の情報を考慮して、ユーザーが読み進めたくなるようなブログ記事のアウトライン（構成）を考えてください。

尚、文字数は5,000文字程度を想定してください。

また、大見出しには不自然にならない程度にキーワードを含めてください。

# タイトル
${title}

# キーワード
${selectedKeyword}

# 関連キーワード
${relatedKeywords.join('、')}

# 顕在ニーズ
${explicitNeeds}

# 潜在ニーズ
${latentNeeds}

# 記事のゴール
${articleGoal}

# 記事に記載すべき内容
${contentRequirements}

出力形式（HTMLタグで出力してください）:
<h2>大見出し1</h2>
<h3>小見出し1-1</h3>
<h3>小見出し1-2</h3>
<h2>大見出し2</h2>
<h3>小見出し2-1</h3>
<h3>小見出し2-2</h3>`;

  const outlineResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'あなたはプロのSEOライターです。',
      },
      {
        role: 'user',
        content: outlinePrompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  const outline = outlineResponse.choices[0].message.content?.trim() || '';

  console.log('[Step 4] Outline created');

  // === STEP 5: 導入文作成 ===
  console.log('[Step 5] Creating introduction...');

  const introPrompt = `プロのSEOライターとして回答してください。

以下の情報を考慮して、ユーザーが読み進めたくなるようなブログ記事の導入文を200-300文字以内で考えてください。

質問から始めて、メリットに焦点を当ててください。

# タイトル
${title}

# キーワード
${selectedKeyword}

# 顕在ニーズ
${explicitNeeds}

# 潜在ニーズ
${latentNeeds}

出力形式（HTMLのpタグで出力してください）:
<p>導入文の内容...</p>`;

  const introResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'あなたはプロのSEOライターです。',
      },
      {
        role: 'user',
        content: introPrompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  const introduction = introResponse.choices[0].message.content?.trim() || '';

  console.log('[Step 5] Introduction created');

  // === STEP 6: 本文作成 ===
  console.log('[Step 6] Creating main content...');

  const bodyPrompt = `プロのSEOライターとして、以下のキーワードと構成案に沿って、本文をHTMLにて執筆してください。

必要があれば表も用いてください。

# キーワード
${selectedKeyword}

# 構成案
${outline}

# ユーザーが入力したキーワードのニーズに回答するための記事を作成します。

# 各h2の総文字数は日本語で1,000-2,000、各h3、h4は200-400文字以上で出力してください。

# 各見出しの文章は日本語4文以上で出力してください。

# 各h2の下部には100-200文字程度で見出しのリード文を出力してください。

出力形式:
構成案に沿ったHTML形式の本文（h2, h3, h4, p, ul, ol, table などを使用）`;

  const bodyResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'あなたはプロのSEOライターです。',
      },
      {
        role: 'user',
        content: bodyPrompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 10000,
  });

  let mainContent = bodyResponse.choices[0].message.content?.trim() || '';

  // HTMLタグのクリーンアップ
  mainContent = mainContent.replace(/```html\n?/g, '').replace(/```\n?/g, '');
  mainContent = mainContent.replace(/\n{3,}/g, '\n\n');
  mainContent = mainContent.replace(/>\s+</g, '><');
  mainContent = mainContent.replace(/<\/p>\s+<p>/g, '</p>\n<p>');
  mainContent = mainContent.replace(/<\/h2>\s+<p>/g, '</h2>\n<p>');
  mainContent = mainContent.replace(/<\/h3>\s+<p>/g, '</h3>\n<p>');

  // 導入文と本文を結合
  let content = introduction + '\n' + mainContent;

  console.log(`[Step 6] Main content created (${content.length} chars)`);

  // === STEP 7: タグ自動割り当て＆新規タグ登録 ===
  console.log('[Step 7] Assigning tags...');

  // タグは選定したキーワード + 関連キーワード（4つ）= 合計5つ
  const tagsToCreate = [selectedKeyword, ...relatedKeywords];
  const tagIds: string[] = [];

  // 既存タグを取得
  const existingTags = await adminDb
    .collection('tags')
    .where('mediaId', '==', mediaId)
    .get();

  const existingTagMap = new Map<string, { id: string; name: string }>();
  existingTags.docs.forEach((doc: any) => {
    const tagData = doc.data();
    const normalizedName = tagData.name.toLowerCase();
    existingTagMap.set(normalizedName, { id: doc.id, name: tagData.name });
  });

  for (const tagName of tagsToCreate) {
    const normalizedTag = tagName.toLowerCase();
    
    if (existingTagMap.has(normalizedTag)) {
      // 既存タグを使用
      const existingTag = existingTagMap.get(normalizedTag)!;
      tagIds.push(existingTag.id);
      console.log(`[Step 7] Using existing tag: "${existingTag.name}"`);
    } else {
      // 新規タグを作成
      let slug = tagName.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-');
      
      // 日本語が含まれている場合はOpenAIで英語化
      if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(slug)) {
        try {
          const slugResponse = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: '日本語のタグ名を、SEOに最適化された短く簡潔な英語のURLスラッグに変換してください。スラッグは小文字のみを使用し、単語間はハイフン(-)で区切ってください。最大3単語以内に収めてください。',
              },
              {
                role: 'user',
                content: `以下の日本語タグ名を英語のURLスラッグに変換してください。\n\nタグ名: ${tagName}\n\nスラッグのみを出力してください（説明は不要）。`,
              },
            ],
            temperature: 0.2,
            max_tokens: 50,
          });
          
          const generatedSlug = slugResponse.choices[0].message.content?.trim() || '';
          if (generatedSlug) {
            slug = generatedSlug
              .toLowerCase()
              .replace(/[^a-z0-9-]/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-+|-+$/g, '');
          }
        } catch (error) {
          console.error('[Step 7] Failed to generate English slug:', error);
          slug = slug.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '') || `tag-${Date.now()}`;
        }
      }
      
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
      existingTagMap.set(normalizedTag, { id: newTagRef.id, name: tagName });
      console.log(`[Step 7] Created new tag: "${tagName}"`);
    }
  }

  console.log(`[Step 7] Assigned ${tagIds.length} tags`);

  // === STEP 8: アイキャッチ画像生成 ===
  console.log('[Step 8] Generating featured image...');

  const imagePrompt = `${imagePatternData.prompt}

This is a featured image for an article titled "${title}".`;
  
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

  console.log('[Step 8] Featured image generated');

  // === STEP 9: ライター選択 ===
  console.log('[Step 9] Writer assigned:', writerId);

  // === STEP 10: スラッグ、メタタイトル、メタディスクリプション生成 ===
  console.log('[Step 10] Generating metadata...');

  const plainContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  let baseSlug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 60);
  
  // 重複チェック & 一意化
  let slug = baseSlug;
  let counter = 1;
  let isDuplicate = true;
  
  while (isDuplicate && counter < 100) {
    const existingArticles = await adminDb
      .collection('articles')
      .where('mediaId', '==', mediaId)
      .where('slug', '==', slug)
      .limit(1)
      .get();
    
    if (existingArticles.empty) {
      isDuplicate = false;
    } else {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }
  
  console.log('[Step 10] Unique slug generated:', slug);

  const metaDescription = plainContent.substring(0, 160);
  const metaTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;

  console.log('[Step 10] Metadata generated');

  // === STEP 11: FAQ生成 ===
  console.log('[Step 11] Generating FAQ...');

  const faqPrompt = `以下の記事に基づいて、読者が抱くであろう質問とその回答を3〜5個生成してください。

タイトル: ${title}
本文: ${plainContent.substring(0, 3000)}

出力形式（必ず半角コロンを使用してください）:
Q: [質問]
A: [回答]

Q: [質問]
A: [回答]

重要：必ず「Q:」「A:」の形式（半角Qと半角コロン）で出力してください。`;

  const faqResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'あなたはFAQ生成の専門家です。読者の疑問を先回りして、分かりやすい回答を作成してください。必ず「Q:」「A:」の形式で出力してください。',
      },
      {
        role: 'user',
        content: faqPrompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 1500,
  });

  const faqText = faqResponse.choices[0]?.message?.content?.trim() || '';
  const faqMatches = Array.from(faqText.matchAll(/[QＱ][:\：]\s*([^\n]+)\s*\n\s*[AＡ][:\：]\s*([^\n]+(?:\n(?![QＱ][:\：])[^\n]+)*)/gi));
  
  const faqs_ja: Array<{ question: string; answer: string }> = [];
  for (const match of faqMatches) {
    if (match[1] && match[2]) {
      faqs_ja.push({
        question: match[1].trim(),
        answer: match[2].trim().replace(/\n+/g, ' '),
      });
    }
  }

  console.log(`[Step 11] Generated ${faqs_ja.length} FAQs`);

  // === STEP 12: 記事内画像生成＆配置 ===
  console.log('[Step 12] Generating inline images...');

  const headingMatches = Array.from(content.matchAll(/<h2[^>]*>.*?<\/h2>/gi)) as RegExpMatchArray[];
  const headingTexts = headingMatches.map((match: RegExpMatchArray) => match[0].replace(/<[^>]*>/g, '').trim());

  console.log(`[Step 12] Found ${headingMatches.length} h2 tags`);

  if (headingMatches.length >= 1) {
    // 画像生成を最初の4つのh2タグに制限（処理時間短縮のため）
    const maxImages = Math.min(4, headingMatches.length);
    const targetPositions = Array.from({ length: maxImages }, (_, i) => i);
    console.log(`[Step 12] Generating ${maxImages} images`);

    for (let i = targetPositions.length - 1; i >= 0; i--) {
      try {
        const position = targetPositions[i];
        const headingMatch = headingMatches[position];
        const headingContext = headingTexts[position];
        
        console.log(`[Step 12] Generating image for h2 #${position + 1}: "${headingContext}"`);

        const inlineImagePrompt = `${imagePatternData.prompt}

Section heading: "${headingContext}"

The image should visually represent the main concept of this section.`;

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

        if (!headingMatch || headingMatch.index === undefined) continue;
        const insertPosition = headingMatch.index + headingMatch[0].length;
        
        const imageHtml = `<figure class="inline-image my-6"><img src="${inlineImagePublicUrl}" alt="${title} - ${headingContext}" class="w-full rounded-lg shadow-md" /></figure>`;

        content = 
          content.substring(0, insertPosition) + 
          imageHtml + 
          content.substring(insertPosition);
        
        console.log(`[Step 12] Inserted image after h2 tag #${position + 1}`);
      } catch (error) {
        console.error(`[Step 12] Error generating inline image for h2 #${position + 1}:`, error);
        console.error('[Step 12] Error details:', error instanceof Error ? error.message : String(error));
        // エラーが発生しても処理を継続
        continue;
      }
    }
  }

  console.log('[Step 12] Image generation loop completed');

  console.log('[Step 12] Inline images generated');

  // === STEP 13: 非公開として記事を保存 ===
  console.log('[Step 13] Saving article as draft...');
  console.log('[Step 13] Article data:', {
    title,
    slug,
    categoryIds: [categoryId],
    tagIds: tagIds.length,
    writerId,
    faqs: faqs_ja.length,
    contentLength: content.length,
  });

  const articleId = adminDb.collection('articles').doc().id;
  console.log('[Step 13] Generated article ID:', articleId);

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
    isPublished: false,
    isFeatured: false,
    mediaId,
    publishedAt: new Date(),
    updatedAt: new Date(),
    createdAt: FieldValue.serverTimestamp(),
    viewCount: 0,
    likeCount: 0,
    // 新規フィールド（管理用）
    selectedKeyword,
    relatedKeywords,
    explicitNeeds,
    latentNeeds,
    articleGoal,
    contentRequirements,
    targetAudience,
  };

  // AI Summary生成
  console.log('[Step 13] Generating AI summary...');
  try {
    articleDataToSave.aiSummary = await generateAISummary(plainContent.substring(0, 1000), 'ja');
    articleDataToSave.aiSummary_ja = articleDataToSave.aiSummary;
    console.log('[Step 13] AI summary generated');
  } catch (error) {
    console.error('[Step 13] AI Summary generation failed:', error);
    console.error('[Step 13] Continuing without AI summary');
  }

  console.log('[Step 13] Saving to Firestore...');
  await adminDb.collection('articles').doc(articleId).set(articleDataToSave);

  console.log('[Step 13] Article saved as draft successfully');
  console.log('[Advanced Generate] 13-step generation completed successfully!');
  console.log('[Advanced Generate] Article ID:', articleId);
  console.log('[Advanced Generate] Title:', title);

  return {
    success: true,
    articleId,
    title,
    message: '記事を非公開として保存しました',
  };
}

