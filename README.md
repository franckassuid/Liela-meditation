# Liela

Application de méditation en français, construite avec Next.js App Router, React,
TypeScript et Tailwind CSS. Les profils, préférences, favoris, progressions, historiques et retours sont synchronisés
avec Firebase pour les utilisateurs connectés. Le mode invité reste local. Les séances
téléchargées utilisent Cache Storage.

## Développement

Avec Node.js 20.9 ou plus récent et npm :

```bash
npm ci
npm run dev
```

Le serveur démarre sur http://localhost:3000. `predev` et `prebuild` synchronisent
les manifestes de `public/sessions/` vers `src/generated/sessions.json`.
Ne pas modifier directement ce fichier généré.

## Vérifications

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Les tests utilisent le runner natif de Node.js et `tsx`, sans service externe.
Ils couvrent le téléchargement, son annulation, les échecs réseau/quota et
l'affichage des dates de l'historique. Pour vérifier explicitement les changements
d'heure français : `TZ=Europe/Paris npm test`.

Après compilation, `npm start` lance le serveur de production.

## Organisation

- `src/app/` : routes et écrans ; composants de bibliothèque dans `library/components/`.
- `src/components/` : composants partagés, navigation, PWA et rappels.
- `src/hooks/` : abonnements React partagés, notamment l'état réseau avec un rendu initial compatible SSR.
- `src/config/` : situations, catalogue et paramètres de recommandation.
- `src/lib/` : stockage local, recommandations, audio, téléchargements et formatage de l'historique.
- `public/sessions/<id>/` : manifeste `session.json`, pistes audio et données de visualisation.
- `public/sw.js` : service worker et lecture des fichiers téléchargés, avec requêtes Range.
- `scripts/` : validation/synchronisation des séances et génération des assets.
- `docs/` : spécifications produit et charte graphique.

Avant de modifier les API Next.js, lire les guides livrés dans
`node_modules/next/dist/docs/`, comme demandé dans `AGENTS.md`.

## Points de maintenance

- Les fichiers d'une séance sont marqués disponibles après téléchargement et vérification du cache.
  Une annulation conserve le verrou de téléchargement jusqu'à la fin du nettoyage.
- Le lecteur est réinitialisé lorsque l'identifiant de séance change ; les chargements
  asynchrones obsolètes sont ignorés à la fermeture.
- Le téléchargement automatique des favoris n'est pas implémenté, même si son réglage existe.
- Les rappels reposent sur les API du navigateur ; les temporisateurs du service worker
  ne garantissent pas un réveil de l'application fermée.

Pour une validation sur appareil, vérifier aussi la lecture audio, la reprise,
les contrôles système, le téléchargement et la lecture hors ligne sur iOS/Android.

## Firebase

Voir [le guide Firebase](docs/firebase/README.md) pour le schéma, les règles,
l’activation Auth/Firestore, l’import du catalogue et les tests sur émulateur.
