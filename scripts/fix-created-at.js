const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const dotenv = require('dotenv');
const path = require('path');

console.log('Script starting...');

dotenv.config({ path: '.env.local' });

// Firebase Admin SDK の初期化
if (getApps().length === 0) {
  console.log('Initializing Firebase...');
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    console.error('ERROR: GOOGLE_APPLICATION_CREDENTIALS is not set!');
    process.exit(1);
  }
  const absolutePath = path.resolve(process.cwd(), credentialsPath);
  const serviceAccount = require(absolutePath);
  initializeApp({
    credential: cert(serviceAccount),
  });
  console.log('Firebase initialized');
}

const db = getFirestore();

async function fixCreatedAt() {
  console.log('Fixing articles with missing createdAt field...\n');
  
  const articlesRef = db.collection('articles');
  const snapshot = await articlesRef.get();
  
  let totalArticles = 0;
  let fixedCount = 0;
  let skippedNoPublishedAt = 0;
  let alreadyHasCreatedAt = 0;
  
  const batch = db.batch();
  let batchCount = 0;
  const MAX_BATCH_SIZE = 500;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    totalArticles++;
    
    if (data.createdAt) {
      alreadyHasCreatedAt++;
      continue;
    }
    
    if (!data.publishedAt) {
      skippedNoPublishedAt++;
      console.log(`Skipped (no publishedAt): ${doc.id} - ${data.title?.substring(0, 40) || '(no title)'}`);
      continue;
    }
    
    // publishedAt を createdAt にコピー
    batch.update(doc.ref, {
      createdAt: data.publishedAt
    });
    
    fixedCount++;
    batchCount++;
    
    // バッチサイズの上限に達したらコミット
    if (batchCount >= MAX_BATCH_SIZE) {
      console.log(`Committing batch of ${batchCount} updates...`);
      await batch.commit();
      batchCount = 0;
    }
  }
  
  // 残りのバッチをコミット
  if (batchCount > 0) {
    console.log(`Committing final batch of ${batchCount} updates...`);
    await batch.commit();
  }
  
  console.log('\n=== Summary ===');
  console.log(`Total articles: ${totalArticles}`);
  console.log(`Already had createdAt: ${alreadyHasCreatedAt}`);
  console.log(`Fixed (publishedAt -> createdAt): ${fixedCount}`);
  console.log(`Skipped (no publishedAt): ${skippedNoPublishedAt}`);
}

fixCreatedAt().then(() => {
  console.log('\nDone.');
  process.exit(0);
}).catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

