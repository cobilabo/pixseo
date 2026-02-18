import { adminStorage, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import sharp from 'sharp';
import { AnalysisResult, AnalyzedCommonBlock, AnalyzedPage } from './analyzer';
import { v4 as uuidv4 } from 'uuid';

export interface ImportOptions {
  mediaId: string;
  layoutMode: 'blank' | 'default';
  isPublished: boolean;
  customCss: string;
}

export interface ImportResult {
  createdCustomBlocks: { id: string; name: string }[];
  createdPages: { id: string; title: string; slug: string }[];
  uploadedImages: number;
  errors: string[];
}

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PixSEO SiteImporter/1.0)',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return null;

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

async function getPublicUrl(file: any): Promise<string> {
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: '03-09-2491',
  });
  return url;
}

async function uploadImageToStorage(
  buffer: Buffer,
  originalUrl: string,
  mediaId: string,
): Promise<string | null> {
  try {
    const bucket = adminStorage.bucket();
    const timestamp = Date.now();

    // Extract filename from URL
    const urlPath = new URL(originalUrl).pathname;
    const originalName = urlPath.split('/').pop() || 'image';
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');

    // Optimize with Sharp
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Skip non-image formats (SVG etc)
    if (metadata.format === 'svg') {
      const svgPath = `media/images/${timestamp}_${sanitizedName}`;
      const svgFile = bucket.file(svgPath);
      await svgFile.save(buffer, {
        metadata: { contentType: 'image/svg+xml' },
      });
      const svgUrl = await getPublicUrl(svgFile);

      await adminDb.collection('mediaLibrary').add({
        mediaId,
        name: `${timestamp}_${sanitizedName}`,
        originalName,
        url: svgUrl,
        thumbnailUrl: svgUrl,
        type: 'image',
        mimeType: 'image/svg+xml',
        size: buffer.length,
        width: metadata.width || 0,
        height: metadata.height || 0,
        alt: sanitizedName.replace(/\.[^.]+$/, ''),
        usageContext: 'site-import',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return svgUrl;
    }

    const maxWidth = 2000;
    const width = metadata.width || 0;
    const resizedImage = width > maxWidth
      ? image.resize(maxWidth, null, { withoutEnlargement: true })
      : image;

    const optimizedBuffer = await resizedImage
      .webp({ quality: 80 })
      .toBuffer();

    const webpName = sanitizedName.replace(/\.[^.]+$/, '.webp');
    const mainPath = `media/images/${timestamp}_${webpName}`;
    const mainFile = bucket.file(mainPath);
    await mainFile.save(optimizedBuffer, {
      metadata: { contentType: 'image/webp' },
    });
    const uploadUrl = await getPublicUrl(mainFile);

    // Thumbnail
    const thumbnailBuffer = await sharp(buffer)
      .resize(300, 300, { fit: 'cover' })
      .webp({ quality: 70 })
      .toBuffer();
    const thumbPath = `media/thumbnails/${timestamp}_${webpName}`;
    const thumbFile = bucket.file(thumbPath);
    await thumbFile.save(thumbnailBuffer, {
      metadata: { contentType: 'image/webp' },
    });
    const thumbnailUrl = await getPublicUrl(thumbFile);

    await adminDb.collection('mediaLibrary').add({
      mediaId,
      name: `${timestamp}_${webpName}`,
      originalName,
      url: uploadUrl,
      thumbnailUrl,
      type: 'image',
      mimeType: 'image/webp',
      size: optimizedBuffer.length,
      width: metadata.width || 0,
      height: metadata.height || 0,
      alt: sanitizedName.replace(/\.[^.]+$/, ''),
      usageContext: 'site-import',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return uploadUrl;
  } catch (error) {
    console.error(`[Importer] Failed to upload image: ${originalUrl}`, error);
    return null;
  }
}

function replaceImageUrls(html: string, urlMap: Map<string, string>): string {
  let result = html;
  for (const [originalUrl, newUrl] of urlMap) {
    result = result.split(originalUrl).join(newUrl);
  }
  return result;
}

async function uploadAllImages(
  analysis: AnalysisResult,
  mediaId: string,
): Promise<{ urlMap: Map<string, string>; count: number; errors: string[] }> {
  const urlMap = new Map<string, string>();
  const errors: string[] = [];
  let count = 0;

  // Collect all unique image URLs
  const allImageUrls = new Set<string>();
  for (const page of analysis.pages) {
    if (page.images) {
      page.images.forEach(img => allImageUrls.add(img));
    }
  }

  // Process images in batches of 5
  const imageArray = Array.from(allImageUrls);
  for (let i = 0; i < imageArray.length; i += 5) {
    const batch = imageArray.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (imgUrl) => {
        const buffer = await downloadImage(imgUrl);
        if (!buffer) {
          errors.push(`画像のダウンロードに失敗: ${imgUrl}`);
          return;
        }
        const newUrl = await uploadImageToStorage(buffer, imgUrl, mediaId);
        if (newUrl) {
          urlMap.set(imgUrl, newUrl);
          count++;
        } else {
          errors.push(`画像のアップロードに失敗: ${imgUrl}`);
        }
      })
    );
  }

  return { urlMap, count, errors };
}

export async function executeImport(
  analysis: AnalysisResult,
  options: ImportOptions,
): Promise<ImportResult> {
  const result: ImportResult = {
    createdCustomBlocks: [],
    createdPages: [],
    uploadedImages: 0,
    errors: [],
  };

  const { mediaId, layoutMode, isPublished, customCss } = options;

  // 1. Upload images and build URL map
  const { urlMap, count, errors: imageErrors } = await uploadAllImages(analysis, mediaId);
  result.uploadedImages = count;
  result.errors.push(...imageErrors);

  // 2. Create custom blocks for common elements
  const customBlockIdMap = new Map<string, string>(); // position -> customBlockId
  const customBlockNameMap = new Map<string, string>(); // position -> name

  for (const block of analysis.commonBlocks) {
    try {
      const html = replaceImageUrls(block.html, urlMap);
      const css = block.css || '';

      const docRef = await adminDb.collection('customBlocks').add({
        mediaId,
        name: block.name,
        html,
        css,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      customBlockIdMap.set(block.position, docRef.id);
      customBlockNameMap.set(block.position, block.name);
      result.createdCustomBlocks.push({ id: docRef.id, name: block.name });
    } catch (error) {
      result.errors.push(`カスタムブロック「${block.name}」の作成に失敗`);
    }
  }

  // 3. Create pages
  for (const page of analysis.pages) {
    try {
      const contentHtml = replaceImageUrls(page.contentHtml, urlMap);

      // Build blocks array
      const blocks: any[] = [];
      let order = 0;

      // Header custom block (if exists)
      const headerBlockId = customBlockIdMap.get('header');
      if (headerBlockId) {
        blocks.push({
          id: uuidv4(),
          type: 'custom',
          order: order++,
          config: {
            customBlockId: headerBlockId,
            customBlockName: customBlockNameMap.get('header') || '共通ヘッダー',
          },
        });
      }

      // Navigation custom block (if exists and separate from header)
      const navBlockId = customBlockIdMap.get('navigation');
      if (navBlockId) {
        blocks.push({
          id: uuidv4(),
          type: 'custom',
          order: order++,
          config: {
            customBlockId: navBlockId,
            customBlockName: customBlockNameMap.get('navigation') || '共通ナビゲーション',
          },
        });
      }

      // Page content as HTML block
      blocks.push({
        id: uuidv4(),
        type: 'html',
        order: order++,
        config: {
          html: contentHtml,
        },
      });

      // Footer custom block (if exists)
      const footerBlockId = customBlockIdMap.get('footer');
      if (footerBlockId) {
        blocks.push({
          id: uuidv4(),
          type: 'custom',
          order: order++,
          config: {
            customBlockId: footerBlockId,
            customBlockName: customBlockNameMap.get('footer') || '共通フッター',
          },
        });
      }

      // Other common blocks
      for (const [position, blockId] of customBlockIdMap) {
        if (!['header', 'footer', 'navigation'].includes(position)) {
          blocks.push({
            id: uuidv4(),
            type: 'custom',
            order: order++,
            config: {
              customBlockId: blockId,
              customBlockName: customBlockNameMap.get(position) || 'カスタムブロック',
            },
          });
        }
      }

      const isHome = page.slug === 'home';

      const pageData: any = {
        mediaId,
        title: page.title,
        title_ja: page.title,
        content: '',
        content_ja: '',
        excerpt: page.metaDescription || '',
        slug: page.slug,
        isPublished,
        publishedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        metaTitle: page.title,
        metaTitle_ja: page.title,
        metaDescription: page.metaDescription || '',
        metaDescription_ja: page.metaDescription || '',
        order: 0,
        blocks,
        useBlockBuilder: true,
        layoutMode,
        showGlobalNav: false,
        showSidebar: false,
        showPanel: false,
        customCss: customCss || '',
        isHomePage: isHome,
      };

      const docRef = await adminDb.collection('pages').add(pageData);
      result.createdPages.push({
        id: docRef.id,
        title: page.title,
        slug: page.slug,
      });
    } catch (error) {
      result.errors.push(`ページ「${page.title}」の作成に失敗`);
    }
  }

  return result;
}
