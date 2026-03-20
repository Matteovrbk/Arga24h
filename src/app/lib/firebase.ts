import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBhsiD3DnEZ0HZxklRk_ZcKAeuTfp1wQhU",
  authDomain: "hsaintpaul-c49f1.firebaseapp.com",
  projectId: "hsaintpaul-c49f1",
  storageBucket: "hsaintpaul-c49f1.firebasestorage.app",
  messagingSenderId: "464605134715",
  appId: "1:464605134715:web:779b1c25785bb3f219c7de",
  measurementId: "G-X9PJNL3WMV",
  databaseURL:
    (import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined) ||
    "https://hsaintpaul-c49f1-default-rtdb.europe-west1.firebasedatabase.app",
};

let db: ReturnType<typeof getDatabase> | null = null;
try {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getDatabase(app);
} catch {
  db = null;
}

export { db };
