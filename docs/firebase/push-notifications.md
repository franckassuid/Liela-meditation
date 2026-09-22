# Rappels push : Firebase Spark + Cloudflare Workers Free

## État et activation

Le code est livré désactivé : `NEXT_PUBLIC_PUSH_ENABLED=false` côté application et
`REMINDERS_ENABLED=false` côté Worker. Un secret enregistré ne suffit pas à envoyer
les notifications. Ne déclarer la fonctionnalité opérationnelle qu'après un test réel
sur l'application de production fermée, avec les métriques Cloudflare vérifiées.

Projet Firebase : `liela-9426c`. Worker : `liela-reminders`.
Le seul secret serveur est `FIREBASE_SERVICE_ACCOUNT`, contenant le JSON complet
créé pour `liela-reminders@liela-9426c.iam.gserviceaccount.com`.
Ce JSON reste dans Cloudflare > Worker > Settings > Variables and Secrets, type Secret.
Ne jamais le mettre dans Git, les variables NEXT_PUBLIC, un message ou les logs.
Le compte reçoit `roles/datastore.user` et `roles/firebasecloudmessaging.admin`.
Le premier rôle donne accès aux données Firestore du projet, pas seulement aux rappels.

## Déploiement depuis le tableau de bord

1. Vérifier Firebase > Paramètres du projet > Cloud Messaging : l'API Firebase Cloud
   Messaging (V1) est activée et la clé Web Push publique correspond à
   `NEXT_PUBLIC_FIREBASE_VAPID_KEY` dans `.env.example`.
2. Tester puis publier les règles :
   `npm run test:firebase`, puis
   `npx firebase deploy --only firestore:rules --project liela-9426c`.
3. Exécuter `npm run build:reminders`. Ouvrir `workers/reminders/dist/worker.js`.
   Cloudflare > Workers & Pages > liela-reminders > Edit code : remplacer le code
   Hello World par **tout** le contenu de ce fichier, puis Deploy. Ce bundle ne contient
   aucun secret. Le Worker répond volontairement HTTP 404 aux visites publiques.
4. Dans Settings > Variables and Secrets, conserver `FIREBASE_SERVICE_ACCOUNT`.
   Ajouter une variable **Text** `REMINDERS_ENABLED` avec la valeur `true`, puis Deploy.
5. Settings > Trigger Events > Add > Cron Trigger : choisir toutes les minutes,
   soit `* * * * *`. Une modification des triggers peut prendre jusqu'à 15 minutes.
   Le cron fonctionne en UTC ; le Worker convertit les préférences selon le fuseau
   IANA enregistré par l'appareil, par exemple `Europe/Paris`.
6. Dans l'hébergeur de l'application, définir `NEXT_PUBLIC_PUSH_ENABLED=true`, puis
   reconstruire et redéployer l'application (les variables publiques sont figées au build).
   `npm run build` produit aussi le script navigateur `public/push-worker.js`.
7. Garder Cloudflare sur **Workers Free** et Firebase sur **Spark**.
   Aucun service Cloud Functions, Durable Objects, KV ou stockage Cloudflare n'est requis.

Alternative CLI : depuis la racine, après authentification Wrangler,
`npx wrangler deploy --config workers/reminders/wrangler.jsonc`.
Le fichier remet `REMINDERS_ENABLED=false` : adapter explicitement cette valeur après
validation. Ne pas remplacer le secret existant. Les fichiers `.dev.vars*` sont ignorés.

## Fonctionnement et consommation

- Une requête indexée par minute sur `reminderSchedules`, filtrée sur `nextAt <= maintenant`.
  Pas de balayage de tous les profils. Une requête vide coûte au minimum une lecture
  Firestore : **1 440 lectures par jour** pour le cron seul.
- Au maximum **3 utilisateurs par minute**, et les **3 appareils les plus récemment
  enregistrés** par utilisateur. Une exécution demande au maximum 26 requêtes sortantes
  (OAuth compris, avec nettoyage des appareils invalides), sous la limite Free de 50.
- Avec un appareil, un rappel normal représente environ 2 lectures de documents et
  1 écriture de planning, hors minimum des requêtes vides et opérations de l'application.
- Au démarrage/reprise de l'app, inscription FCM ; écriture du document appareil au plus
  une fois par 24 h, sauf changement de compte/identifiant. Les réglages explicites sont
  enregistrés atomiquement avec le planning serveur ; leur cache local/outbox reste actif.
- Les quotas Spark concernent l'ensemble de l'app, pas uniquement ce Worker. Ces limites
  de lot ne garantissent pas que toute l'application restera sous les quotas.
- Si beaucoup de personnes choisissent la même minute, les envois attendent leur tour.
  Les rappels en retard de plus de 15 minutes sont ignorés, et non envoyés plusieurs
  heures plus tard. Ce petit lot convient au lancement, pas à un volume élevé au même horaire.
- Un appareil inactif depuis plus de 30 jours est retiré au passage du Worker.
  Il est réinscrit à la prochaine ouverture de l'app connectée avec permission accordée.

## Doublons, déconnexion et erreurs

Le Worker avance le planning et marque la date locale **avant** l'appel FCM, avec
une précondition sur la version du document. Deux exécutions concurrentes ou une
modification de réglage ne peuvent pas obtenir la même version. Le navigateur déduplique
également par utilisateur/date. Désactiver conserve la dernière date d'envoi.

Compromis explicite : un arrêt après la réservation ou une erreur FCM peut faire manquer
ce rappel. Aucune répétition automatique après une réponse ambiguë ; le prochain jour
reste planifié. Les appareils ne sont supprimés après erreur FCM que pour UNREGISTERED.
Les erreurs 401/403/429 interrompent le lot. Les logs contiennent seulement des compteurs.

Les invités ne peuvent pas s'inscrire. Le service worker ne montre un message que si
son destinataire correspond au propriétaire local actif. La déconnexion retire l'appareil
courant, sans désactiver les rappels sur les autres appareils ; cette opération demande
une connexion réseau. Le clic ouvre l'accueil avec `from=reminder` pour recalculer la suggestion.
Un envoi déjà engagé pendant une désactivation peut encore parvenir à un autre appareil.

## Test de bout en bout à effectuer en production

1. Ouvrir la nouvelle version de Liela, connecté. Sur iPhone/iPad, utiliser la PWA ajoutée
   à l'écran d'accueil (iOS/iPadOS 16.4 minimum) et accorder les notifications.
2. Activer les rappels, sélectionner le jour courant et une heure **3 minutes dans le futur**.
3. Dans Firestore, vérifier `users/{uid}/preferences/settings`, `reminderSchedules/{uid}`
   (`time`, `days`, `timeZone`, `nextAt`) et `users/{uid}/pushDevices/{fid}`.
4. Fermer l'application puis verrouiller le téléphone. Attendre le créneau et vérifier
   une seule notification. Le bouton « Tester l'affichage » est local et ne valide pas ce test.
5. Ouvrir « Commencer ma séance » : accueil et suggestion adaptée. Vérifier dans
   Cloudflare Observability un compteur `sent: 1`, aucune erreur et un CPU sous les
   **10 ms** du plan gratuit, y compris les démarrages à froid. Les tests Node ne prouvent
   pas ce budget CPU : réduire le lot/revoir l'auth si la limite est dépassée, sans passer
   automatiquement au plan payant.
6. Changer l'heure, contrôler le nouveau `nextAt`, puis désactiver : `nextAt` doit disparaître.
   Pour un deuxième vrai test le même jour, utiliser un compte de test distinct : la garde
   quotidienne interdit un second rappel pour le même utilisateur.
7. Se déconnecter et vérifier que le document de cet appareil est retiré. Tester aussi
   un deuxième compte sur le même appareil et confirmer qu'aucun message du premier n'apparaît.

Sources : [FCM Web](https://firebase.google.com/docs/cloud-messaging/web/get-started),
[envoi REST FCM](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages),
[limites Workers](https://developers.cloudflare.com/workers/platform/limits/),
[Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/),
[tarification Firestore](https://firebase.google.com/docs/firestore/pricing).
