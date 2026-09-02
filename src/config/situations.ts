export type SituationId = "stress" | "sleep" | "thoughts" | "focus" | "tensions" | "recenter";

export interface Situation {
  id: SituationId;
  phrase: string;
  shortLabel: string;
  color: string;
  textColor: string;
  voile: string;
}

export const situations: Record<SituationId, Situation> = {
  stress: {
    id: "stress",
    phrase: "J'ai besoin de redescendre",
    shortLabel: "Calmer le stress",
    color: "#A26248", // terre-profonde
    textColor: "#FDF9F0",
    voile: "#F5E4DA", // terre-voile
  },
  sleep: {
    id: "sleep",
    phrase: "Je veux mieux m'endormir",
    shortLabel: "Trouver le sommeil",
    color: "#5D6A78", // dormir
    textColor: "#FDF9F0",
    voile: "#E4E8EC",
  },
  thoughts: {
    id: "thoughts",
    phrase: "Mon mental tourne en boucle",
    shortLabel: "Calmer les pensées",
    color: "#6E6257", // ruminer
    textColor: "#FDF9F0",
    voile: "#EFECE9",
  },
  focus: {
    id: "focus",
    phrase: "J'ai besoin de me concentrer",
    shortLabel: "Retrouver sa concentration",
    color: "#5F6A52", // concentrer
    textColor: "#FDF9F0",
    voile: "#E7E9DF", // sauge-voile
  },
  tensions: {
    id: "tensions",
    phrase: "J'ai besoin de souffler",
    shortLabel: "Relâcher les tensions",
    color: "#94702B", // energie
    textColor: "#FDF9F0",
    voile: "#F7F0E2",
  },
  recenter: {
    id: "recenter",
    phrase: "J'ai besoin de revenir au présent",
    shortLabel: "Se recentrer",
    color: "#7A5560", // recuperer
    textColor: "#FDF9F0",
    voile: "#F2E9EC",
  },
};

export const getSituation = (id?: string | null): Situation | undefined => {
  if (!id) return undefined;
  return situations[id as SituationId];
};
