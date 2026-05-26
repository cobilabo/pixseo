import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

export function initFirestoreAdmin(): FirebaseFirestore.Firestore {
  if (admin.apps.length) {
    return admin.firestore();
  }

  const root = path.join(__dirname, '..', '..');
  const candidates = [
    path.join(root, 'serviceAccountKey.json'),
    path.join(root, 'pixseo-1eeef-firebase-adminsdk-fbsvc-7b2fe59f30.json'),
  ];
  const saPath = candidates.find((p) => fs.existsSync(p));
  if (!saPath) {
    throw new Error('service account JSON not found');
  }

  const sa = JSON.parse(fs.readFileSync(saPath, 'utf-8'));
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    projectId: sa.project_id || 'pixseo-1eeef',
  });
  return admin.firestore();
}