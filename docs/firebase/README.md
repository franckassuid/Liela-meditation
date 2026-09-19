# Firebase — Liela

## État de l’intégration

Le client utilise le projet `liela-9426c` fourni. La configuration web est publique ;
les accès sont contrôlés par Firebase Authentication et les règles Firestore.
Google Analytics n’est pas initialisé : la personnalisation utilise les données
métier décrites ci-dessous, sans ajouter de traceur Analytics.

Vérification du projet réel effectuée le **19 septembre 2026** :

- Accès CLI fonctionnel ; connexions **E-mail/Mot de passe** et **Google** activées.
- Domaines autorisés : `localhost`, `liela-9426c.firebaseapp.com`,
  `liela-9426c.web.app` et `app.liela.fr`.
- Base Firestore `(default)` en mode natif, région multizone **`nam5` (Amérique du Nord)**.
- Règles Firestore déployées identiques à `firestore.rules`.
- **38 séances importées**, avec catégories, ordre et références audio ;
  `catalog/config.enabled` activé. Lecture des 38 documents vérifiée avec le SDK
  client sans privilèges Admin, et lecture publique d’un profil refusée.
- Aucun bucket Cloud Storage actif : aucun audio téléversé ni règle Storage déployée.
  Les références audio continuent de viser les fichiers servis par l’application.

L’import a utilisé temporairement la connexion CLI existante, sans enregistrer de
clé privée. Les imports futurs via le script standard nécessitent les identifiants
Admin décrits ci-dessous. Les connexions interactives avec un compte utilisateur
réel n’ont pas été testées lors de cette vérification.

## Configuration du projet Firebase

1. Dans Firebase Console, activer **Authentication** avec les fournisseurs
   **E-mail/Mot de passe** et **Google**. Renseigner l’adresse de contact Google.
2. Ajouter les domaines de l’application aux domaines autorisés d’Authentication,
   ainsi que `localhost` pour le développement si nécessaire.
3. Créer **Cloud Firestore en mode natif**, choisir sa région avant création et
   commencer avec des règles fermées. Le client utilise la base `(default)`.
4. Avec la CLI connectée au compte autorisé, déployer les règles :

   ```bash
   firebase login
   npm run firebase:deploy:rules
   ```

   Si Cloud Storage n’est pas encore activé, déployer uniquement Firestore :

   ```bash
   npx firebase deploy --only firestore:rules,firestore:indexes --project liela-9426c
   ```

5. Préparer les identifiants **Admin côté serveur** avec Application Default
   Credentials ou `GOOGLE_APPLICATION_CREDENTIALS`. Ne jamais mettre une clé de
   compte de service dans `NEXT_PUBLIC_*`, dans le navigateur ou dans Git.
6. Vérifier puis importer les 38 séances existantes :

   ```bash
   npm run firebase:catalog
   npm run firebase:catalog -- --write
   ```

   L’import ne remplace pas les documents existants. Il active `catalog/config`
   seulement après la réussite de l’import. Les pistes restent où elles sont :
   ce script importe uniquement les métadonnées et références de fichiers.

## Schéma

| Chemin | Données | Écriture |
| --- | --- | --- |
| `users/{uid}` | userId, prénom, création ISO, langue, niveau, onboarding, profil initial, besoin principal et durée préférée | Propriétaire |
| `users/{uid}/preferences/audio` | voix, volumes 0–1, musique/ambiance activées | Propriétaire |
| `users/{uid}/preferences/settings` | reprise, rappels et réglages | Propriétaire |
| `users/{uid}/favorites/{sessionId}` | séance et date d’ajout | Propriétaire |
| `users/{uid}/progress/{sessionId}` | dernière position, durée, dernière écoute, complétion | Propriétaire |
| `users/{uid}/history/{listeningId}` | une entrée par écoute, début/fin, temps réellement écouté, abandon | Propriétaire |
| `users/{uid}/feedback/{listeningId}` | utile/un peu/non, état avant/après facultatif | Propriétaire |
| `users/{uid}/events/{eventId}` | situations, durées choisies, recommandations présentées | Propriétaire |
| `users/{uid}/entitlements/current` | plan, statut, droits, échéance, fournisseur | Backend Admin uniquement |
| `sessions/{sessionId}` | manifeste, published, order, artwork, métadonnées et références audio | Backend Admin uniquement |
| `catalog/config` | enabled, schemaVersion | Backend Admin uniquement |

Les identifiants documentaires sont encodés pour ne pas créer de sous-chemins.

### Compte et premier profil

L’accueil du compte propose Google, une entrée e-mail et Apple désactivé avec
la mention « Bientôt disponible ». L’e-mail dispose d’écrans distincts de connexion,
création de compte et réinitialisation du mot de passe. Le mode invité reste accessible.

Après connexion, un profil sans `profileSetupCompleted: true` ouvre quatre étapes :
prénom facultatif, expérience, besoin principal, durée préférée. Chaque étape validée
est enregistrée ; « Plus tard » permet de reporter le parcours pour la session en cours.
Les réponses sont modifiables depuis le compte. La dernière étape renseigne
`profileSetupCompleted` et `onboardingCompleted`, ce dernier restant aussi utilisé
par l’introduction de l’accueil. Les anciens profils restent acceptés.

`primarySituation` vaut un identifiant de situation connu ou `null` pour découvrir.
`preferredDurationMinutes` vaut 3, 5, 10, 20, ou 0 pour « Selon le moment ».
Ces deux réponses constituent le profil initial ; elles ne modifient pas encore
l’algorithme de recommandations. Déployer les règles Firestore actualisées avant
de publier cette version de l’interface.

Le nombre d’écoutes et les réécoutes se déduisent des entrées d’historique uniques,
sans compteur incrémenté à chaque synchronisation. L’export inclut ces nombres.
Les valeurs `listenedSeconds` mesurent l’avancement normal du lecteur, en excluant
les pauses et les sauts ; les anciens historiques ne disposent pas de cette mesure.
L’interface de feedback n’impose pas de mesure d’état avant/après ; ces champs sont
facultatifs dans le modèle.

### Catalogue et audio

Les documents `sessions` reprennent la structure de `src/generated/sessions.json`
avec `published`, `order`, `artwork`, et éventuellement `assetsBaseUrl` et `rmsUrl`.
Le catalogue local reste disponible tant que `catalog/config.enabled` n’est pas vrai,
ou en cas d’indisponibilité avant le premier chargement distant.
Une fois activé, le catalogue Firestore publié est écouté en temps réel et mis en cache.

Exemple de références audio (les variantes de voix doivent partager la même timeline) :

```json
{
  "audio": {
    "voice": "https://cdn.example.com/session/voice.m4a",
    "voices": {
      "Algenib": "https://cdn.example.com/session/algenib.m4a",
      "Pulcherrima": "https://cdn.example.com/session/pulcherrima.m4a"
    },
    "music": { "file": "https://cdn.example.com/session/music.m4a" },
    "ambience": { "file": "https://cdn.example.com/session/ambience.m4a" },
    "cues": { "file": "https://cdn.example.com/session/cues.m4a" },
    "final": "https://cdn.example.com/session/final.m4a"
  }
}
```

Les URLs HTTPS complètes, chemins absolus de l’application et chemins relatifs au
répertoire de la séance sont acceptés. Les chemins `gs://` doivent être convertis en
URL HTTPS avant publication. Le CDN doit autoriser CORS pour le téléchargement et
les requêtes Range pour la lecture en ligne. Le service worker sert les fichiers
mis en cache, y compris les URLs CDN, avec support Range hors ligne.

Les règles Storage ouvrent uniquement la lecture de `public/sessions/**`.
Aucun téléversement depuis l’app n’est autorisé. Pour le premium, les reçus Apple/Google
et l’accès aux fichiers protégés doivent être validés côté backend : un droit affiché
ou une URL publique ne constitue pas une protection des contenus. Aucun achat n’est
simulé et aucun backend d’achat n’est inclus dans cette intégration.

## Mode invité, migration et synchronisation

- Le mode invité ne crée pas de compte Firebase et conserve les données sur l’appareil.
- À la première connexion sur un appareil, les données invité sont revendiquées par
  ce compte et importées une seule fois. Les documents cloud déjà présents gagnent.
  Cette migration ne copie pas ensuite ces données dans un autre compte.
- Les caches et opérations en attente sont préfixés par `uid`. Chaque opération
  conserve son propriétaire même si une déconnexion intervient pendant un `await`.
- Les changements sont enregistrés localement puis envoyés à Firestore. Les opérations
  non confirmées restent dans une file IndexedDB et reprennent à la reconnexion.
- Un snapshot cloud est combiné avec les modifications locales en attente ; un ancien
  accusé de réception ne supprime pas une modification plus récente.
- Pour un même document modifié sur deux appareils, la dernière écriture confirmée gagne.
  Favoris, progressions et écoutes utilisent des documents distincts.
- Le compte affiche l’état de synchronisation et propose une relance en cas d’erreur.
- `liela_in_progress`, les fichiers téléchargés, les métadonnées de téléchargement,
  les permissions navigateur et les caches d’interface ne sont pas envoyés à Firestore.
  La progression par séance, elle, est synchronisée pour la reprise sur un autre appareil.
- La progression est enregistrée toutes les 15 secondes et à la fermeture normale du
  lecteur. Une fermeture brutale du navigateur peut perdre les dernières secondes.
- La suppression dans Confidentialité vise les données applicatives chargées dans le
  cache du compte et synchronise leurs suppressions. Elle ne supprime pas l’identité
  Firebase Auth, les droits d’achat backend ni les fichiers audio téléchargés.
  L’export reflète le cache courant ; effectuer ces actions une fois la synchronisation
  terminée pour inclure les données des autres appareils.

## Tests

```bash
npm test
npm run typecheck
npm run lint
npm run test:firebase
npm run build
```

`test:firebase` utilise uniquement `demo-liela`, avec les émulateurs Auth et Firestore.
Java 21+ est nécessaire. Les tests vérifient les autorisations, le refus des droits
premium modifiables par le client, la migration sans écrasement, les mises à jour
distantes, la file hors ligne et l’isolation lors d’un changement de compte.

Pour essayer l’interface avec des comptes de test : copier `.env.example` en
`.env.local`, définir `NEXT_PUBLIC_FIREBASE_EMULATORS=true` et
`NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-liela`, puis lancer `npm run firebase:emulators`
et `npm run dev`. Ne jamais activer ces variables pour une compilation de production.

Références officielles : [installation du SDK](https://firebase.google.com/docs/web/setup),
[règles Firestore](https://firebase.google.com/docs/firestore/security/rules-conditions),
[émulateur Firestore](https://firebase.google.com/docs/emulator-suite/connect_firestore).
