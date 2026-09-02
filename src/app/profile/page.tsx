"use client";

import React, { useState } from "react";
import { storage } from "@/lib/storage";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ProfilePage() {
  const [firstName, setFirstName] = useState(() => storage.getProfile().firstName);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(() => storage.getAudioPreferences().musicEnabled);
  const [ambienceEnabled, setAmbienceEnabled] = useState(() => storage.getAudioPreferences().ambienceEnabled);

  const handleSaveName = () => {
    storage.setProfile({ firstName });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const toggleMusic = () => {
    const val = !musicEnabled;
    setMusicEnabled(val);
    storage.setAudioPreferences({ musicEnabled: val });
  };

  const toggleAmbience = () => {
    const val = !ambienceEnabled;
    setAmbienceEnabled(val);
    storage.setAudioPreferences({ ambienceEnabled: val });
  };

  return (
    <div className="p-marge pb-8 flex flex-col flex-1">
      <h1 className="font-poppins font-light text-[24px] leading-[1.2] mb-6 mt-2">
        Profil & Réglages
      </h1>
      
      <div className="mb-8 bg-surface p-4 rounded-md shadow-p1">
        <label className="block text-[13px] text-gris-2 mb-2 font-medium">Prénom (facultatif)</label>
        <div className="flex gap-2">
          <Input 
            value={firstName} 
            onChange={e => setFirstName(e.target.value)} 
            placeholder="Votre prénom"
          />
          <Button variant="secondary" onClick={handleSaveName}>
            {savedSuccess ? "Enregistré !" : "Enregistrer"}
          </Button>
        </div>
      </div>

      <div className="bg-surface p-4 rounded-md shadow-p1">
        <h2 className="font-poppins text-[16px] mb-2 font-medium">Préférences Audio</h2>
        <p className="text-[12.5px] text-gris-2 mb-4">Ces réglages s&apos;appliqueront par défaut lors de vos séances.</p>
        
        <div className="flex items-center justify-between py-3.5 border-b border-filet">
          <div>
            <span className="text-[15px] font-medium text-encre block">Musique</span>
            <span className="text-[12px] text-gris-3">Accompagnement mélodique</span>
          </div>
          <button 
            onClick={toggleMusic}
            aria-label="Activer ou désactiver la musique"
            className={`w-11 h-6 rounded-full relative transition-colors ${musicEnabled ? "bg-sauge-p" : "bg-bord"}`}
          >
            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${musicEnabled ? "translate-x-5" : ""}`} />
          </button>
        </div>
        
        <div className="flex items-center justify-between py-3.5">
          <div>
            <span className="text-[15px] font-medium text-encre block">Ambiance sonore</span>
            <span className="text-[12px] text-gris-3">Sons de nature ou d&apos;ambiance</span>
          </div>
          <button 
            onClick={toggleAmbience}
            aria-label="Activer ou désactiver l'ambiance sonore"
            className={`w-11 h-6 rounded-full relative transition-colors ${ambienceEnabled ? "bg-sauge-p" : "bg-bord"}`}
          >
            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${ambienceEnabled ? "translate-x-5" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
