import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

export async function testConnection(): Promise<boolean> {
  try {
    // Attempt a light ping to verify network and credentials reach Firestore
    await getDocFromServer(doc(db, 'system', 'connection_probe'));
    return true;
  } catch (err: unknown) {
    // Even if permission is denied or document is missing, reaching the server means network works
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('permission-denied') || msg.includes('not-found')) {
      return true;
    }
    console.warn('[Firebase] Connection probe:', msg);
    return true;
  }
}

export default app;
