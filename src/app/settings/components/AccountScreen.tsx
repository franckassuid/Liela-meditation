"use client";
import { useEffect, useState } from "react";
import { useFirebaseUser, useSyncStatus } from "@/components/firebase/FirebaseProvider";
import { AccountBack, AccountBrand, AppleIcon, GoogleIcon, inputClass, primaryButton } from "@/components/account/AccountPrimitives";
import { ProfileSetup } from "@/components/account/ProfileSetup";
import { authErrorMessage, registerEmail, resetPassword, signInEmail, signInGoogle, signOutAccount } from "@/lib/firebase/auth";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useStorageRevision } from "@/hooks/useStorageRevision";
import { situations } from "@/config/situations";
import { sessions } from "@/lib/sessions";
import { storage } from "@/lib/storage";
import type { UserProfile } from "@/lib/firebase/schema";

type AuthView = "welcome" | "login" | "register" | "reset";

export function AccountScreen({ onBack, onPrivacy }: { onBack: () => void; onPrivacy: () => void }) {
  const { user, error: initializationError } = useFirebaseUser();
  const sync = useSyncStatus();
  const entitlements = useEntitlements();
  const revision = useStorageRevision();
  const [view, setView] = useState<AuthView>("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [voice, setVoice] = useState("Algenib");
  const voices = [...new Set(["Algenib", voice, ...sessions.flatMap((session) => Object.keys(session.audio.voices || {}))])];
  useEffect(() => {
    let active = true;
    void storage.getProfile().then((value) => { if (active) setProfile(value); });
    void storage.getAudioPreferences().then((prefs) => { if (active) setVoice(prefs.voice || "Algenib"); });
    return () => { active = false; };
  }, [revision]);
  function navigate(next: AuthView) { setView(next); setError(""); setMessage(""); setPassword(""); setShowPassword(false); }
  async function perform(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try { await action(); } catch (error) { setError(authErrorMessage(error)); }
    finally { setBusy(false); }
  }
  if (user && editing && profile) return <ProfileSetup editing profile={profile} onLater={() => setEditing(false)} onComplete={() => {
    setEditing(false); setMessage("Votre profil a été enregistré.");
    void storage.getProfile().then(setProfile);
  }} />;

  if (user) return <section className="mx-auto w-full max-w-md px-6 pb-28 pt-4">
    <AccountBack onClick={onBack} label="Réglages" />
    <AccountBrand />
    <h1 className="font-poppins text-[28px] font-light">{profile?.firstName ? `Bonjour ${profile.firstName}` : "Votre espace"}</h1>
    <p className="mt-2 break-words text-sm text-gris-2">{user.email}</p>
    <div className="my-7 rounded-lg border border-filet bg-white p-5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-sauge-p">Votre profil</p>
      <p className="mt-3 text-sm">{profile?.level === "advanced" ? "Une pratique régulière" : profile?.level === "intermediate" ? "Une pratique occasionnelle" : "Les premiers pas"}</p>
      {profile?.primarySituation && <p className="mt-2 text-sm text-gris-2">{situations[profile.primarySituation]?.shortLabel}</p>}
      {profile?.preferredDurationMinutes !== undefined && <p className="mt-2 text-sm text-gris-2">{profile.preferredDurationMinutes ? `${profile.preferredDurationMinutes} minutes pour vous` : "Une durée selon le moment"}</p>}
      <button disabled={!profile} onClick={() => setEditing(true)} className="mt-4 min-h-11 text-sm font-medium text-sauge-p underline underline-offset-4">{profile?.profileSetupCompleted ? "Modifier mes réponses" : "Compléter mon profil"}</button>
    </div>
    <label className="block text-sm">Voix préférée<select className={inputClass} disabled={busy} value={voice} onChange={async (event) => {
      const next = event.target.value; setBusy(true); setError(""); setMessage("");
      try { if (await storage.setAudioPreferences({ voice: next })) { setVoice(next); setMessage("Voix enregistrée."); } else setError("La voix n’a pas pu être enregistrée."); }
      catch { setError("La voix n’a pas pu être enregistrée."); } finally { setBusy(false); }
    }}>{voices.map((name) => <option key={name}>{name}</option>)}</select></label>
    <p className="mt-2 text-xs leading-relaxed text-gris-2">Lorsqu’une voix n’est pas disponible, la séance conserve sa voix d’origine.</p>
    <div className="my-6 border-y border-filet py-5 text-sm text-gris-2">
      <p>Offre : {entitlements?.plan || "Gratuite"}{entitlements ? ` · ${entitlements.status}` : ""}</p>
      <p role="status" className="mt-2">{sync.state === "error" ? "Synchronisation interrompue. Vos réponses restent sur cet appareil." : sync.state === "offline" ? "Hors ligne · synchronisation à la reconnexion" : sync.state === "syncing" ? "Synchronisation en cours…" : "Données synchronisées"}</p>
      {sync.state === "error" && <button onClick={() => window.location.reload()} className="mt-3 min-h-11 underline">Réessayer</button>}
    </div>
    {message && <p role="status" className="mb-4 text-sm text-sauge-p">{message}</p>}
    {(error || initializationError) && <p role="alert" className="mb-4 text-sm text-etat-erreur">{error || initializationError}</p>}
    <button disabled={busy} onClick={() => void perform(signOutAccount)} className="min-h-11 text-sm text-etat-erreur">Se déconnecter</button>
  </section>;

  const isWelcome = view === "welcome";
  return <section className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-28 pt-4">
    <AccountBack onClick={() => { if (!busy) { if (isWelcome) onBack(); else navigate("welcome"); } }} label={isWelcome ? "Réglages" : "Retour"} />
    <AccountBrand />
    <div className="mb-8 mt-3 text-center">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-sauge-p">Un espace pour vous</p>
      <h1 className="font-poppins text-[29px] font-light leading-tight">{isWelcome ? "Bienvenue chez Liela" : view === "register" ? "Créons votre compte" : view === "reset" ? "Un nouveau départ" : "Heureux de vous retrouver"}</h1>
      <p className="mx-auto mt-4 max-w-[290px] text-sm leading-relaxed text-gris-2">{view === "reset" ? "Recevez un lien par e-mail pour choisir un nouveau mot de passe." : view === "register" ? "Vos séances, vos favoris, votre rythme. Retrouvez-les sur tous vos appareils." : "Retrouvez vos petits moments de calme, où que vous soyez."}</p>
    </div>
    {isWelcome ? <>
      <div className="flex flex-col gap-3">
        <button disabled={busy} onClick={() => void perform(signInGoogle)} className="flex min-h-14 w-full items-center justify-center gap-3 rounded-full border border-filet bg-white px-4 py-4 text-[15px] font-medium shadow-p1 transition-colors hover:border-sauge focus-visible:outline-sauge-p disabled:opacity-60"><GoogleIcon />{busy ? "Connexion…" : "Se connecter avec Google"}</button>
        <button disabled aria-describedby="apple-soon" className="flex min-h-14 w-full cursor-not-allowed items-center justify-center gap-3 rounded-full border border-filet bg-sable/50 px-4 py-4 text-[15px] text-gris-2"><AppleIcon />Se connecter avec Apple</button>
        <span id="apple-soon" className="-mt-1 text-center text-[11px] tracking-wide text-gris-2">Bientôt disponible</span>
      </div>
      <div className="my-6 flex items-center gap-4 text-xs text-gris-2"><span className="h-px flex-1 bg-filet" />ou<span className="h-px flex-1 bg-filet" /></div>
      <button disabled={busy} onClick={() => navigate("login")} className={primaryButton}>Se connecter par e-mail</button>
      <div className="mt-7 border-t border-filet pt-5 text-center text-sm">
        <p className="text-gris-2">Vous découvrez Liela ?</p>
        <button disabled={busy} onClick={() => navigate("register")} className="min-h-11 font-medium text-sauge-p underline underline-offset-4">Créer un compte</button>
      </div>
    </> : <form onSubmit={(event) => { event.preventDefault(); void perform(async () => {
      if (view === "reset") { await resetPassword(email); setMessage("Si un compte correspond à cette adresse, un lien de réinitialisation vous sera envoyé."); }
      else if (view === "register") await registerEmail(email, password);
      else await signInEmail(email, password);
    }); }} className="flex flex-col gap-5">
      <label className="text-sm">Votre adresse e-mail<input autoFocus disabled={busy} className={inputClass} required type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="vous@exemple.fr" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      {view !== "reset" && <label className="text-sm">Votre mot de passe
        <span className="relative block"><input disabled={busy} className={`${inputClass} pr-24`} required type={showPassword ? "text" : "password"} minLength={view === "register" ? 6 : undefined} autoComplete={view === "register" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={showPassword} className="absolute bottom-1 right-2 min-h-11 px-2 text-xs text-sauge-p">{showPassword ? "Masquer" : "Afficher"}</button>
        </span>{view === "register" && <span className="mt-2 block text-xs text-gris-2">Au moins 6 caractères.</span>}
      </label>}
      {view === "login" && <button disabled={busy} type="button" onClick={() => navigate("reset")} className="-mt-2 min-h-11 self-end text-xs text-gris-2 underline underline-offset-4">Mot de passe oublié ?</button>}
      <button disabled={busy} className={primaryButton}>{busy ? "Un instant…" : view === "register" ? "Créer mon compte" : view === "reset" ? "Recevoir le lien" : "Se connecter"}</button>
      {view !== "reset" && <p className="text-center text-sm text-gris-2">{view === "register" ? "Déjà un compte ? " : "Pas encore de compte ? "}<button type="button" disabled={busy} onClick={() => navigate(view === "register" ? "login" : "register")} className="min-h-11 font-medium text-sauge-p underline underline-offset-4">{view === "register" ? "Se connecter" : "Créer un compte"}</button></p>}
    </form>}
    {message && <p role="status" className="mt-4 rounded-md bg-sauge-voile p-4 text-sm leading-relaxed text-sauge-p">{message}</p>}
    {(error || initializationError) && <p role="alert" className="mt-4 rounded-md bg-terre-voile p-4 text-sm leading-relaxed text-etat-erreur">{error || initializationError}</p>}
    <div className="mt-5 text-center"><button disabled={busy} onClick={onBack} className="min-h-11 text-sm text-gris-2 underline underline-offset-4">Continuer sans compte</button></div>
    <p className="mx-auto mt-7 max-w-[300px] text-center text-xs leading-relaxed text-gris-2">Un compte garde vos repères d’un appareil à l’autre. <button onClick={onPrivacy} className="underline underline-offset-2">Vos données et votre confidentialité</button></p>
  </section>;
}
