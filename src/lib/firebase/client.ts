import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, initializeFirestore, memoryLocalCache } from "firebase/firestore";

// Firebase web configuration identifies the project. Access is enforced by Auth + rules.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCOyhetP0kBz_8S70DLxjg9wyIzMnj_VsQ",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "liela-9426c.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "liela-9426c",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "liela-9426c.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "48471899770",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:48471899770:web:3f34cdbd5a78d0860c45c3",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-RHTXL2RYCV",
};

let services: ReturnType<typeof initialize> | undefined;
function initialize() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  // A user-scoped IndexedDB cache/outbox handles offline storage (see sync.ts).
  const db = initializeFirestore(app, { localCache: memoryLocalCache(), ignoreUndefinedProperties: true });
  if (process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "true") {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
  return { app, auth, db };
}

export function getFirebase() {
  if (typeof window === "undefined") throw new Error("Firebase client services require a browser");
  return services ??= initialize();
}
