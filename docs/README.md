# docs/ — référence de conception Liela

Ce dossier fait autorité sur l'apparence et le comportement de l'application.
En cas de contradiction entre le code existant et ces documents, ce sont ces
documents qui ont raison.

## Ordre de priorité

1. `brand/liela-tokens.json` — toute valeur de couleur, rayon, espacement,
   typographie, élévation, mouvement. **Ne pas relire le CSS des maquettes pour
   récupérer une valeur : elle est ici.**
2. `product/specification.md` — le comportement de l'application.
3. `product/liela-maquette-complete.html` — le rendu des écrans.
4. `brand/liela-charte-graphique.html` — le raisonnement derrière les règles,
   utile quand un cas n'est pas couvert ailleurs.

## Contenu

```
docs/
├── brand/
│   ├── liela-charte-graphique.html      Charte complète, 14 sections
│   ├── liela-tokens.json                Jetons de design — source de vérité
│   ├── liela-tokens.css                 Mêmes jetons en variables CSS (généré)
│   └── reference/
│       ├── liela-logo-horizontal.svg    Logo principal, contours vectoriels
│       ├── liela-logo-horizontal-{encre,creme}.svg
│       ├── liela-symbole-{couleur,encre,creme}.svg
│       ├── liela-symbole-petitestailles.svg   ≤ 20 px, réserve doublée
│       ├── liela-icone-app{,-sombre}.svg      Icône d'application
│       ├── liela-avatar-youtube.svg
│       ├── liela-logo-horizontal{,-encre}.pdf Impression
│       ├── png/                               Exports 16 → 2400 px
│       └── notification/
│           ├── artwork-<situation>.png        1024 × 1024, une par situation
│           └── liela-icone-notification*.{svg,png}  Barre d'état Android
└── product/
    ├── liela-maquette-complete.html            12 écrans
    ├── liela-visuel-seance.html                Visuel animé du lecteur
    ├── liela-lecteur-notification.html         Notification et écran verrouillé
    ├── specification.md                        Comportement de l'application
    ├── specification-visuel-seance.md          Constantes du galet animé
    └── specification-lecteur-notification.md   Métadonnées et artworks
```

## Comment lire les maquettes

Les fichiers `.html` de `product/` sont des **pages de documentation**, pas
l'application. Ce qui suit relève de la présentation et ne doit jamais être
reproduit dans l'app :

- le cadre de téléphone (`.tel`, rayon 32 px, ombre portée) ;
- la grille de cartes, les légendes sous chaque écran, les sections numérotées ;
- l'en-tête et le pied de page du document ;
- le chargement des polices par `<link>` vers Google Fonts.

Seul le contenu **à l'intérieur** du cadre de téléphone est l'interface.

## Polices

Poppins et Hanken Grotesk sont libres et disponibles sur Google Fonts. Elles
doivent être **embarquées dans le binaire de l'application**, jamais téléchargées
au démarrage : une application de méditation doit fonctionner hors ligne et ne
doit pas afficher un rendu différent selon la connexion.

## Les six situations

Fixes, versionnées avec l'application. Slugs, libellés, teintes et sous-titres
sont dans `brand/liela-tokens.json` sous `color.situation`.

## Deux règles à ne jamais contourner

**Le sauge `#919780` et la terre `#D09B83` ne portent jamais de texte ni
d'élément tactile.** Leurs contrastes sont de 3,0 et 2,4 pour 1 sur blanc. Dès
qu'il faut lire ou toucher, utiliser `saugeProfond` `#5F6A52` et `terreProfond`
`#A26248`.

**Aucune donnée d'usage ne quitte l'appareil** dans cette version. Historique,
favoris et calcul de recommandation restent en local.
