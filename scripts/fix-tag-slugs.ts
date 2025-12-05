/**
 * タグのスラッグを英字に変換するスクリプト
 * 
 * 使用方法:
 *   npx tsx scripts/fix-tag-slugs.ts --mediaId=<mediaId> [--dryRun]
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

// Firebase Admin SDK の初期化
if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '..', 'pixseo-1eeef-firebase-adminsdk-fbsvc-7b2fe59f30.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'pixseo-1eeef',
  });
}

const db = admin.firestore();

// 日本語→英語スラッグのマッピング（完全一致優先）
const exactSlugMap: { [key: string]: string } = {
  // 現在のタグに対応
  '情報サイト': 'info-site',
  '障害者割引': 'disability-discount',
  '言語障害': 'speech-disorder',
  '障害児家族': 'disability-family',
  '障害児ママ': 'disability-mom',
  '障害児の親': 'disability-parent',
  '障害者': 'disabled-person',
  '聴覚障害': 'hearing-impairment',
  '内部障害': 'internal-disability',
  'コワーキングスペース': 'coworking-space',
  '身体障害': 'physical-disability',
  '結婚': 'marriage',
  '就労支援': 'employment-support',
  '聴覚': 'hearing',
  '医療的ケア児': 'medical-care-child',
  '障害者手帳': 'disability-certificate',
  '障害児': 'disabled-child',
  '転職': 'career-change',
  '上肢障害': 'upper-limb-disability',
  '風俗': 'entertainment',
  '熊本': 'kumamoto',
  '住宅': 'housing',
  '障害年金': 'disability-pension',
  'モデル': 'model',
  '就職活動': 'job-hunting',
  '寄附金': 'donation',
  '恋愛': 'romance',
  'ライター紹介': 'writer-intro',
  'メディア掲載': 'media-coverage',
  '商品': 'product',
  '補助器具': 'assistive-device',
  '大阪': 'osaka',
  '旅館': 'ryokan',
  '障害者年金': 'disability-pension',
  '身体障害者': 'physically-disabled',
  '長崎': 'nagasaki',
  '法律': 'law',
  '美容室': 'beauty-salon',
  '障害者差別解消法': 'disability-discrimination-act',
  '福祉器具': 'welfare-equipment',
  '視覚障害': 'visual-impairment',
};

// 部分一致用のマッピング
const slugMap: { [key: string]: string } = {
  // 福祉・介護関連
  '福祉': 'welfare',
  '介護': 'care',
  '障害': 'disability',
  '障がい': 'disability',
  '就労': 'employment',
  '支援': 'support',
  '生活': 'life',
  'サービス': 'service',
  '施設': 'facility',
  '事業所': 'office',
  '利用者': 'user',
  '職員': 'staff',
  'スタッフ': 'staff',
  '研修': 'training',
  '資格': 'qualification',
  '制度': 'system',
  '法律': 'law',
  '相談': 'consultation',
  'ケア': 'care',
  'リハビリ': 'rehabilitation',
  '医療': 'medical',
  '健康': 'health',
  '保険': 'insurance',
  '年金': 'pension',
  '手当': 'allowance',
  '給付': 'benefit',
  '申請': 'application',
  '手続き': 'procedure',
  
  // ビジネス関連
  '仕事': 'work',
  '転職': 'career-change',
  '求人': 'job-offer',
  '採用': 'recruitment',
  '面接': 'interview',
  '履歴書': 'resume',
  '給料': 'salary',
  '収入': 'income',
  '経営': 'management',
  '運営': 'operation',
  '開業': 'startup',
  '起業': 'entrepreneurship',
  'ビジネス': 'business',
  '会社': 'company',
  '企業': 'corporation',
  
  // 地域
  '東京': 'tokyo',
  '大阪': 'osaka',
  '名古屋': 'nagoya',
  '福岡': 'fukuoka',
  '北海道': 'hokkaido',
  '沖縄': 'okinawa',
  '関東': 'kanto',
  '関西': 'kansai',
  '九州': 'kyushu',
  '愛知': 'aichi',
  '千葉': 'chiba',
  '神奈川': 'kanagawa',
  '熊本': 'kumamoto',
  '長崎': 'nagasaki',
  
  // 一般
  'おすすめ': 'recommended',
  '人気': 'popular',
  'ランキング': 'ranking',
  '比較': 'comparison',
  '口コミ': 'review',
  '評判': 'reputation',
  '体験': 'experience',
  '情報': 'information',
  'ニュース': 'news',
  'コラム': 'column',
  'まとめ': 'summary',
  '解説': 'explanation',
  'ガイド': 'guide',
  '入門': 'introduction',
  '基礎': 'basics',
  '応用': 'advanced',
  '実践': 'practice',
  '事例': 'case-study',
  '成功': 'success',
  '失敗': 'failure',
  '注意': 'caution',
  'ポイント': 'point',
  'コツ': 'tips',
  'メリット': 'merit',
  'デメリット': 'demerit',
  '特徴': 'feature',
  '違い': 'difference',
  '選び方': 'how-to-choose',
  '使い方': 'how-to-use',
  '始め方': 'how-to-start',
  
  // 追加の福祉関連用語
  'グループホーム': 'group-home',
  'デイサービス': 'day-service',
  'ホームヘルパー': 'home-helper',
  'ケアマネージャー': 'care-manager',
  'ソーシャルワーカー': 'social-worker',
  '社会福祉士': 'social-worker',
  '介護福祉士': 'care-worker',
  '精神保健福祉士': 'psychiatric-social-worker',
  'A型': 'type-a',
  'B型': 'type-b',
  '移行支援': 'transition-support',
  '就労継続': 'continuous-employment',
  '就労移行': 'employment-transition',
  '生活介護': 'life-care',
  '放課後等デイサービス': 'after-school-day-service',
  '児童発達支援': 'child-development-support',
  '自立訓練': 'independence-training',
  '共同生活援助': 'group-living-support',
  '居宅介護': 'home-care',
  '重度訪問介護': 'severe-disability-home-care',
  '同行援護': 'accompaniment-support',
  '行動援護': 'behavioral-support',
  '短期入所': 'short-stay',
  '日中一時支援': 'daytime-temporary-support',
  
  // 精神・心理関連
  '精神': 'mental',
  '心理': 'psychology',
  'うつ': 'depression',
  '発達障害': 'developmental-disorder',
  '自閉症': 'autism',
  'ADHD': 'adhd',
  '統合失調症': 'schizophrenia',
  '双極性障害': 'bipolar-disorder',
  'パニック障害': 'panic-disorder',
  '不安障害': 'anxiety-disorder',
  '適応障害': 'adjustment-disorder',
  'PTSD': 'ptsd',
  'ストレス': 'stress',
  'メンタルヘルス': 'mental-health',
  'カウンセリング': 'counseling',
  'セラピー': 'therapy',
  
  // その他
  'サイト': 'site',
  '者': '',
  '児': 'child',
  '家族': 'family',
  'ママ': 'mom',
  '親': 'parent',
  '手帳': 'certificate',
  '活動': 'activity',
  '紹介': 'intro',
  '掲載': 'coverage',
};

/**
 * URLエンコードベースのスラッグかどうかを判定
 * 例: e6-83-85-e5-a0-b1-e3-82-b5-e3-82-a4-e3-83-88
 */
function isEncodedSlug(slug: string): boolean {
  // xx-xx-xx のパターン（16進数2桁がハイフンで繋がっている）が多く含まれている場合
  const hexPattern = /[0-9a-f]{2}-[0-9a-f]{2}/g;
  const matches = slug.match(hexPattern);
  // 3つ以上のパターンがマッチする場合はエンコードされたスラッグと判定
  return matches !== null && matches.length >= 3;
}

/**
 * 既に意味のある英字スラッグかどうかを判定
 */
function isValidEnglishSlug(slug: string): boolean {
  // 英数字とハイフンのみで、かつエンコードパターンではない
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return false;
  }
  // エンコードパターンの場合は無効
  if (isEncodedSlug(slug)) {
    return false;
  }
  return true;
}

/**
 * スラッグを英字に変換
 */
function sanitizeSlug(name: string, existingSlug: string): string {
  // 既に意味のある英字スラッグの場合はそのまま
  if (isValidEnglishSlug(existingSlug)) {
    return existingSlug;
  }

  // 名前からマッピングを使って変換を試みる
  let result = name;
  
  // 完全一致を先にチェック（exactSlugMap優先）
  if (exactSlugMap[name]) {
    return exactSlugMap[name];
  }
  if (slugMap[name]) {
    return slugMap[name];
  }
  
  // 部分一致で変換
  for (const [ja, en] of Object.entries(slugMap)) {
    result = result.replace(new RegExp(ja, 'g'), en);
  }
  
  // 英数字とハイフン以外を除去
  result = result.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  // 連続するハイフンを1つに
  result = result.replace(/-+/g, '-');
  // 先頭と末尾のハイフンを除去
  result = result.replace(/^-|-$/g, '');
  
  // 変換後が有効な英字スラッグになった場合
  if (result && isValidEnglishSlug(result)) {
    return result;
  }

  // マッピングに見つからない場合はハッシュベースのスラッグを生成
  const hash = crypto.createHash('md5').update(name).digest('base64')
    .replace(/[+/=]/g, '')
    .substring(0, 8)
    .toLowerCase();
  
  return `tag-${hash}`;
}

// コマンドライン引数の解析
function parseArgs(): { mediaId: string; dryRun: boolean } {
  const args = process.argv.slice(2);
  let mediaId = '';
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith('--mediaId=')) {
      mediaId = arg.split('=')[1];
    } else if (arg === '--dryRun') {
      dryRun = true;
    }
  }

  if (!mediaId) {
    console.error('Error: --mediaId is required');
    console.log('Usage: npx tsx scripts/fix-tag-slugs.ts --mediaId=<mediaId> [--dryRun]');
    process.exit(1);
  }
  return { mediaId, dryRun };
}

async function main() {
  const { mediaId, dryRun } = parseArgs();

  console.log('='.repeat(60));
  console.log('タグスラッグ修正スクリプト');
  console.log('='.repeat(60));
  console.log(`\nTarget mediaId: ${mediaId}`);
  console.log(`Dry run: ${dryRun}\n`);

  // タグを取得
  const tagsSnapshot = await db.collection('tags')
    .where('mediaId', '==', mediaId)
    .get();

  if (tagsSnapshot.empty) {
    console.log('タグが見つかりませんでした。');
    return;
  }

  console.log(`📂 Found ${tagsSnapshot.docs.length} tags\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  const updates: { id: string; name: string; oldSlug: string; newSlug: string }[] = [];

  for (const doc of tagsSnapshot.docs) {
    const data = doc.data();
    const name = data.name || '';
    const currentSlug = data.slug || '';

    const isEncoded = isEncodedSlug(currentSlug);
    const isValid = isValidEnglishSlug(currentSlug);
    
    // デバッグ: 最初の5件を表示
    if (updates.length + skippedCount < 5) {
      console.log(`  DEBUG: "${name}" -> "${currentSlug}" (encoded: ${isEncoded}, valid: ${isValid})`);
    }

    // 既に有効な英字スラッグの場合はスキップ
    if (isValid) {
      skippedCount++;
      continue;
    }

    const newSlug = sanitizeSlug(name, currentSlug);

    if (newSlug !== currentSlug) {
      updates.push({
        id: doc.id,
        name,
        oldSlug: currentSlug,
        newSlug,
      });
    }
  }

  console.log(`\n📝 Tags to update: ${updates.length}`);
  console.log(`⏭️  Skipped (already valid): ${skippedCount}\n`);

  if (updates.length === 0) {
    console.log('更新が必要なタグはありません。');
    return;
  }

  // 更新内容を表示
  console.log('変更予定:');
  console.log('-'.repeat(60));
  for (const update of updates) {
    console.log(`  ${update.name}`);
    console.log(`    旧: ${update.oldSlug}`);
    console.log(`    新: ${update.newSlug}`);
    console.log('');
  }

  if (!dryRun) {
    console.log('\n更新を実行中...');
    
    const batch = db.batch();
    for (const update of updates) {
      const ref = db.collection('tags').doc(update.id);
      batch.update(ref, {
        slug: update.newSlug,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      updatedCount++;
    }
    
    await batch.commit();
    console.log(`\n✅ ${updatedCount} tags updated successfully!`);
  } else {
    console.log('\n⚠️  This was a DRY RUN. No data was actually updated.');
    console.log('実際に更新するには --dryRun オプションを外して実行してください。');
  }
}

main().catch(console.error);

