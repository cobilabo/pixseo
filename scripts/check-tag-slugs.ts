import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

const serviceAccountPath = path.join(__dirname, '..', 'pixseo-1eeef-firebase-adminsdk-fbsvc-7b2fe59f30.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'pixseo-1eeef',
});

const db = admin.firestore();

async function main() {
  const snapshot = await db.collection('tags')
    .where('mediaId', '==', 'vLXNATzVNoJc9dIGggPi')
    .get();
  
  console.log(`Found ${snapshot.docs.length} tags:\n`);
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log(`${data.name} -> ${data.slug}`);
  });
}

main().catch(console.error);

