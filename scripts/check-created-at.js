const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const dotenv = require('dotenv');
const fs = require('fs');

const log = (msg) => {
  console.log(msg);
  fs.appendFileSync('check-result.txt', msg + '\n', 'utf8');
};

// Clear the result file
fs.writeFileSync('check-result.txt', '', 'utf8');

log('Script starting...');

dotenv.config({ path: '.env.local' });

log('Dotenv loaded');

// Firebase Admin SDK の初期化
if (getApps().length === 0) {
  log('Initializing Firebase...');
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    log('ERROR: GOOGLE_APPLICATION_CREDENTIALS is not set!');
    process.exit(1);
  }
  try {
    const path = require('path');
    const absolutePath = path.resolve(process.cwd(), credentialsPath);
    log('Loading credentials from: ' + absolutePath);
    const serviceAccount = require(absolutePath);
    initializeApp({
      credential: cert(serviceAccount),
    });
    log('Firebase initialized');
  } catch (e) {
    log('ERROR loading service account: ' + e.message);
    process.exit(1);
  }
}

const db = getFirestore();

async function checkCreatedAt() {
  log('Checking articles for missing createdAt field...');
  log('');
  
  try {
    const articlesRef = db.collection('articles');
    log('Getting articles...');
    const snapshot = await articlesRef.get();
    log(`Got ${snapshot.size} articles`);
    
    let totalArticles = 0;
    let missingCreatedAt = 0;
    let hasCreatedAt = 0;
    const missingArticles = [];
    
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
    
    log('=== Summary ===');
    log(`Total articles: ${totalArticles}`);
    log(`Articles with createdAt: ${hasCreatedAt}`);
    log(`Articles without createdAt: ${missingCreatedAt}`);
    log(`Percentage missing: ${((missingCreatedAt / totalArticles) * 100).toFixed(1)}%`);
    
    if (missingArticles.length > 0) {
      log('');
      log('=== Articles without createdAt (first 20) ===');
      missingArticles.slice(0, 20).forEach((article, index) => {
        log(`${index + 1}. [${article.id}] ${article.title.substring(0, 50)}`);
        const pubAt = article.publishedAt ? (article.publishedAt.toDate ? article.publishedAt.toDate() : article.publishedAt) : 'null';
        const updAt = article.updatedAt ? (article.updatedAt.toDate ? article.updatedAt.toDate() : article.updatedAt) : 'null';
        log(`   publishedAt: ${pubAt}`);
        log(`   updatedAt: ${updAt}`);
      });
    }
  } catch (e) {
    log('ERROR in checkCreatedAt: ' + e.message);
    log(e.stack);
  }
}

checkCreatedAt().then(() => {
  log('');
  log('Done.');
  process.exit(0);
}).catch((error) => {
  log('ERROR: ' + error.message);
  log(error.stack);
  process.exit(1);
});
