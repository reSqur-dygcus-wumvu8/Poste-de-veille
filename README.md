# Poste de veille & capitalisation de la connaissance

Application React de veille informationnelle (fiche de renseignement, cotation OTAN A-F / 1-6).

## Fichiers

- **App.jsx** — code source React de l'application (version optimisée : sauvegarde différée, tris mémoïsés).
- **index.html** — version autonome : un seul fichier à ouvrir dans un navigateur (React chargé via CDN, connexion internet requise au lancement). Fonctionne sur Mac, iPhone et iPad.

## Utilisation

### Version autonome (recommandée pour iPhone/iPad)
1. Télécharger `index.html` (bouton « Download » / « Raw » sur GitHub).
2. Sur Mac : double-clic → Safari. Sur iPhone/iPad : ouvrir via l'app Documents de Readdle (exécute le JavaScript), ou via GitHub Pages si activé.
3. Les données sont enregistrées automatiquement dans le stockage local du navigateur (par appareil).

### Version React (développement)
`App.jsx` est un composant React autonome : importer dans un projet React et rendre le composant par défaut.

## Optimisations (cette version)

- Sauvegarde localStorage différée de 300 ms avec écriture immédiate à la fermeture de l'onglet : moins d'écritures disque, aucune perte de données.
- Tris et listes mémoïsés (frise chronologique, accueil, barre d'onglets) : moins de recalculs à chaque rendu.

## Données

- Onglet « Données » : export JSON (base complète) et import JSON.
- Les données sont stockées dans le navigateur (localStorage), par appareil et par navigateur : pas de synchronisation automatique entre iPhone/iPad/Mac.
- Pour transférer la base entre appareils : Export JSON, puis Import sur l'autre appareil.

## Cotation OTAN

- Fiabilité de la source : A (totalement fiable) à F (ne peut être jugée).
- Crédibilité de l'information : 1 (confirmée) à 6 (ne peut être jugée).

---
Données initiales issues d'un recoupement du 3 octobre 2026 (veille « Actualité africaine » : presse panafricaine et internationale).
