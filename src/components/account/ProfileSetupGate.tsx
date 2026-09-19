"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStorageRevision } from "@/hooks/useStorageRevision";
import { storage } from "@/lib/storage";
import type { UserProfile } from "@/lib/firebase/schema";
import { ProfileSetup } from "./ProfileSetup";

// Mounted afresh for each authenticated UID, after the initial cloud sync.
export function ProfileSetupGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const revision = useStorageRevision();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    let active = true;
    void storage.getProfile().then((value) => { if (active) setProfile(value); });
    return () => { active = false; };
  }, [revision]);
  if (!profile) return <div role="status" className="flex min-h-[100dvh] items-center justify-center text-sm text-gris-2">Votre espace se prépare…</div>;
  if (!dismissed && !profile.profileSetupCompleted) return <ProfileSetup profile={profile} onLater={() => setDismissed(true)} onComplete={() => { setDismissed(true); router.replace("/"); }} />;
  return children;
}
