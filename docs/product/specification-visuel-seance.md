# Prompt Antigravity — visuel de séance « Le galet »

> À coller dans Antigravity, en **Planning mode**, à la racine du dépôt Liela.
> Joignez aussi le fichier `liela-visuel-seance.html` et indiquez la proposition **A**.

---

## Le prompt

```
Tu travailles sur Liela, une application mobile française de méditation. Je veux
intégrer le visuel animé qui occupe le centre de l'écran de lecture d'une séance :
une forme organique en aplat crème sur fond de teinte, qui respire.

Commence par produire un implementation plan. Ne code rien avant que je l'aie validé.

## Étape 0 — reconnaissance

Inspecte le dépôt et réponds dans le plan :
- Quelle est la stack, et quelle technique de rendu animé est déjà disponible
  (Flutter CustomPainter, react-native-skia, Reanimated, SwiftUI Canvas, Jetpack
  Compose Canvas, autre) ? Choisis celle qui est déjà là plutôt que d'ajouter une
  dépendance.
- Où est l'écran de lecture, et comment la teinte de la situation en cours lui
  est-elle transmise ?
- Comment la lecture audio expose-t-elle sa position, son état et, si elle le fait,
  son niveau sonore ?

## Le rendu à reproduire

Forme radiale fermée, dessinée en coordonnées polaires, remplie en crème translucide
sur le fond de teinte de la situation. Deux couches superposées, aucun contour,
aucun dégradé.

Constantes, en unités relatives à la plus petite dimension du conteneur, notée S :

- rayon de base    R = S × 0,30 × (0,80 + 0,30 × souffle)
- couche 1         rayon R,        opacité 0,20, déphasage 0
- couche 2         rayon R × 1,16, opacité 0,10, déphasage 1,7 rad
- 120 segments par contour
- écrasement vertical : y multiplié par 0,94, ce qui donne l'asymétrie voulue

Déformation du rayon, pour un angle θ, un temps t en millisecondes, un déphasage ph
et un niveau audio lissé a compris entre 0 et 1 :

  d = 1
    + 0,10 × sin(3θ + t/2600 + ph)
    + 0,06 × sin(2θ − t/3900 + ph)
    + a × 0,09 × sin(5θ + t/900 + ph)

  x = cx + cos(θ) × R × d
  y = cy + sin(θ) × R × d × 0,94

## Le moteur de respiration

Cycle de 11 000 ms : inspiration 4 000, palier 1 000, expiration 6 000.
La valeur « souffle » va de 0 à 1 avec une interpolation ease-in-out quadratique :

  easeIO(x) = x < 0,5 ? 2x² : 1 − (−2x + 2)² / 2

  p = t modulo 11000
  p < 4000  → souffle = easeIO(p / 4000)
  p < 5000  → souffle = 1
  sinon     → souffle = 1 − easeIO((p − 5000) / 6000)

Le cycle respiratoire porte l'essentiel du mouvement. Le niveau audio ne module que
l'amplitude, jamais la vitesse.

## Le niveau audio

Le lissage doit être indépendant de la fréquence d'images. N'utilise pas un
coefficient fixe par image :

  alpha = 1 − exp(−dt / 400)     avec dt en millisecondes
  a = a + (cible − a) × alpha

Trois sources possibles, par ordre de préférence :

1. Enveloppe précalculée. Génère à la construction, pour chaque fichier audio, un
   tableau de valeurs RMS échantillonnées à 20 Hz, normalisées entre 0 et 1, stocké
   en JSON à côté du fichier. À la lecture, on lit la valeur à la position courante.
   C'est la solution que je préfère : aucune permission, coût processeur nul,
   comportement identique sur les deux plateformes.
2. Niveau fourni nativement par le lecteur, s'il en expose un.
3. Aucune source : a reste constant à 0,35 et la forme respire seule.

N'utilise PAS l'API Visualizer d'Android : elle exige la permission RECORD_AUDIO, ce
qui est injustifiable pour une application de méditation et expose la fiche à un
refus sur le store. Ne mets pas non plus en place un tap AVAudioEngine sur iOS pour
cet usage.

## Comportement

- La forme respire en continu, y compris pendant les silences, au démarrage et en
  pause. Une forme immobile fait croire à un plantage.
- Fond : teinte pleine de la situation en cours. Forme : crème #FDF9F0 en alpha.
- Aucune autre animation simultanée à l'écran.

## Performance

Une séance dure jusqu'à trente minutes, donc la consommation compte plus que la
fluidité :
- plafonne le rendu à 30 images par seconde, indiscernable à cette lenteur ;
- suspends la boucle quand l'application passe en arrière-plan ou que l'écran
  s'éteint, et reprends au cycle courant sans saut ;
- pas d'ombre portée, pas de flou, pas de dégradé animé ;
- ne recrée pas les objets de dessin à chaque image.

## Accessibilité

Avec la préférence système de réduction des animations, la forme se fige à
souffle = 0,5 et seule son opacité varie entre 0,16 et 0,22 sur un cycle de
11 secondes. Aucune information n'est portée par le mouvement seul.

## Paramétrage

Expose les constantes dans un objet de configuration unique, pas en dur dans la
boucle de dessin : durées du cycle, rayon de base, amplitudes des trois harmoniques,
poids du niveau audio, opacités des deux couches. Je vais vouloir les régler.

## Vérification attendue

Dans le walkthrough :
1. Un enregistrement de 15 secondes de l'écran de lecture montrant un cycle complet.
2. Une capture dans chacune des six teintes de situation.
3. Une mesure : images par seconde et occupation processeur sur deux minutes de
   lecture, appareil ou simulateur.
4. La confirmation que la boucle s'arrête en arrière-plan, preuve à l'appui.
5. Une capture avec la réduction d'animations activée.

Si une mesure est impossible dans l'environnement, dis-le au lieu de l'inventer.

## Référence

Le rendu cible est implémenté en canvas dans la maquette HTML jointe, proposition
« A — Le galet ». Sers-t'en comme référence de comportement, pas comme code à
copier : elle est en JavaScript et pensée pour une page web.
```

---

## Deux points à surveiller

**L'enveloppe précalculée est le vrai choix d'architecture du prompt.** Si l'agent propose de lire le niveau audio en direct, refusez : sur Android ça passe par l'API Visualizer, qui exige la permission microphone. Demander le micro dans une application de méditation est un problème de confiance autant qu'un risque de refus sur le store.

**J'ai corrigé une erreur de ma propre maquette dans le prompt.** Le lissage du niveau audio y est fait avec un coefficient fixe par image, ce qui rend le comportement dépendant de la fréquence de rafraîchissement. La formule donnée à l'agent utilise une constante de temps de 400 ms, indépendante du nombre d'images par seconde. Ne laissez pas l'agent recopier la version de la maquette.
