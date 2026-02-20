const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'pixseo-1eeef',
    storageBucket: 'pixseo-1eeef.firebasestorage.app',
  });
}
const db = admin.firestore();

const MEDIA_ID = 'vLXNATzVNoJc9dIGggPi';
const HEADER_BLOCK_ID = '95hbSjU9PkvJZIYgbWjr';
const FOOTER_BLOCK_ID = 'ku2QvTERFVD2eQNKuirz';

const mapSectionHtml = `
<section class="map-page">
  <div class="map-section">
    <span class="section-label">map</span>
    <h2 class="map-heading">Ayumiの推奨店舗・施設マップ</h2>
    <div class="map-embed">
      <iframe
        src="https://www.google.com/maps/d/embed?mid=1Dxbf1RzaVMbBHFuJ8f7cMNROGz09pjU&ehbc=2E312F&noprof=1"
        width="100%"
        height="480"
        style="border:0; border-radius: 12px;"
        allowfullscreen=""
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade">
      </iframe>
    </div>
  </div>

  <div class="article-list-section">
    <h3 class="article-list-heading">Ayumiの推奨店舗・施設記事一覧</h3>
  </div>
</section>
`;

const pageCss = `
/* Map Page Styles */
.map-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 20px 0;
}
.map-section {
  text-align: center;
  margin-bottom: 48px;
}
.section-label {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  color: #2EA7E0;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 8px;
}
.map-heading {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin-bottom: 32px;
}
.map-embed {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}
.map-embed iframe {
  display: block;
  width: 100%;
}

.article-list-section {
  margin-top: 56px;
  padding-bottom: 8px;
}
.article-list-heading {
  font-size: 22px;
  font-weight: 700;
  color: #333;
  text-align: center;
  margin-bottom: 32px;
  position: relative;
  padding-bottom: 16px;
}
.article-list-heading::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: #2EA7E0;
  border-radius: 2px;
}

@media (max-width: 768px) {
  .map-page {
    padding: 24px 16px 0;
  }
  .map-heading {
    font-size: 22px;
  }
  .map-embed iframe {
    height: 320px;
  }
  .article-list-heading {
    font-size: 18px;
  }
}
`;

async function run() {
  // Get the home page's customCss (shared site styles)
  const homeDoc = await db.collection('pages').doc('7o0iKgKelF7arnHRKLWG').get();
  const sharedCss = homeDoc.data().customCss || '';

  const combinedCss = sharedCss + '\n\n' + pageCss;

  const blocks = [
    {
      id: uuidv4(),
      type: 'custom',
      order: 0,
      config: {
        customBlockId: HEADER_BLOCK_ID,
        customBlockName: 'header',
      },
    },
    {
      id: uuidv4(),
      type: 'html',
      order: 1,
      config: {
        html: mapSectionHtml,
      },
    },
    {
      id: uuidv4(),
      type: 'article',
      order: 2,
      config: {
        articleType: 'recent',
        displayCount: 25,
      },
    },
    {
      id: uuidv4(),
      type: 'custom',
      order: 3,
      config: {
        customBlockId: FOOTER_BLOCK_ID,
        customBlockName: 'footer',
      },
    },
  ];

  const now = admin.firestore.Timestamp.now();

  const pageData = {
    mediaId: MEDIA_ID,
    title: 'Ayumiの推奨店舗・施設マップ',
    title_ja: 'Ayumiの推奨店舗・施設マップ',
    title_en: 'Ayumi Recommended Barrier-Free Locations Map',
    title_zh: '',
    title_ko: '',
    content: '',
    content_ja: '',
    content_en: '',
    content_zh: '',
    content_ko: '',
    excerpt: 'Ayumiが推奨するバリアフリー対応店舗・施設の一覧マップです。車椅子対応やバリアフリー設備のある飲食店・施設を紹介しています。',
    excerpt_ja: 'Ayumiが推奨するバリアフリー対応店舗・施設の一覧マップです。車椅子対応やバリアフリー設備のある飲食店・施設を紹介しています。',
    slug: 'verified-locations-map',
    blocks: blocks,
    useBlockBuilder: true,
    isPublished: true,
    publishedAt: now,
    updatedAt: now,
    order: 0,
    
    // SEO
    metaTitle: 'Ayumiの推奨店舗・施設マップ | ふらっと。〜バリアフリー情報サイト〜',
    metaTitle_ja: 'Ayumiの推奨店舗・施設マップ | ふらっと。〜バリアフリー情報サイト〜',
    metaDescription: 'Ayumiが推奨するバリアフリー対応店舗・施設の一覧マップ。車椅子対応やバリアフリー設備のある飲食店・ホテル・観光施設などを紹介しています。',
    metaDescription_ja: 'Ayumiが推奨するバリアフリー対応店舗・施設の一覧マップ。車椅子対応やバリアフリー設備のある飲食店・ホテル・観光施設などを紹介しています。',
    
    // Page style
    layoutMode: 'blank',
    showPanel: false,
    customCss: combinedCss,
    backgroundColor: '',
    textColor: '',
    showGlobalNav: false,
    showSidebar: false,
    cssLinks: [],
  };

  const docRef = await db.collection('pages').add(pageData);
  console.log('Page created!');
  console.log('Document ID:', docRef.id);
  console.log('Slug:', pageData.slug);
  console.log('URL: https://flat.pixseo-preview.cloud/ja/verified-locations-map/');
  console.log('Blocks:', blocks.length);
  console.log('CustomCss length:', combinedCss.length);
}

run().catch(console.error);
