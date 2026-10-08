# Poste de veille & capitalisation de la connaissance

Application React de veille informationnelle (fiche de renseignement, cotation OTAN A-F / 1-6).

## Fichiers

- **App.jsx** — code source React de l'application (composant principal + base de données initiale embarquée).
- **index.html** — version autonome : un seul fichier à ouvrir dans un navigateur (React chargé via CDN, connexion internet requise au lancement). Fonctionne sur Mac, iPhone et iPad.

## Utilisation

### Version autonome (recommandée pour usage local)
1. Télécharger `index.html`.
2. L'ouvrir dans Safari (double-clic sur Mac) — l'application se lance directement.
3. Les données sont enregistrées automatiquement dans le stockage local du navigateur (par appareil).

### Version React (développement)
`App.jsx` est un composant React autonome : importer dans un projet React et rendre le composant par défaut.

## Données

- Onglet « Données » : export JSON (base complète) et import JSON.
- Les données sont stockées dans le navigateur (localStorage), par appareil et par navigateur : pas de synchronisation automatique entre iPhone/iPad/Mac.
- Pour transférer la base entre appareils : Export JSON, puis Import sur l'autre appareil.

## Cotation OTAN

- Fiabilité de la source : A (totalement fiable) à F (ne peut être jugée).
- Crédibilité de l'information : 1 (confirmée) à 6 (ne peut être jugée).

---
Données initiales issues d'un recoupement du 3 octobre 2026 (veille « Actualité africaine » : presse panafricaine et internationale).
