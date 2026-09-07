export type SituationId = 
  | "calmer-le-stress" 
  | "trouver-le-sommeil" 
  | "calmer-les-pensees" 
  | "retrouver-sa-concentration" 
  | "relacher-les-tensions" 
  | "se-recentrer";

export interface Situation {
  id: SituationId;
  slug: string;
  phrase: string;
  shortLabel: string;
  color: string;
  textColor: string;
  voile: string;
  icon: string;
  shortDescription: string;
  order: number;
}

export const situations: Record<SituationId, Situation> = {
  "calmer-le-stress": {
    id: "calmer-le-stress",
    slug: "calmer-le-stress",
    phrase: "J'ai besoin de redescendre",
    shortLabel: "Calmer le stress",
    shortDescription: "Pour faire descendre la pression, ralentir le rythme et retrouver son souffle.",
    color: "#A26248", // terre-profonde
    textColor: "#FDF9F0",
    voile: "#F5E4DA", // terre-voile
    icon: "stress",
    order: 1,
  },
  "trouver-le-sommeil": {
    id: "trouver-le-sommeil",
    slug: "trouver-le-sommeil",
    phrase: "Je veux mieux m'endormir",
    shortLabel: "Trouver le sommeil",
    shortDescription: "L'écran s'éteindra tout seul.",
    color: "#5D6A78", // dormir
    textColor: "#FDF9F0",
    voile: "#E4E8EC",
    icon: "sleep",
    order: 2,
  },
  "calmer-les-pensees": {
    id: "calmer-les-pensees",
    slug: "calmer-les-pensees",
    phrase: "Mon mental tourne en boucle",
    shortLabel: "Calmer les pensées",
    shortDescription: "Quand les mêmes pensées reviennent sans arrêt, ou que vous n'arrivez pas à décrocher.",
    color: "#6E6257", // ruminer
    textColor: "#FDF9F0",
    voile: "#EFECE9",
    icon: "thoughts",
    order: 3,
  },
  "retrouver-sa-concentration": {
    id: "retrouver-sa-concentration",
    slug: "retrouver-sa-concentration",
    phrase: "J'ai besoin de me concentrer",
    shortLabel: "Retrouver sa concentration",
    shortDescription: "Pour rassembler votre attention et vous poser avant une tâche importante.",
    color: "#5F6A52", // concentrer
    textColor: "#FDF9F0",
    voile: "#E7E9DF", // sauge-voile
    icon: "focus",
    order: 4,
  },
  "relacher-les-tensions": {
    id: "relacher-les-tensions",
    slug: "relacher-les-tensions",
    phrase: "J'ai besoin de souffler",
    shortLabel: "Relâcher les tensions",
    shortDescription: "Pour dénouer les tensions dans le corps, relâcher les épaules et respirer.",
    color: "#94702B", // energie
    textColor: "#FDF9F0",
    voile: "#F7F0E2",
    icon: "tensions",
    order: 5,
  },
  "se-recentrer": {
    id: "se-recentrer",
    slug: "se-recentrer",
    phrase: "J'ai besoin de revenir au présent",
    shortLabel: "Se recentrer",
    shortDescription: "Pour revenir au moment présent, habiter son corps et retrouver son axe.",
    color: "#7A5560", // recuperer
    textColor: "#FDF9F0",
    voile: "#F2E9EC",
    icon: "recenter",
    order: 6,
  },
};

export const getSituation = (id?: string | null): Situation | undefined => {
  if (!id) return undefined;
  return situations[id as SituationId];
};
