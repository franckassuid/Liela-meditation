import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, initializeFirestore, memoryLocalCache } from "firebase/firestore";

import { firebaseConfig } from "./config";
export { firebaseConfig } from "./config";

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
