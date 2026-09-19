"use client";

import { useEffect, useRef, useState } from "react";
import { situations, type SituationId } from "@/config/situations";
import { storage } from "@/lib/storage";
import type { ExperienceLevel, UserProfile } from "@/lib/firebase/schema";
import { AccountBack, AccountBrand, inputClass, primaryButton } from "./AccountPrimitives";

const levels: { value: ExperienceLevel; title: string; detail: string }[] = [
  { value: "beginner", title: "Je découvre", detail: "Je fais mes premiers pas, à mon rythme." },
  { value: "intermediate", title: "J’ai déjà essayé", detail: "Je médite de temps en temps." },
  { value: "advanced", title: "J’ai l’habitude", detail: "La méditation fait partie de mon quotidien." },
];
const titles = ["Comment vous appeler ?", "Où en êtes-vous avec la méditation ?", "Qu’est-ce qui vous amène ici ?", "Quel temps aimeriez-vous vous offrir ?"];
const descriptions = ["Un prénom suffit. Vous pouvez aussi le garder pour vous.", "Il n’y a pas de bon niveau. Juste votre point de départ.", "Choisissez ce qui compte le plus pour vous aujourd’hui.", "Quelques minutes, c’est déjà un moment pour vous."];

export function ProfileSetup({ profile, onComplete, onLater, editing = false }: {
  profile: UserProfile; onComplete: () => void; onLater: () => void; editing?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState(profile.firstName);
  const [level, setLevel] = useState<ExperienceLevel>(profile.level);
  const [situation, setSituation] = useState<SituationId | null>(profile.primarySituation || null);
  const [duration, setDuration] = useState(profile.preferredDurationMinutes || 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, [step]);

  async function advance() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const saved = await storage.setProfile({
        firstName: firstName.trim(), level, primarySituation: situation, preferredDurationMinutes: duration,
        ...(step === 3 ? { profileSetupCompleted: true, onboardingCompleted: true } : {}),
      });
      if (!saved) throw new Error("save-failed");
      if (step === 3) onComplete(); else setStep((value) => value + 1);
    } catch { setError("Vos réponses n’ont pas pu être enregistrées. Réessayez pour continuer."); }
    finally { setBusy(false); }
  }

  const choice = (selected: boolean) => `flex w-full items-center justify-between gap-3 rounded-md border px-4 py-4 text-left transition-colors ${selected ? "border-sauge-p bg-sauge-voile" : "border-filet bg-white hover:border-sauge"}`;
  const dot = (selected: boolean) => <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? "border-sauge-p bg-sauge-p" : "border-bord"}`}>{selected && <span className="h-2 w-2 rounded-full bg-white" />}</span>;

  return <section className={`mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-creme px-6 pt-4 text-encre ${editing ? "pb-28" : "pb-8"}`}>
    <div className="flex items-center justify-between">
      <AccountBack onClick={() => { if (!busy) { if (step > 0) { setStep(step - 1); setError(""); } else onLater(); } }} label={step > 0 ? "Retour" : editing ? "Mon compte" : "Plus tard"} />
      <span className="text-xs tracking-[0.14em] text-gris-2">{step + 1} / 4</span>
    </div>
    <AccountBrand />
    <div className="mb-8 flex gap-2" aria-label={`Étape ${step + 1} sur 4`}>
      {titles.map((title, index) => <span key={title} className={`h-1 flex-1 rounded-full ${index <= step ? "bg-sauge-p" : "bg-filet"}`} />)}
    </div>
    <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-sauge-p">{editing ? "Votre profil" : "Faisons connaissance"}</p>
    <h1 ref={titleRef} tabIndex={-1} className="font-poppins text-[27px] font-light leading-[1.35] outline-none">{titles[step]}</h1>
    <p className="mb-7 mt-3 text-sm leading-relaxed text-gris-2">{descriptions[step]}</p>
    <form onSubmit={(event) => { event.preventDefault(); void advance(); }} className="flex flex-1 flex-col">
      <fieldset disabled={busy} className="mb-8 flex flex-col gap-3 disabled:opacity-60">
        <legend className="sr-only">{titles[step]}</legend>
        {step === 0 && <label className="text-sm">Votre prénom <span className="text-gris-2">(facultatif)</span><input className={inputClass} maxLength={80} autoComplete="given-name" placeholder="Prénom" value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>}
        {step === 1 && levels.map((item) => <label key={item.value} className={`${choice(level === item.value)} relative cursor-pointer focus-within:ring-2 focus-within:ring-sauge-p`}>
          <input className="sr-only" type="radio" name="level" value={item.value} checked={level === item.value} onChange={() => setLevel(item.value)} />
          <span><span className="block text-[15px] font-medium">{item.title}</span><span className="mt-1 block text-xs leading-relaxed text-gris-2">{item.detail}</span></span>{dot(level === item.value)}
        </label>)}
        {step === 2 && [...Object.values(situations).map((item) => ({ value: item.id as SituationId | null, title: item.shortLabel })), { value: null, title: "Simplement découvrir" }].map((item) => <label key={item.value || "discovery"} className={`${choice(situation === item.value)} cursor-pointer focus-within:ring-2 focus-within:ring-sauge-p`}>
          <input className="sr-only" type="radio" name="situation" checked={situation === item.value} onChange={() => setSituation(item.value)} /><span className="text-sm">{item.title}</span>{dot(situation === item.value)}
        </label>)}
        {step === 3 && [3, 5, 10, 20, 0].map((value) => <label key={value} className={`${choice(duration === value)} cursor-pointer focus-within:ring-2 focus-within:ring-sauge-p`}>
          <input className="sr-only" type="radio" name="duration" checked={duration === value} onChange={() => setDuration(value)} /><span className="text-sm">{value ? `${value} minutes` : "Selon le moment"}</span>{dot(duration === value)}
        </label>)}
      </fieldset>
      <div className="mt-auto">
        {error && <p role="alert" className="mb-4 text-sm text-etat-erreur">{error}</p>}
        <button disabled={busy} className={primaryButton}>{busy ? "Enregistrement…" : step === 3 ? editing ? "Enregistrer mon profil" : "Commencer avec Liela" : "Continuer"}</button>
        <p className="mt-4 text-center text-xs leading-relaxed text-gris-2">Vos envies peuvent évoluer. Vous pourrez modifier ces réponses dans votre compte.</p>
      </div>
    </form>
  </section>;
}
