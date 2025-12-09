import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

console.log('Script starting...');

dotenv.config({ path: '.env.local' });

console.log('Dotenv loaded');

// Firebase Admin SDK の初期化
if (getApps().length === 0) {
  console.log('Initializing Firebase...');
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not set!');
    process.exit(1);
  }
  const serviceAccount = JSON.parse(serviceAccountKey);
  initializeApp({
    credential: cert(serviceAccount),
  });
  console.log('Firebase initialized');
}

const db = getFirestore();

async function checkCreatedAt() {
  console.log('Checking articles for missing createdAt field...\n');
  
  const articlesRef = db.collection('articles');
  const snapshot = await articlesRef.get();
  
  let totalArticles = 0;
  let missingCreatedAt = 0;
  let hasCreatedAt = 0;
  const missingArticles: { id: string; title: string; publishedAt: any; updatedAt: any }[] = [];
  
  snapshot.forEach((doc) => {
    const data = doc.data();
    totalArticles++;
    
    if (!data.createdAt) {
      missingCreatedAt++;
      missingArticles.push({
        id: doc.id,
        title: data.title || '(no title)',
        publishedAt: data.publishedAt || null,
        updatedAt: data.updatedAt || null,
      });
    } else {
      hasCreatedAt++;
    }
  });
  
  console.log('=== Summary ===');
  console.log(`Total articles: ${totalArticles}`);
  console.log(`Articles with createdAt: ${hasCreatedAt}`);
  console.log(`Articles without createdAt: ${missingCreatedAt}`);
  console.log(`Percentage missing: ${((missingCreatedAt / totalArticles) * 100).toFixed(1)}%`);
  
  if (missingArticles.length > 0) {
    console.log('\n=== Articles without createdAt (first 20) ===');
    missingArticles.slice(0, 20).forEach((article, index) => {
      console.log(`${index + 1}. [${article.id}] ${article.title}`);
      console.log(`   publishedAt: ${article.publishedAt ? article.publishedAt.toDate?.() || article.publishedAt : 'null'}`);
      console.log(`   updatedAt: ${article.updatedAt ? article.updatedAt.toDate?.() || article.updatedAt : 'null'}`);
    });
  }
}

checkCreatedAt().then(() => {
  process.stdout.write('\nDone.\n');
  process.exit(0);
}).catch((error) => {
  process.stderr.write('Error: ' + error + '\n');
  process.exit(1);
});

