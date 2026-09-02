import { SituationId, situations } from "./situations";
import sessionsData from "@/generated/sessions.json";

export interface CatalogSession {
  id: string;
  title: string;
  durationMinutes: number;
  durationSeconds: number;
  situationId: SituationId | "discovery";
  isAvailable: boolean; // dynamically computed based on real audio on disk
  realSessionId?: string; // id in generated/sessions.json
  description?: string;
}

export interface Collection {
  id: string;
  title: string;
  shortLabel: string;
  color: string;
  textColor: string;
  voile: string;
}

export const DISCOVERY_COLLECTION: Collection = {
  id: "discovery",
  title: "Découvrir la méditation",
  shortLabel: "Découvrir la méditation",
  color: "#4A6474", // bleu-ardoise apaisant
  textColor: "#FDF9F0",
  voile: "#E4ECEF",
};

interface RawCatalogItem {
  id: string;
  title: string;
  durationMinutes: number;
  durationSeconds: number;
  situationId: SituationId | "discovery";
  realSessionId?: string;
  description?: string;
}

const RAW_CATALOG: RawCatalogItem[] = [
  // 1. Calmer le stress — 6 séances
  {
    id: "une-pause-pour-souffler-3min",
    title: "Une pause pour souffler",
    durationMinutes: 3,
    durationSeconds: 180,
    situationId: "stress",
    description: "Une courte pause respiratoire pour relâcher la pression immédiatement.",
  },
  {
    id: "revenir-au-calme-5min",
    title: "Revenir au calme",
    durationMinutes: 5,
    durationSeconds: 300,
    situationId: "stress",
    description: "Ralentir le souffle et retrouver un état de tranquillité intérieure.",
  },
  {
    id: "couper-la-montee-du-stress-5min",
    title: "Couper la montée du stress",
    durationMinutes: 5,
    durationSeconds: 300,
    situationId: "stress",
    description: "Désamorcer les signaux d'alerte corporels quand la tension monte.",
  },
  {
    id: "faire-redescendre-la-pression-10min",
    title: "Faire redescendre la pression",
    durationMinutes: 10,
    durationSeconds: 600,
    situationId: "stress",
    description: "Un temps prolongé pour calmer le système nerveux et déposer les tensions.",
  },
  {
    id: "retrouver-de-la-stabilite-10min",
    title: "Retrouver de la stabilité",
    durationMinutes: 10,
    durationSeconds: 600,
    situationId: "stress",
    description: "S'ancrer dans ses appuis et retrouver un socle solide en soi.",
  },
  {
    id: "decompresser-en-profondeur-20min",
    title: "Décompresser en profondeur",
    durationMinutes: 20,
    durationSeconds: 1200,
    situationId: "stress",
    description: "Une immersion complète pour évacuer la surcharge émotionnelle et physique.",
  },

  // 2. Trouver le sommeil — 6 séances
  {
    id: "preparer-le-sommeil-3min",
    title: "Préparer le sommeil",
    durationMinutes: 3,
    durationSeconds: 180,
    situationId: "sleep",
    description: "Une transition douce pour inviter le corps à ralentir avant d'éteindre la lumière.",
  },
  {
    id: "se-poser-avant-de-dormir-5min",
    title: "Se poser avant de dormir",
    durationMinutes: 5,
    durationSeconds: 300,
    situationId: "sleep",
    description: "Déposer les pensées de la journée et s'installer dans un état propice au repos.",
  },
  {
    id: "quand-le-sommeil-ne-vient-pas-5min",
    title: "Quand le sommeil ne vient pas",
    durationMinutes: 5,
    durationSeconds: 300,
    situationId: "sleep",
    description: "Dédramatiser l'insomnie et apaiser l'impatience dans le lit.",
  },
  {
    id: "laisser-la-journee-derriere-soi-10min",
    title: "Laisser la journée derrière soi",
    durationMinutes: 10,
    durationSeconds: 600,
    situationId: "sleep",
    description: "Fermer symboliquement les portes de la journée écoulée pour libérer la nuit.",
  },
  {
    id: "calmer-le-mental-pour-la-nuit-10min",
    title: "Calmer le mental pour la nuit",
    durationMinutes: 10,
    durationSeconds: 600,
    situationId: "sleep",
    description: "Désamorcer le flux des pensées et plonger dans une douce pénombre intérieure.",
  },
  {
    id: "glisser-doucement-vers-le-sommeil-20min",
    title: "Glisser doucement vers le sommeil",
    durationMinutes: 20,
    durationSeconds: 1200,
    situationId: "sleep",
    description: "Une guidance progressive qui s'efface peu à peu pour laisser place au sommeil.",
  },

  // 3. Calmer les pensées — 6 séances
  {
    id: "sortir-de-la-boucle-3min",
    title: "Sortir de la boucle",
    durationMinutes: 3,
    durationSeconds: 180,
    situationId: "thoughts",
    description: "Interrompre net une spirale de ruminations et revenir au concret.",
  },
  {
    id: "quand-tout-tourne-dans-la-tete-5min",
    title: "Quand tout tourne dans la tête",
    durationMinutes: 5,
    durationSeconds: 300,
    situationId: "thoughts",
    description: "Créer une première distance entre vous et le bavardage incessant de l'esprit.",
  },
  {
    id: "prendre-du-recul-sur-ses-pensees-5min",
    title: "Prendre du recul sur ses pensées",
    durationMinutes: 5,
    durationSeconds: 300,
    situationId: "thoughts",
    description: "Observer ses pensées comme des nuages qui passent sans s'y accrocher.",
  },
  {
    id: "faire-de-la-place-dans-son-esprit-10min",
    title: "Faire de la place dans son esprit",
    durationMinutes: 10,
    durationSeconds: 600,
    situationId: "thoughts",
    description: "Clarifier le paysage intérieur et aérer l'espace mental encombré.",
  },
  {
    id: "calmer-un-mental-agite-10min",
    title: "Calmer un mental agité",
    durationMinutes: 10,
    durationSeconds: 600,
    situationId: "thoughts",
    description: "Apaiser la turbulence mentale en canalisant doucement l'attention.",
  },
  {
    id: "laisser-passer-les-pensees-20min",
    title: "Laisser passer les pensées",
    durationMinutes: 20,
    durationSeconds: 1200,
    situationId: "thoughts",
    description: "Un entraînement approfondi au détachement et à la paix de l'esprit.",
  },

  // 4. Retrouver sa concentration — 6 séances
  {
    id: "revenir-a-lessentiel-3min",
    title: "Revenir à l'essentiel",
    durationMinutes: 3,
    durationSeconds: 180,
    situationId: "focus",
    realSessionId: "revenir-a-lessentiel-3min",
    description: "Recentrer instantanément son regard sur la priorité du moment.",
  },
  {
    id: "retrouver-son-attention-5min",
    title: "Retrouver son attention",
    durationMinutes: 5,
    durationSeconds: 300,
    situationId: "focus",
    description: "Resserrer le faisceau de l'attention quand l'esprit commence à papillonner.",
  },
  {
    id: "se-preparer-a-travailler-5min",
    title: "Se préparer à travailler",
    durationMinutes: 5,
    durationSeconds: 300,
    situationId: "focus",
    description: "Poser une intention claire et entrer dans un état de concentration fluide.",
  },
  {
    id: "se-concentrer-sur-une-seule-chose-10min",
    title: "Se concentrer sur une seule chose",
    durationMinutes: 10,
    durationSeconds: 600,
    situationId: "focus",
    description: "Apprendre à maintenir une présence soutenue sur un seul objet d'attention.",
  },
  {
    id: "revenir-apres-une-distraction-10min",
    title: "Revenir après une distraction",
    durationMinutes: 10,
    durationSeconds: 600,
    situationId: "focus",
    description: "Se remettre au travail sans culpabilité après une interruption.",
  },
  {
    id: "stabiliser-son-attention-20min",
    title: "Stabiliser son attention",
    durationMinutes: 20,
    durationSeconds: 1200,
    situationId: "focus",
    description: "Développer une clarté et une endurance cognitive durables.",
  },

  // 5. Relâcher les tensions — 6 séances
  {
    id: "relacher-les-epaules-3min",
    title: "Relâcher les épaules",
    durationMinutes: 3,
    durationSeconds: 180,
    situationId: "tensions",
    description: "Libérer les raideurs accumulées dans la nuque et les épaules.",
  },
  {
    id: "pause-detente-5min",
    title: "Pause détente",
    durationMinutes: 5,
    durationSeconds: 300,
    situationId: "tensions",
    description: "Prendre un instant pour dénouer le corps et relâcher la pression physique.",
  },
  {
    id: "souffler-apres-une-journee-chargee-5min",
    title: "Souffler après une journée chargée",
    durationMinutes: 5,
    durationSeconds: 300,
    situationId: "tensions",
    description: "Marquer une coupure nette entre le rythme de la journée et le repos.",
  },
  {
    id: "relacher-les-tensions-10min",
    title: "Relâcher les tensions",
    durationMinutes: 10,
    durationSeconds: 600,
    situationId: "tensions",
    description: "Parcourir les zones de résistance et leur offrir de la douceur.",
  },
  {
    id: "detendre-le-haut-du-corps-10min",
    title: "Détendre le haut du corps",
    durationMinutes: 10,
    durationSeconds: 600,
    situationId: "tensions",
    description: "Dénouer le dos, les trapèzes et la mâchoire pour retrouver de l'aisance.",
  },
  {
    id: "detendre-le-corps-progressivement-20min",
    title: "Détendre le corps progressivement",
    durationMinutes: 20,
    durationSeconds: 1200,
    situationId: "tensions",
    description: "Un scan corporel méthodique et profond des pieds jusqu'au sommet du crâne.",
  },

  // 6. Se recentrer — 6 séances
  {
    id: "revenir-au-present-3min",
    title: "Revenir au présent",
    durationMinutes: 3,
    durationSeconds: 180,
    situationId: "recenter",
    description: "Quitter le mode pilote automatique pour habiter pleinement l'instant.",
  },
  {
    id: "se-recentrer-5min",
    title: "Se recentrer",
    durationMinutes: 5,
    durationSeconds: 300,
    situationId: "recenter",
    description: "Rassembler son énergie dispersée et retrouver son équilibre intérieur.",
  },
  {
    id: "faire-une-pause-mentale-5min",
    title: "Faire une pause mentale",
    durationMinutes: 5,
    durationSeconds: 300,
    situationId: "recenter",
    description: "S'accorder un sas de calme au milieu du tourbillon quotidien.",
  },
  {
    id: "retrouver-ses-reperes-10min",
    title: "Retrouver ses repères",
    durationMinutes: 10,
    durationSeconds: 600,
    situationId: "recenter",
    description: "Prendre de la hauteur et renouer avec ce qui compte vraiment.",
  },
  {
    id: "creer-un-peu-d-espace-10min",
    title: "Créer un peu d'espace",
    durationMinutes: 10,
    durationSeconds: 600,
    situationId: "recenter",
    description: "Ouvrir une respiration ample et dégager de l'espace en soi.",
  },
  {
    id: "retrouver-un-rythme-plus-calme-20min",
    title: "Retrouver un rythme plus calme",
    durationMinutes: 20,
    durationSeconds: 1200,
    situationId: "recenter",
    description: "Ralentir durablement la cadence et goûter à une paix profonde.",
  },

  // 7. Découvrir la méditation — 3 séances (Collection Explorer)
  {
    id: "premiers-pas-en-meditation-3min",
    title: "Premiers pas en méditation",
    durationMinutes: 3,
    durationSeconds: 180,
    situationId: "discovery",
    description: "Une initiation très simple sans jargon ni contrainte de posture.",
  },
  {
    id: "decouvrir-la-respiration-5min",
    title: "Découvrir la respiration",
    durationMinutes: 5,
    durationSeconds: 300,
    situationId: "discovery",
    description: "Explorer le souffle comme le point d'ancrage le plus naturel et accessible.",
  },
  {
    id: "apprendre-a-revenir-a-son-attention-10min",
    title: "Apprendre à revenir à son attention",
    durationMinutes: 10,
    durationSeconds: 600,
    situationId: "discovery",
    description: "Comprendre que se déconcentrer est normal, et s'entraîner à revenir avec douceur.",
  },
];

/**
 * Dynamically resolves availability against verified audio sessions in sessions.json
 */
export const SESSIONS_CATALOG: CatalogSession[] = RAW_CATALOG.map((item) => {
  const real = (sessionsData as Array<{ id: string; metadata?: { durationSeconds?: number } }>).find(
    (s) => s.id === item.id || (item.realSessionId && s.id === item.realSessionId)
  );
  return {
    ...item,
    isAvailable: Boolean(real),
    realSessionId: real ? real.id : undefined,
    durationSeconds: real?.metadata?.durationSeconds || item.durationSeconds,
  };
});

export function getCatalogSessionById(id: string): CatalogSession | undefined {
  return SESSIONS_CATALOG.find((s) => s.id === id || s.realSessionId === id);
}

export function getCategoryInfo(categoryId: string): { label: string; color: string; voile: string } {
  if (categoryId === "discovery") {
    return {
      label: DISCOVERY_COLLECTION.shortLabel,
      color: DISCOVERY_COLLECTION.color,
      voile: DISCOVERY_COLLECTION.voile,
    };
  }
  const sit = situations[categoryId as SituationId];
  if (sit) {
    return {
      label: sit.shortLabel,
      color: sit.color,
      voile: sit.voile,
    };
  }
  return {
    label: "Général",
    color: "#7A6E5E",
    voile: "#F0E5D6",
  };
}
