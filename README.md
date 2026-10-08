# Poste de veille & capitalisation de la connaissance

Application React de veille informationnelle (fiche de renseignement, cotation OTAN A-F / 1-6).

## Fichiers

- **App.jsx** — code source React de l'application.
- **index.html** — version autonome à ouvrir dans un navigateur (React via CDN, internet requis au lancement).
- **base.json** — base de données de référence : chargée automatiquement par l'application au démarrage si elle est plus récente que la base locale.

## Fonctionnalités

- Veilles, sources, rapports, entités, liens, cotation OTAN (fiabilité A-F, crédibilité 1-6).
- **Carte multi-modes** : tuiles OpenStreetMap (Plan) et imagerie Esri (Satellite), projection Mercator, glisser au doigt/souris, zoom molette et pincement à deux doigts.
- **Mise à jour des veilles** : bouton « 🔄 Actualiser » par veille — interroge les flux RSS/Atom des sources (via relais CORS) et crée des rapports provisoires à valider dans l'onglet « Saisie d'information » (Valider / Rejeter).
- **Base de référence GitHub** : au démarrage, l'application charge `base.json` depuis ce dépôt s'il est plus récent que la base locale (comparaison des horodatages `majLe`). Bouton « ☁︎ Charger la base distante » pour un chargement forcé (onglet « Données »).

## Cycle de vie des données

1. Les saisies sont enregistrées dans le stockage local du navigateur (par appareil).
2. Pour publier une base mise à jour : onglet « Données » → Export JSON → remplacer `base.json` du dépôt (ou demander à l'agent de le pousser).
3. Tous les appareils récupèrent automatiquement la base de référence au prochain lancement.

## Utilisation

### GitHub Pages (recommandée iPhone/iPad)
https://resqur-dygcus-wumvu8.github.io/Poste-de-veille/ — puis Partager → « Sur l'écran d'accueil ».

### Fichier local
Télécharger `index.html` et l'ouvrir dans Safari (Mac) ou l'app Documents (iPhone/iPad).

## Cotation OTAN

- Fiabilité de la source : A (totalement fiable) à F (ne peut être jugée).
- Crédibilité de l'information : 1 (confirmée) à 6 (ne peut être jugée).

---
Données initiales issues d'un recoupement du 3 octobre 2026 (veille « Actualité africaine » : presse panafricaine et internationale).
