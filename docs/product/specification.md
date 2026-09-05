# Prompt Antigravity — application Liela

> À coller dans Antigravity, en **Planning mode**, à la racine du dépôt.
> Joignez `liela-maquette-complete.html` et `liela-charte-graphique.html`.

---

```
Tu construis Liela, une application mobile française de méditation. Deux maquettes
HTML sont jointes : liela-maquette-complete.html pour les écrans, et
liela-charte-graphique.html pour les jetons de design. Elles font autorité sur le
rendu. Ce document fait autorité sur le comportement.

Produis d'abord un implementation plan. Ne code rien avant que je l'aie validé.
Découpe le plan en lots livrables séparément, dans cet ordre :
lot 1 catalogue et lecture, lot 2 favoris, lot 3 historique et profil,
lot 4 recommandation. Le lot 4 doit pouvoir être livré désactivé.

## Étape 0 — reconnaissance

Réponds dans le plan : stack, gestion d'état, persistance locale disponible,
lecteur audio en place, existence d'un backend ou fonctionnement 100 % local.
Adapte tout ce qui suit à l'existant. N'ajoute pas de dépendance si une équivalente
est déjà présente.

═══════════════════════════════════════════════════════════════
1. NAVIGATION
═══════════════════════════════════════════════════════════════

Trois onglets, avec libellés textuels sous les icônes. Pas de quatrième.

- Accueil       : la question, ou la recommandation quand le lot 4 est actif
- Bibliothèque  : segments Situations / Favoris / Téléchargées
- Profil        : statistiques, historique, réglages

La recherche n'existe pas dans cette version. Ne l'implémente pas, ne prévois pas
d'emplacement pour elle. Elle sera ajoutée au-delà de cent séances.

Le segment « Téléchargées » n'est créé que si le hors-ligne est implémenté. S'il ne
l'est pas, il n'y a que deux segments.

═══════════════════════════════════════════════════════════════
2. MODÈLE DE DONNÉES
═══════════════════════════════════════════════════════════════

Situation
  id, slug, libellé, teinte (hex), icône, description courte, ordre d'affichage
  Les six situations sont fixes et versionnées avec l'application :
    calmer-le-stress            #A26248
    trouver-le-sommeil          #5D6A78
    calmer-les-pensees          #6E6257
    retrouver-sa-concentration  #5F6A52
    relacher-les-tensions       #94702B
    se-recentrer                #7A5560

Séance
  id, titre (≤ 36 caractères, contrainte dure), situationId, durée en secondes,
  description, fichier audio, enveloppe RMS, estPorteEntree (booléen),
  dateAjout, ordre

  estPorteEntree marque les séances proposées à un utilisateur sans historique.
  Exactement une par situation, choisie éditorialement, courte de préférence.

Favori
  seanceId, dateAjout, source (fin_de_seance | lecteur | liste)
  La source ne sert qu'à l'analyse interne, jamais à l'affichage.

Écoute
  seanceId, dateDebut, dateFin, positionAtteinte, dureeTotale,
  terminee = positionAtteinte ≥ 0,80 × dureeTotale
  abandonPrecoce = positionAtteinte < 90 secondes

Toutes ces données restent sur l'appareil. Aucune donnée d'usage ne part vers un
serveur dans cette version. C'est une contrainte produit, pas une préférence :
l'utilisateur confie à cette application le fait qu'il dort mal ou qu'il rumine.

═══════════════════════════════════════════════════════════════
3. FAVORIS
═══════════════════════════════════════════════════════════════

### 3.1 Les trois points d'ajout

a) Fin de séance — le principal
   Après une séance terminée, une carte demande « Vous voulez la retrouver ? »
   avec deux actions de poids visuel équivalent : « Ajouter aux favoris » et
   « Non merci ».

   Conditions d'apparition, toutes requises :
   - la séance est terminée (≥ 80 % écoutés)
   - elle n'est pas déjà en favori
   - l'utilisateur n'a pas déjà refusé pour cette séance précise
   - moins de deux demandes déjà faites aujourd'hui

   Un refus est mémorisé définitivement pour cette séance. On ne redemande jamais,
   même des mois plus tard. Redemander est la façon la plus sûre de faire
   désinstaller une application de méditation.

b) Lecteur — le rattrapage
   Cœur à gauche du groupe de commandes, atteignable au pouce. Bascule immédiate,
   sans retour visuel autre que le remplissage du cœur.

c) Listes et fiche — la gestion
   Cœur sur chaque ligne de liste et en haut à droite de la fiche. Un appui ajoute,
   un appui retire. Aucune confirmation : retirer un favori n'est pas dangereux.

### 3.2 Règles transverses

- La bascule est optimiste : l'interface change immédiatement, la persistance suit.
  En cas d'échec d'écriture, on revient à l'état précédent avec un message discret.
- Aucune animation de célébration, aucun compteur, aucun message de félicitation.
  La personne sort d'une méditation. On ne la félicite pas.
- Cœur plein : #A26248. Cœur vide : contour #C6BBA9. Jamais de rouge, réservé aux
  erreurs.
- Le retrait depuis l'onglet Favoris affiche pendant 5 secondes un « Retiré ·
  Annuler ». Le retrait depuis une autre liste n'affiche rien : l'élément reste
  visible, seul le cœur change.
- Tri par défaut de la liste : ajout le plus récent en premier. Un second tri « par
  situation » est disponible. Pas d'autre option.
- Un favori ne se supprime jamais automatiquement, même si la séance disparaît du
  catalogue : dans ce cas elle reste listée, grisée, avec la mention
  « Plus disponible » et une action de retrait.

### 3.3 État vide

L'écran de favoris vide explique comment on le remplit, il ne s'excuse pas :
« Rien ici pour l'instant. À la fin d'une séance, on vous demandera si vous voulez
la retrouver. Celles que vous gardez apparaîtront ici. » Plus un bouton secondaire
vers les situations.

═══════════════════════════════════════════════════════════════
4. RECOMMANDATION — lot 4, derrière un drapeau
═══════════════════════════════════════════════════════════════

Objectif : proposer UNE séance sur l'accueil, et pouvoir dire pourquoi en une ligne.
Tout est calculé sur l'appareil, sans appel réseau, sans modèle appris.

### 4.1 Contrat

- Elle renvoie toujours une séance. Il n'existe aucun cas où l'accueil est vide.
- Elle est déterministe : mêmes entrées, même sortie. Pas d'aléatoire non contrôlé ;
  si un départage est nécessaire, utilise une graine dérivée de la date du jour.
- Elle est recalculée à la mise au premier plan de l'application, puis mise en cache
  30 minutes. La carte ne doit jamais changer pendant que l'utilisateur la regarde.
- Elle est explicable : chaque recommandation porte une raison affichable, produite
  par la règle qui a le plus pesé.

### 4.2 Priorité absolue : la reprise

S'il existe une écoute non terminée de moins de 24 heures, elle est proposée dans le
tiroir « Reprendre » et cette séance est exclue de la recommandation. On ne propose
jamais en grand ce qu'on propose déjà en petit.

### 4.3 Démarrage à froid

Moins de trois écoutes terminées au total : la recommandation ignore le score et
prend la séance porte d'entrée de la situation retenue par la seule règle horaire
ci-dessous. Raison affichée : uniquement l'heure, jamais une préférence supposée.

### 4.4 Fenêtres horaires

Elles ne sont pas des filtres stricts sauf mention contraire.

  05:00–10:00  favorise se-recentrer, retrouver-sa-concentration
  10:00–14:00  favorise retrouver-sa-concentration, calmer-le-stress
  14:00–18:00  favorise calmer-le-stress, relacher-les-tensions
  18:00–21:30  favorise relacher-les-tensions, se-recentrer
  21:30–05:00  favorise trouver-le-sommeil, calmer-les-pensees

Deux règles dures :
- trouver-le-sommeil n'est jamais recommandé entre 07:00 et 18:00.
- retrouver-sa-concentration n'est jamais recommandé entre 22:00 et 05:00.

### 4.5 Score

Pour chaque séance éligible :

  score = 0,40 × affiniteHoraire      (1 si la situation est favorisée à cette heure,
                                       0,5 si voisine, 0 sinon)
        + 0,25 × affiniteSituation    (part de cette situation dans les 10 dernières
                                       écoutes terminées, normalisée 0–1)
        + 0,20 × bonusFavori          (1 si favori, sinon 0)
        + 0,15 × adequationDuree      (1 si la durée est à ±30 % de la durée médiane
                                       des 5 dernières écoutes terminées)
        − penalites

Pénalités, cumulables :
  −1,00  écoutée dans les dernières 48 heures et non favorite
  −0,50  écoutée dans les dernières 48 heures et favorite
  −0,80  déjà recommandée dans les 72 heures et non lancée
  −1,00  abandonnée précocement deux fois ou plus
  −0,60  favorite déjà recommandée dans les 3 derniers jours

Après 21:30, plafonne la durée proposée à 15 minutes. Après 23:30, à 10 minutes.
Quelqu'un qui ouvre l'application à minuit ne veut pas s'engager sur vingt minutes.

Expose les poids, les seuils et les fenêtres horaires dans un unique fichier de
configuration. Je vais les régler.

### 4.6 La ligne de raison

Une seule phrase, choisie selon la règle qui a le plus pesé, dans cet ordre :

  favori            « Parce que vous avez aimé « {titre} ». »
  affiniteSituation « Vous revenez souvent à {situation}. »
  affiniteHoraire   « Il est {heure}. »

Interdits absolus dans la raison :
- toute formulation qui décrit un état mental déduit
  (« vous semblez stressé », « vous dormez mal en ce moment »)
- toute mention d'une série, d'un manque ou d'un abandon
  (« cela fait 4 jours », « vous n'êtes pas venu depuis… »)
- toute comparaison à d'autres utilisateurs

La raison doit se lire comme une observation banale, pas comme une déduction sur la
personne. C'est la différence entre une application utile et une application qui
met mal à l'aise.

### 4.7 Repli

Si aucune séance ne passe les règles dures, retire les pénalités une par une dans
l'ordre inverse de leur poids jusqu'à obtenir un candidat. En dernier recours, prends
la porte d'entrée de la situation favorisée par l'heure. Jamais d'écran vide.

═══════════════════════════════════════════════════════════════
5. ÉCRANS
═══════════════════════════════════════════════════════════════

Réfère-toi à la maquette pour le rendu. Comportements notables :

Accueil (question)     Les six situations en bandes pleine largeur. Le tiroir bas
                       n'apparaît que s'il existe une écoute non terminée de moins
                       de 24 h.
Accueil (recommandation) Variante du lot 4, derrière le drapeau. « Autre chose ? »
                       ouvre la liste des six situations.
Situation              Description courte en tête, filtre de durée, liste des
                       séances avec cœur sur chaque ligne.
Situation sommeil      Seul écran en fond sombre, avec minuteur d'arrêt. Ce n'est
                       pas un thème sombre global : aucun autre écran ne s'inverse.
Choix de durée         Toujours après la situation, jamais avant. « Je ne sais pas »
                       retient la durée médiane des écoutes terminées, ou 8 minutes
                       sans historique.
Fiche séance           Cœur et téléchargement en haut à droite. Affiche « Déjà
                       écoutée N fois » et rien d'autre en guise d'évaluation :
                       pas de note, pas de compteur public.
Lecteur                Galet animé, cœur à gauche des commandes, reculer et avancer
                       de 15 secondes. Voir le prompt dédié au galet pour les
                       constantes.
Fin de séance          Carte des favoris selon 3.1, puis une seule proposition
                       d'enchaînement. Jamais plus d'une.
Profil                 Statistiques, historique avec cœur actionnable, réglages.
                       Le rappel quotidien existe mais est désactivé par défaut.

═══════════════════════════════════════════════════════════════
6. CE QU'IL NE FAUT PAS FAIRE
═══════════════════════════════════════════════════════════════

- Pas de série ni de compteur de jours consécutifs mis en avant. Une méditation
  ratée ne doit pas produire de culpabilité.
- Pas de notification autre que le rappel explicitement activé par l'utilisateur.
- Pas de badge sur l'icône de l'application.
- Pas de note, d'étoiles, de compteur de likes, de classement.
- Pas d'écran de félicitations, de confettis, de haptique de célébration.
- Pas de demande d'avis sur le store avant la dixième séance terminée.
- Pas de collecte analytique dans cette version.
- Pas de recherche.

═══════════════════════════════════════════════════════════════
7. TRANSVERSE
═══════════════════════════════════════════════════════════════

Accessibilité   Contrastes de la charte respectés : le sauge #919780 et la terre
                #D09B83 ne portent jamais de texte ni d'élément tactile ; leurs
                versions profondes #5F6A52 et #A26248 le peuvent. Cibles tactiles
                de 44 points minimum. Libellés d'accessibilité sur tous les cœurs,
                indiquant l'action et non l'état (« Ajouter aux favoris »).
                prefers-reduced-motion respecté partout.
États           Chaque liste a un état vide rédigé, jamais un espace blanc.
                Hors ligne : les séances non téléchargées sont grisées avec la
                mention « Nécessite une connexion », pas masquées.
Erreurs         Échec de lecture : message court, action « Réessayer », retour à la
                fiche. Jamais de code d'erreur affiché.
Performance     Démarrage à froid sous 2 secondes jusqu'à l'accueil interactif.
                Le calcul de recommandation ne doit pas bloquer le premier rendu :
                affiche la carte dès qu'elle est prête, avec un squelette en sable
                si l'attente dépasse 400 ms.

═══════════════════════════════════════════════════════════════
8. VÉRIFICATION ATTENDUE
═══════════════════════════════════════════════════════════════

Dans le walkthrough :
1. Une capture de chacun des douze écrans de la maquette.
2. Des tests unitaires sur le moteur de recommandation couvrant : démarrage à
   froid, les cinq fenêtres horaires, les deux règles dures, chaque pénalité, le
   plafonnement de durée nocturne, et le repli quand tout est pénalisé.
3. Un test qui vérifie qu'aucune séance du catalogue n'a un titre de plus de
   36 caractères.
4. Un test qui vérifie qu'un refus de mise en favori à la fin d'une séance n'est
   jamais suivi d'une nouvelle demande pour la même séance.
5. La démonstration que la carte de recommandation ne change pas pendant 30 minutes
   à données constantes.
6. La confirmation qu'aucune requête réseau ne part avec des données d'usage.

Si un test est impossible dans l'environnement, dis-le au lieu de l'inventer.
```

---

## Ce sur quoi je vous conseille d'être ferme

**Le lot 4 doit être livrable désactivé.** Une recommandation médiocre est pire que pas de recommandation : elle apprend à l'utilisateur que l'application ne le comprend pas, et il arrête de regarder la carte. Livrez les lots 1 à 3, collectez des écoutes, activez le drapeau quand les règles tiennent.

**La section 4.6 sur la ligne de raison est la plus importante du document.** C'est le seul endroit où l'application parle de l'utilisateur à l'utilisateur. « Il est 21 h 40 » est une observation. « Vous semblez avoir du mal à dormir en ce moment » est une déduction sur son état mental, et c'est le genre de phrase qui fait désinstaller. La différence est mince à l'écriture et énorme à la lecture.

**Les pénalités valent plus que les bonus.** L'erreur classique d'un moteur de recommandation simple est de reproposer sans cesse les mêmes trois séances favorites. Les pénalités de répétition sont là pour ça et ne doivent pas être affaiblies si l'agent trouve que « ça ne recommande pas assez les favoris ».
