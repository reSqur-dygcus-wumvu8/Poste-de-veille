# Poste de veille & capitalisation de la connaissance

Application React de veille informationnelle (fiche de renseignement, cotation OTAN A-F / 1-6).

## Fichiers

- **App.jsx** — code source React complet : veilles, rapports, entités, schéma relationnel, frise, cartes multiples (Plan / Satellite / En ligne), détection et fusion des doublons, zoom tactile.
- **index.html** — version autonome pour navigateur (React via CDN, Babel figé sur 7.29.10), avec panneau de diagnostic au démarrage.
- **base.json** — base de référence : l'application la consulte automatiquement à chaque ouverture et propose de la charger si elle est plus récente que les données locales.

## Chargement automatique de la base (dépôt GitHub)

- À l'ouverture, l'application interroge `base.json` du dépôt (adresse codée en dur dans le code).
- Si la version en ligne est plus récente que les données locales, une bannière propose « Charger la base de référence ».
- L'application reste pleinement fonctionnelle hors ligne (stockage local du navigateur).
- Pour publier une nouvelle base de référence : Export JSON (onglet « Données ») puis dépôt du fichier en remplacement de `base.json` (glisser-déposer sur github.com).

## Utilisation

- **iPhone/iPad/Mac** : https://resqur-dygcus-wumvu8.github.io/Poste-de-veille/ — Safari → « Sur l'écran d'accueil » pour l'icône d'application.
- Les données restent dans le stockage local de chaque appareil ; la base de référence GitHub les synchronise à l'ouverture.

## Cotation OTAN

- Fiabilité de la source : A (totalement fiable) à F (ne peut être jugée).
- Crédibilité de l'information : 1 (confirmée) à 6 (ne peut être jugée).

---
Données initiales recoupées le 3 octobre 2026 (veille « Actualité africaine ») ; base de référence du 8 octobre 2026.
