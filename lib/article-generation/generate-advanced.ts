import { adminDb, adminStorage } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import OpenAI from 'openai';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { translateText, generateAISummary, translateFAQs } from '@/lib/openai/translate';
import { improveImagePrompt } from '@/lib/openai/improve-prompt';
import { SUPPORTED_LANGS } from '@/types/lang';

export interface GenerateAdvancedArticleParams {
  mediaId: string;
  categoryId: string;
  patternId: string;
  writerId: string;
  imagePromptPatternId: string;
  targetAudience: string;
}

export interface GenerateAdvancedArticleResult {
  success: boolean;
  articleId: string;
  title: string;
  message: string;
}

/**
 * 12ステップの高度な記事生成ロジック（共通関数）
 * 手動実行とCron実行の両方で使用
 */
export async function generateAdvancedArticle(
  params: GenerateAdvancedArticleParams
): Promise<GenerateAdvancedArticleResult> {
  const {
    mediaId,
    categoryId,
    patternId,
    writerId,
    imagePromptPatternId,
    targetAudience,
  } = params;

  console.log('[Advanced Generate] Starting 12-step article generation...');

  if (!mediaId || !categoryId || !patternId || !writerId || !imagePromptPatternId || !targetAudience) {
    throw new Error('All parameters are required');
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
    throw new Error('One or more resources not found');
  }

  const categoryName = categoryDoc.data()!.name;
  const patternData = patternDoc.data()!;
  const imagePatternData = imagePatternDoc.data()!;

  const grokApiKey = process.env.GROK_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!grokApiKey || !openaiApiKey) {
    throw new Error('API keys not configured');
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

【想定読者（ペルソナ）】
${targetAudience}

以下の条件に基づいて、記事を作成してください。

記事タイトル: ${selectedTheme}
カテゴリー: ${categoryName}
構成パターン: ${patternData.name}

構成の詳細:
${patternData.prompt}

【記事の要件】
■ ターゲットと視点
- この記事は「${targetAudience}」に向けて書かれています
- 記事全体を通じて、この読者層を一貫して意識した文体・内容にしてください
- 「デザイナーは...」「企業は...」など、読者が不明確な表現は避けてください

■ オリジナリティと実践性
- **必須**: H2レベルで「実践事例」または「私たちの取り組み」セクションを1つ以上含めてください
- 実践事例では、架空でも構わないので、ライター自身がこのテーマで実践した経験を、失敗談や学びを含めて500-800字で記述してください
- 他社事例だけでなく、オリジナルの視点や経験を提供することで、記事の独自性を高めてください

■ 構成の多様性（重要）
- **絶対禁止**: 「メリットは...、デメリットとして...、手順は...、次に...、事例として...」のような機械的な定型フォーマット
- H3見出しは自然な会話調で、読者の疑問に答える形式で執筆してください
- 以下のようなバリエーションを活用してください:
  * ストーリー形式: "ある日、私たちは..."
  * Q&A形式: "よくある質問: ○○はどうすれば？"
  * 比較形式: "AとBの違いは？"
  * チェックリスト形式: "導入前に確認すべき5つのポイント"
- 各セクションが読み物として自然につながるように心がけてください

■ 統計データとリンクの扱い（最重要）
- **絶対禁止**: 統計データ、調査結果、具体的な数値の記載
- **絶対禁止**: 「○○の調査によると」「××%」「○○社のレポートでは」などの表現
- **絶対禁止**: 外部リンクやURLの記載（すべて404エラーのリスクがあるため）
- **必須**: 一般論、業界の常識、理論的な説明のみで記述してください
- **推奨される表現**:
  * 「一般的に」「多くの企業で」「効果が期待されている」
  * 「業界では広く知られている」「実務経験から」
  * 「実際のプロジェクトでは」「現場で確認されている」
- **代替手段**: 統計の代わりに、具体的な実践事例や体験談を充実させてください

■ 基本的な構成（構成パターンに従う）
- 合計3,000〜3,500文字の読みやすい記事
- 見出し構造は構成パターンに従う（通常: H2を2〜3個、各H2の下にH3を2〜3個配置）
- 各H2見出しの直下には150〜200文字の軽い導入文を記載
- 各H3見出しの下には250〜350文字の具体的な説明文を記載

■ 専門用語の扱い
- 専門用語は最小限に抑える
- 使用する場合は必ず簡潔な説明を追加（例: 「レスポンシブデザイン（画面サイズに応じて自動調整されるデザイン）」）
- 初心者でも理解できる平易な表現を優先

■ 文体と表現
- 自然で親しみやすい、プロのライターが書いたような文章
- 「〜如き」「〜べき」のような古い表現や不自然な日本語は使わない
- 「〜してください」のような指示形の過度な使用を避ける
- 文末、段落の最後、セクションの最後に「（文字数: XXX）」などのメタ情報は絶対に含めない

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

【最重要：絶対遵守事項】
1. 自然で読みやすい日本語を使用してください
2. AIが生成したような不自然な表現は避けてください
3. 「〜如き」のような古い表現は使わないでください
4. 「デザイナーは〜してください」のような指示形を過度に使わないでください
5. 文末や段落の最後に「（文字数: 約XXX文字）」などのメタ情報は絶対に含めないでください
6. 説教臭い文章ではなく、情報提供型の自然な文章にしてください

【ペルソナと一貫性】
- 記事全体を通じて、想定読者「${targetAudience}」を一貫して意識してください
- 読者が誰なのかを明確にし、「デザイナーは...」「企業は...」など曖昧な表現は避けてください

【構成の多様性（最重要）】
- **絶対禁止**: 「メリットは...、デメリットとして...、手順は...、次に...、事例として...」の定型フォーマット
- H3見出しはストーリー形式、Q&A形式、比較形式、チェックリスト形式など、多様な構成を使ってください
- 読者の疑問に自然に答えるような、会話調の見出しを心がけてください

【実践事例の必須化】
- H2レベルまたはH3レベルで「実践事例」または「私たちの取り組み」セクションを必ず1つ以上含めてください
- 架空でも構わないので、ライター自身の実践経験を、失敗談や学びを含めて200〜300字で簡潔に記述してください

【統計データとリンクの扱い（最重要）】
- **絶対禁止**: 統計データ、調査結果、具体的な数値、外部リンクの記載
- **絶対禁止**: 「○○の調査によると」「××%」「○○社のレポートでは」などの表現
- **必須**: 一般論、業界の常識、理論的な説明のみで記述
- **推奨表現**: 「一般的に」「多くの企業で」「業界では広く知られている」「実務経験から」
- **代替手段**: 統計の代わりに、具体的な実践事例や体験談を充実させてください

【記事の要件】
- 各H2見出しの直下には150〜200文字の軽い導入文
- 各H3見出しの下には250〜350文字の具体的な説明文
- 箇条書きは適度に使用し、過度な使用は避ける
- 文章の流れを重視し、段落間の接続を自然に
- 専門用語は最小限に抑え、使用時は必ず簡潔な説明を追加
- 初心者でも理解できる平易な表現を優先`,
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

  // 余計な改行をクリーンアップ（3つ以上の連続改行を2つに）
  content = content.replace(/\n{3,}/g, '\n\n');
  
  // タグ間の不要な空白を削除（ただし、pタグの内容は保持）
  content = content.replace(/>\s+</g, '><');
  
  // 段落タグの後の余分な改行を削除
  content = content.replace(/<\/p>\s+<p>/g, '</p>\n<p>');
  content = content.replace(/<\/h2>\s+<p>/g, '</h2>\n<p>');
  content = content.replace(/<\/h3>\s+<p>/g, '</h3>\n<p>');
  content = content.replace(/<\/ul>\s+<p>/g, '</ul>\n<p>');
  content = content.replace(/<\/ol>\s+<p>/g, '</ol>\n<p>');
  content = content.replace(/<\/table>\s+<p>/g, '</table>\n<p>');

  console.log(`[Step 3] Article base created (${content.length} chars)`);

  // === STEP 4: ライティング特徴リライト（スキップ） ===
  // リライト処理は記事品質を低下させる可能性があるため、スキップします
  console.log('[Step 4] Skipping rewrite step, using original content from Grok');

  // === STEP 5 & 6: タグ自動割り当て＆新規タグ登録 ===
  console.log('[Step 5-6] Generating and assigning tags...');

  // タグ生成用にプレーンテキストを抽出
  const plainContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  // 既存タグを取得してAIに渡す
  const existingTags = await adminDb
    .collection('tags')
    .where('mediaId', '==', mediaId)
    .get();

  const existingTagMap = new Map<string, { id: string; name: string }>();
  const existingTagNames: string[] = [];
  existingTags.docs.forEach(doc => {
    const tagData = doc.data();
    const normalizedName = tagData.name.toLowerCase();
    existingTagMap.set(normalizedName, { id: doc.id, name: tagData.name });
    existingTagNames.push(tagData.name);
  });

  // 全カテゴリー名を取得
  const allCategories = await adminDb
    .collection('categories')
    .where('mediaId', '==', mediaId)
    .get();
  const allCategoryNames = allCategories.docs.map(doc => doc.data().name);

  const existingTagsText = existingTagNames.length > 0 
    ? `\n既存タグ: ${existingTagNames.join('、')}\n既存タグと同じ意味の場合は、必ず既存タグの表記をそのまま使用してください。`
    : '';

  const tagPrompt = `以下の記事から、検索されやすい広義で汎用的なタグを日本語で5個生成してください。
${existingTagsText}
カテゴリー名（${allCategoryNames.join('、')}）と重複するタグは生成しないでください。

タイトル: ${title}
本文: ${plainContent.substring(0, 1000)}

日本語のタグをカンマ区切りで出力してください（説明は不要）。`;

  const tagResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'あなたはSEOに強いタグ生成の専門家です。必ず日本語でタグを生成してください。既存タグがある場合は、表記を完全に一致させてください。',
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
    .filter(tag => {
      if (!tag) return false;
      const lowerTag = tag.toLowerCase();
      return !allCategoryNames.some(cat => cat.toLowerCase() === lowerTag);
    });

  const tagIds: string[] = [];

  for (const tagName of generatedTags) {
    const normalizedTag = tagName.toLowerCase();
    
    if (existingTagMap.has(normalizedTag)) {
      // 既存タグを使用
      const existingTag = existingTagMap.get(normalizedTag)!;
      tagIds.push(existingTag.id);
      console.log(`[Step 5-6] Using existing tag: "${existingTag.name}" (normalized: "${normalizedTag}")`);
    } else {
      // 新規タグを作成し、翻訳
      // スラッグを英語で生成
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
          console.error('[Step 5-6] Failed to generate English slug:', error);
          // フォールバック: 日本語を削除
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
      console.log(`[Step 5-6] Created new tag: "${tagName}" (normalized: "${normalizedTag}")`);
    }
  }

  console.log(`[Step 5-6] Assigned ${tagIds.length} tags`);

  // === STEP 7: アイキャッチ画像生成 ===
  console.log('[Step 7] Generating featured image...');

  const imagePrompt = `${imagePatternData.prompt}

This is a featured image for an article titled "${title}".`;
  
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
  
  console.log('[Step 9] Unique slug generated:', slug);

  if (!metaDescription) {
    metaDescription = plainContent.substring(0, 160);
  }

  const metaTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;

  console.log('[Step 9] Metadata generated');

  // === STEP 10: FAQ生成 ===
  console.log('[Step 10] Generating FAQ...');

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
  console.log('[Step 10] ===== FAQ RAW RESPONSE (Full) =====');
  console.log(faqText);
  console.log('[Step 10] ===== END FAQ RAW RESPONSE =====');
  
  // より柔軟な正規表現でマッチング（半角・全角両対応）
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

  console.log(`[Step 10] ===== FAQ PARSING RESULT =====`);
  console.log(`[Step 10] Matched ${faqMatches.length} patterns`);
  console.log(`[Step 10] Generated ${faqs_ja.length} valid FAQs`);
  if (faqs_ja.length > 0) {
    console.log('[Step 10] All FAQs:', JSON.stringify(faqs_ja, null, 2));
  } else {
    console.log('[Step 10] ⚠️ WARNING: No FAQs were parsed from the response!');
    console.log('[Step 10] Please check the raw response format above.');
  }
  console.log('[Step 10] ===== END FAQ PARSING RESULT =====');

  // === STEP 11: 記事内画像生成＆配置 ===
  console.log('[Step 11] Generating inline images...');

  const headingMatches = Array.from(content.matchAll(/<h2[^>]*>.*?<\/h2>/gi)) as RegExpMatchArray[];
  const headingTexts = headingMatches.map((match: RegExpMatchArray) => match[0].replace(/<[^>]*>/g, '').trim());

  // すべてのh2タグに画像を挿入
  if (headingMatches.length >= 1) {
    // すべてのh2タグの直後に画像を配置
    const targetPositions = Array.from({ length: headingMatches.length }, (_, i) => i);

    // 後ろから順に挿入（インデックスがずれないように）
    for (let i = targetPositions.length - 1; i >= 0; i--) {
      try {
        const position = targetPositions[i];
        const headingMatch = headingMatches[position];
        const headingContext = headingTexts[position];

        const inlineImagePrompt = `${imagePatternData.prompt}

Section heading: "${headingContext}"

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
        
        const imageHtml = `<figure class="inline-image my-6"><img src="${inlineImagePublicUrl}" alt="${title} - ${headingContext}" class="w-full rounded-lg shadow-md" /></figure>`;

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
    targetAudience, // 想定読者を保存
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

  return {
    success: true,
    articleId,
    title,
    message: '記事を非公開として保存しました',
  };
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

