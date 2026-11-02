// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyD2mwbe5zUCP0l1iQxuFB04BNlCJ01ZZiQ",
  authDomain: "monaz-hotel.firebaseapp.com",
  projectId: "monaz-hotel",
  storageBucket: "monaz-hotel.firebasestorage.app",
  messagingSenderId: "427992087338",
  appId: "1:427992087338:web:b659ddad2c4814411e3c53",
  measurementId: "G-0BY0DL0GMG"
};

// Initialize Firebase
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firebase Authentication
export const auth = getAuth(app);

// Cloud Firestore Database
export const db = getFirestore(app);

// Initialize Firebase Analytics safely (supported in browser environments)
export let analytics: any = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch (err) {
        // Analytics may be blocked by privacy extensions or if running in iframe
      }
    }
  }).catch(() => {
    // Ignore analytics capability check errors
  });
}

// Light connection verification to Firestore as required by Skill
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'system', 'connection_probe'));
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('permission-denied') || msg.includes('not-found')) {
      return true;
    }
    if (msg.includes('the client is offline')) {
      console.warn('[Firebase] Client is offline or database unreachable.');
    }
    return true;
  }
}

export default app;
