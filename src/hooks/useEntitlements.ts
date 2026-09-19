"use client";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useFirebaseUser } from "@/components/firebase/FirebaseProvider";
import { getFirebase } from "@/lib/firebase/client";
import type { Entitlements } from "@/lib/firebase/schema";

/** Read-only. Only a verified backend purchase can populate this document. */
export function useEntitlements() {
  const { user } = useFirebaseUser();
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(getFirebase().db, `users/${user.uid}/entitlements/current`), (snapshot) => {
      setEntitlements(snapshot.exists() ? snapshot.data() as Entitlements : null);
    }, () => setEntitlements(null));
  }, [user]);
  if (!user) return null;
  return entitlements;
}
