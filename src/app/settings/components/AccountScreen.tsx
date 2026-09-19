"use client";
import { useEffect, useState } from "react";
import { useFirebaseUser, useSyncStatus } from "@/components/firebase/FirebaseProvider";
import { authErrorMessage, registerEmail, resetPassword, signInEmail, signInGoogle, signOutAccount } from "@/lib/firebase/auth";
import { useEntitlements } from "@/hooks/useEntitlements";
import { sessions } from "@/lib/sessions";
import { storage } from "@/lib/storage";
import type { ExperienceLevel } from "@/lib/firebase/schema";

export function AccountScreen({ onBack }: { onBack: () => void }) {
  const { user, error: initializationError } = useFirebaseUser();
  const sync = useSyncStatus();
  const entitlements = useEntitlements();
  const [voice, setVoice] = useState("Algenib");
  const voices = [...new Set(["Algenib", ...sessions.flatMap((session) => Object.keys(session.audio.voices || {}))])];
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [level, setLevel] = useState<ExperienceLevel>("beginner");
  useEffect(() => {
    let active = true;
    storage.getAudioPreferences().then((prefs) => { if (active) setVoice(prefs.voice || "Algenib"); });
    storage.getProfile().then((profile) => { if (active) { setFirstName(profile.firstName); setLevel(profile.level); } });
    return () => { active = false; };
  }, []);
  const perform = async (action: () => Promise<unknown>) => {
    setBusy(true); setMessage("");
    try { await action(); } catch (error) { setMessage(authErrorMessage(error)); }
    finally { setBusy(false); }
  };
  const fieldClass = "w-full bg-white border border-filet rounded-xl px-3 py-3 text-[14px]";
  return <div className="p-marge pb-12 flex flex-col gap-4">
    <button onClick={onBack} className="text-left text-[13px]">← Réglages</button>
    <h1 className="font-poppins font-light text-[24px]">Mon compte</h1>
    {user ? <>
      <p className="text-[14px]">{user.email}</p>
      <p className="text-[13px] text-gris-2">Offre : {entitlements?.plan || "Gratuite"}{entitlements ? ` · ${entitlements.status}` : ""}</p>
      <p role="status" className="text-[13px] text-gris-2">
        {sync.state === "error" ? "Synchronisation interrompue. Vos modifications restent sur cet appareil." : sync.state === "offline" ? "Hors ligne · synchronisation au retour de la connexion" : sync.state === "syncing" ? "Synchronisation en cours…" : "Données synchronisées"}
      </p>
      {sync.state === "error" && <button onClick={() => window.location.reload()} className="text-left underline">Réessayer la synchronisation</button>}
      <button disabled={busy} onClick={() => perform(signOutAccount)} className="text-left text-[#A0483C]">Se déconnecter</button>
    </> : <>
      <p className="text-[13px] text-gris-2">Retrouvez vos favoris, vos préférences et votre progression sur vos appareils. À la première connexion, les données invité de cet appareil sont importées sans remplacer les données existantes du compte.</p>
      <button disabled={busy} onClick={() => perform(signInGoogle)} className="rounded-xl border border-filet bg-white p-3">Continuer avec Google</button>
      <div className="flex gap-4 text-[13px]">
        <button onClick={() => setMode("login")} aria-pressed={mode === "login"} className={mode === "login" ? "font-semibold underline" : ""}>Se connecter</button>
        <button onClick={() => setMode("register")} aria-pressed={mode === "register"} className={mode === "register" ? "font-semibold underline" : ""}>Créer un compte</button>
      </div>
      <form className="flex flex-col gap-3" onSubmit={(event) => { event.preventDefault(); void perform(() => mode === "register" ? registerEmail(email, password) : signInEmail(email, password)); }}>
        <label className="text-[13px]">E-mail<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} /></label>
        <label className="text-[13px]">Mot de passe<input required type="password" minLength={6} autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} className={fieldClass} /></label>
        <button disabled={busy} className="rounded-xl bg-encre text-creme p-3 disabled:opacity-50">{busy ? "Connexion…" : mode === "register" ? "Créer mon compte" : "Se connecter"}</button>
      </form>
      <button disabled={busy || !email.trim()} onClick={() => perform(async () => { await resetPassword(email); setMessage("Si cette adresse correspond à un compte, un e-mail de réinitialisation sera envoyé."); })} className="text-left text-[13px] underline">Mot de passe oublié</button>
      <button onClick={onBack} className="text-left text-[13px] text-gris-2">Continuer en invité sur cet appareil</button>
    </>}
    {(message || initializationError) && <p role="alert" className="text-[13px]">{message || initializationError}</p>}
    <form className="flex flex-col gap-3 mt-3" onSubmit={async (event) => {
      event.preventDefault();
      const saved = await storage.setProfile({ firstName: firstName.trim(), level });
      const audioSaved = await storage.setAudioPreferences({ voice });
      setMessage(saved && audioSaved ? "Profil enregistré" : "Le profil n’a pas pu être enregistré.");
    }}>
      <h2 className="font-poppins text-[18px]">Votre profil</h2>
      <label className="text-[13px]">Prénom (facultatif)<input maxLength={80} autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={fieldClass} /></label>
      <label className="text-[13px]">Expérience<select value={level} onChange={(e) => setLevel(e.target.value as ExperienceLevel)} className={fieldClass}>
        <option value="beginner">Débutant</option><option value="intermediate">Intermédiaire</option><option value="advanced">Avancé</option>
      </select></label>
      <label className="text-[13px]">Voix préférée<select value={voice} onChange={(event) => setVoice(event.target.value)} className={fieldClass}>
        {[...new Set([...voices, voice])].map((name) => <option key={name} value={name}>{name}</option>)}
      </select></label>
      <p className="text-[12px] text-gris-2">Si cette voix n’est pas disponible pour une séance, sa voix d’origine est utilisée.</p>
      <button className="rounded-xl border border-filet p-3">Enregistrer mon profil</button>
    </form>
  </div>;
}
