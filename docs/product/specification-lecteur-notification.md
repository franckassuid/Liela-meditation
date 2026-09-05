# Prompt Antigravity — lecteur en notification et écran verrouillé

> À coller dans Antigravity, en **Planning mode**, à la racine du dépôt Liela.
> Déposez d'abord les fichiers du dossier `liela-notification/` quelque part dans le projet (par exemple `design/liela-notification/`) : le prompt y fait référence.

---

## Le prompt

```
Tu travailles sur Liela, une application mobile française de méditation. Les séances
sont des fichiers audio joués en arrière-plan. Le lecteur qui apparaît dans la barre
de notifications Android et sur l'écran verrouillé iOS est aujourd'hui laid : artwork
absent ou générique, icône de barre d'état illisible, métadonnées incomplètes.

Objectif : le rendre conforme à la charte graphique de la marque.

Commence par produire un implementation plan. Ne code rien avant que je l'aie validé.

## Étape 0 — reconnaissance

Avant de planifier, inspecte le dépôt et réponds dans le plan aux questions suivantes :
- Quelle est la stack (Flutter, React Native, natif Kotlin/Swift, autre) ?
- Quelle bibliothèque de lecture audio en arrière-plan est déjà en place
  (audio_service, just_audio_background, react-native-track-player, ExoPlayer/Media3,
  AVPlayer nu, autre) ? Si aucune, propose-en une et justifie.
- Où est défini le modèle d'une séance, et existe-t-il déjà un champ « situation » ?
- Où sont stockés les assets images ?

Adapte tout ce qui suit à la stack réellement trouvée. N'invente pas de fichiers.

## Contexte métier

Une séance appartient à exactement une des six situations suivantes. La correspondance
situation → teinte → artwork est fixe et ne doit jamais être calculée dynamiquement :

| Situation                   | Slug                         | Teinte    |
|-----------------------------|------------------------------|-----------|
| Calmer le stress            | calmer-le-stress             | #A26248   |
| Trouver le sommeil          | trouver-le-sommeil           | #5D6A78   |
| Calmer les pensées          | calmer-les-pensees           | #6E6257   |
| Retrouver sa concentration  | retrouver-sa-concentration   | #5F6A52   |
| Relâcher les tensions       | relacher-les-tensions        | #94702B   |
| Se recentrer                | se-recentrer                 | #7A5560   |

Les assets sont fournis dans design/liela-notification/ :
- artwork-<slug>.png — 1024 × 1024, opaque, une par situation
- liela-icone-notification.svg et -24/48/72/96/192.png — silhouette monochrome

## Ce qu'il faut implémenter

### 1. Métadonnées communes aux deux plateformes

- title  = nom de la séance, tel quel
- artist = "Liela · " + libellé de la situation, ex. "Liela · Calmer les pensées"
- album  = "Liela"
- artwork = artwork-<slug>.png de la situation de la séance, chargée en bitmap local,
  jamais depuis le réseau, jamais redimensionnée en dessous de 512 px
- durée totale et position courante renseignées et tenues à jour, sinon la barre de
  progression du système reste vide

Ajoute une validation au build ou un test : tout titre de séance dépassant 36
caractères doit faire échouer la validation, avec un message explicite. Android
tronque au-delà en vue compacte.

### 2. Android

- Notification MediaStyle standard (NotificationCompat.MediaStyle avec Media3 /
  MediaSessionService). N'utilise PAS de RemoteViews ni de layout personnalisé :
  Android 13+ les ignore pour les notifications média.
- setSmallIcon() reçoit la silhouette monochrome fournie, convertie en vector drawable.
  N'utilise pas le logo couleur : le système l'aplatit en blanc et les deux formes
  fusionnent.
- setColor() reçoit la teinte de la situation en cours, avec setColorized(true).
  N'utilise jamais le vert du logo (#919780), trop clair sur fond sombre.
- Trois actions en vue compacte, dans cet ordre : reculer de 15 s, lecture/pause,
  avancer de 15 s. Supprime « piste précédente » et « piste suivante », qui n'ont
  aucun sens pour une méditation.
- Canal de notification dédié, importance LOW, sans son, sans vibration, sans badge.
- Notification non balayable pendant la lecture, effaçable en pause.

### 3. iOS

- MPNowPlayingInfoCenter alimenté avec les métadonnées ci-dessus, y compris
  MPMediaItemPropertyArtwork via MPMediaItemArtwork, MPMediaItemPropertyPlaybackDuration,
  MPNowPlayingInfoPropertyElapsedPlaybackTime et MPNowPlayingInfoPropertyPlaybackRate.
  Mets à jour elapsedTime et playbackRate à chaque changement d'état, sinon le
  scrubber de l'écran verrouillé dérive.
- MPRemoteCommandCenter : activer playCommand, pauseCommand, togglePlayPause,
  skipBackwardCommand et skipForwardCommand avec preferredIntervals = [15].
  Désactiver explicitement nextTrackCommand et previousTrackCommand.
- AVAudioSession en catégorie .playback, activée au démarrage de la lecture.
  Vérifie que la capability Background Modes → Audio est bien cochée dans le projet.

## Interdits

- Aucune mise en page personnalisée du lecteur : le cadre, la police et les boutons
  appartiennent au système.
- Aucun texte incrusté dans les artworks.
- Aucun artwork généré à la volée ou téléchargé.
- Aucun son ni vibration à l'affichage de la notification.

## Vérification attendue

Dans le walkthrough, fournis :
1. Une capture de la notification déployée sur Android 13 ou plus, montrant que le
   fond prend bien la teinte extraite de l'artwork.
2. Une capture de la vue compacte, montrant les trois actions et l'icône de barre d'état.
3. Une capture de l'écran verrouillé iOS et une du centre de contrôle.
4. Un zoom sur l'icône de barre d'état à sa taille réelle, pour confirmer que la
   feuille reste détachée du trait.
5. La liste des séances dont le titre dépasse 36 caractères, s'il y en a.

Si une capture est impossible dans l'environnement, dis-le explicitement au lieu de
la simuler, et indique la commande à lancer pour que je la prenne moi-même.
```

---

## Trois remarques avant de l'envoyer

**Le point le plus important du prompt est l'artwork**, pas le code. Depuis Android 12, le système extrait les couleurs dominantes de l'image pour teinter le bloc entier. Si l'agent décide de générer un artwork à la volée ou de réutiliser l'icône de l'app, le résultat restera laid quelle que soit la qualité du code. D'où l'interdit explicite.

**Ne validez pas l'implementation plan sans lire l'étape 0.** Si l'agent se trompe de bibliothèque audio, tout le reste part de travers, et c'est le genre d'erreur qui coûte plus cher à défaire qu'à éviter.

**La règle des 36 caractères va probablement échouer sur des séances existantes.** C'est voulu : c'est une contrainte d'écriture, pas un bug. Décidez si vous renommez ou si vous relevez le seuil avant de lancer l'agent.
