"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebase } from "@/lib/firebase/client";
import { getSyncStatus, initializeSync, setGuestSyncStatus, startUserSync, subscribeSync } from "@/lib/firebase/sync";
import { setStorageUser } from "@/lib/storage/local";
import { startCatalogSync } from "@/lib/firebase/catalog";
import { invalidateRecommendationCache } from "@/lib/recommendation";
import { ProfileSetupGate } from "@/components/account/ProfileSetupGate";

const AuthContext = createContext<{ user: User | null; error: string | null }>({ user: null, error: null });
export const useFirebaseUser = () => useContext(AuthContext);
export const useSyncStatus = () => useSyncExternalStore(subscribeSync, getSyncStatus, getSyncStatus);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    initializeSync();
    const { auth, db } = getFirebase();
    const catalog = startCatalogSync(db);
    let generation = 0;
    let stopSync: (() => void) | undefined;
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      const token = ++generation;
      // Unmount the previous account before changing the storage scope.
      flushSync(() => setReady(false));
      stopSync?.();
      setStorageUser(nextUser?.uid || null);
      invalidateRecommendationCache();
      setError(null);
      try {
        if (nextUser) {
          const sync = await startUserSync(db, nextUser.uid);
          if (token !== generation) { sync.stop(); return; }
          stopSync = sync.stop;
          await sync.ready;
        } else setGuestSyncStatus();
      } catch (e) {
        if (token === generation) setError(e instanceof Error ? e.message : "Connexion indisponible");
      }
      await catalog.ready;
      if (token !== generation) return;
      setUser(nextUser);
      setReady(true);
    }, (e) => { setError(e.message); setReady(true); });
    return () => { generation++; unsubscribe(); stopSync?.(); catalog.stop(); };
  }, []);
  return <AuthContext.Provider value={{ user, error }}>
    {ready ? <div key={user?.uid || "guest"} className="contents">{user ? <ProfileSetupGate>{children}</ProfileSetupGate> : children}</div> :
      <div role="status" className="min-h-screen flex items-center justify-center bg-creme text-gris-2">Chargement de votre espace…</div>}
  </AuthContext.Provider>;
}
