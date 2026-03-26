/**
 * flat テナントのお問い合わせページと CONTACT フォームを
 * https://the-ayumi.jp/contact/ に揃える（Firestore 更新）。
 *
 * 実行: node scripts/update-flat-contact-ayumi.js
 * 要: GOOGLE_APPLICATION_CREDENTIALS または gcloud application-default login
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'pixseo-1eeef',
  });
}

const db = admin.firestore();

const FORM_ID = '3mJOaN3BVkJkGc92xXA1';

/** the-ayumi.jp Elementor フォームに準拠（チェックボックスは複数選択可） */
const CONTACT_FIELDS = [
  {
    id: 'company_name',
    type: 'text',
    order: 0,
    label: '企業名・店舗名・個人名',
    required: true,
    config: { placeholder: '※企業名・店舗名・個人名' },
  },
  {
    id: 'department',
    type: 'text',
    order: 1,
    label: '部署名',
    required: false,
    config: { placeholder: '部署名' },
  },
  {
    id: 'job_title',
    type: 'text',
    order: 2,
    label: '役職',
    required: true,
    config: { placeholder: '※役職' },
  },
  {
    id: 'name',
    type: 'text',
    order: 3,
    label: 'お名前',
    required: true,
    config: { placeholder: '※お名前' },
  },
  {
    id: 'furigana',
    type: 'text',
    order: 4,
    label: 'ふりがな',
    required: true,
    config: { placeholder: '※ふりがな' },
  },
  {
    id: 'email',
    type: 'email',
    order: 5,
    label: 'メールアドレス',
    required: true,
    config: { placeholder: '※メールアドレス' },
  },
  {
    id: 'tel',
    type: 'tel',
    order: 6,
    label: '電話番号',
    required: true,
    config: { placeholder: '※電話番号（ハイフンなし）例：09012345678' },
  },
  {
    id: 'inquiry_type',
    type: 'checkbox',
    order: 7,
    label: '※事業相談・お問い合わせ種別',
    required: false,
    config: {
      options: [
        '物理的バリアフリー対策の支援',
        '心のバリアフリー対策の支援',
        'バリアフリー・心のバリアフリーの研修',
        '合理的配慮ワークショップ',
        '合理的配慮を提供するためのマニュアルづくり',
        'バリアフリー情報サイトへの記事掲載',
        'スポンサー・広告掲載',
        '障害者向けサービス / 事業開発 共創型プロジェクト',
        'バリアフリー・ユニバーサルデザイン建築の監修',
        'インクルーシブデザイン ワークショップ研修',
        'メディア取材',
        'ご寄付',
        'その他',
        '★【事業者向け】45分 無料相談',
      ],
    },
  },
  {
    id: 'inquiry_detail',
    type: 'textarea',
    order: 8,
    label: '問い合わせ詳細',
    required: true,
    config: { placeholder: '問い合わせ詳細', rows: 4 },
  },
];

/** 参考元と同じく、見出しのみ「お問合せ」。本文の「お問い合わせ」はそのまま。 */
function fixContactHeadingHtml(html) {
  return html.replace(
    /<h([1-6])[^>]*>\s*お問い合わせ\s*<\/h\1>/gi,
    '<h$1>お問合せ</h$1>'
  );
}

function patchBlocksForContact(blocks) {
  if (!Array.isArray(blocks)) return blocks;
  return blocks.map((block) => {
    const b = { ...block, config: block.config ? { ...block.config } : {} };

    if (b.type === 'form' && b.config) {
      b.config.showTitle = false;
      if (!b.config.formId) b.config.formId = FORM_ID;
    }

    if (b.type === 'heading' && typeof b.config?.text === 'string') {
      const raw = b.config.text;
      const t = raw.trim() === 'お問い合わせ' ? 'お問合せ' : raw;
      b.config = { ...b.config, text: t };
    }

    if (b.type === 'html' && typeof b.config?.html === 'string') {
      b.config = { ...b.config, html: fixContactHeadingHtml(b.config.html) };
    }

    if (b.type === 'row' && Array.isArray(b.config?.columns)) {
      b.config = {
        ...b.config,
        columns: b.config.columns.map((col) => {
          const c = { ...col };
          if (c.blocks) c.blocks = patchBlocksForContact(c.blocks);
          return c;
        }),
      };
    }

    return b;
  });
}

async function main() {
  const mediaSnap = await db.collection('mediaTenants').where('slug', '==', 'flat').limit(1).get();
  if (mediaSnap.empty) {
    console.error('mediaTenants slug=flat が見つかりません');
    process.exit(1);
  }
  const mediaId = mediaSnap.docs[0].id;
  console.log('mediaId (flat):', mediaId);

  const formRef = db.collection('forms').doc(FORM_ID);
  const formSnap = await formRef.get();
  if (!formSnap.exists) {
    console.error('フォーム', FORM_ID, 'が存在しません');
    process.exit(1);
  }
  const prev = formSnap.data();
  if (prev.mediaId && prev.mediaId !== mediaId) {
    console.warn('警告: フォームの mediaId が flat と異なります:', prev.mediaId);
  }

  await formRef.update({
    name: 'お問合せ',
    name_ja: 'お問合せ',
    fields: CONTACT_FIELDS,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('フォームを更新しました:', FORM_ID);

  const pagesSnap = await db
    .collection('pages')
    .where('mediaId', '==', mediaId)
    .where('slug', '==', 'contact')
    .limit(5)
    .get();

  if (pagesSnap.empty) {
    console.log('slug=contact のページが見つかりません（フォームのみ更新済み）');
    return;
  }

  for (const doc of pagesSnap.docs) {
    const data = doc.data();
    let title = data.title || '';
    if (title.trim() === 'お問い合わせ') {
      title = 'お問合せ';
    }

    const blocks = patchBlocksForContact(data.blocks || []);

    await doc.ref.update({
      title,
      title_ja: title,
      blocks,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('ページを更新しました:', doc.id, title);
  }

  console.log('完了');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
