# BookStudio AI by DTSC

Application autonome de rédaction, de révision et d'édition intelligente de livres — dépôt `Bandsman942/bookstudio-ai`.

## Version et état réel

- Version de production **à vérifier dynamiquement** par `GET /api/version` et `GET /api/health` sur `https://bookstudio-ai.dtsc-platform.com` ; ne jamais déduire le déploiement du fichier `release.json`.
- Dernière production **v0.26.0-alpha vérifiée le 8 novembre 2026**, commit `daa8018388a7`, Vercel `READY`, `/api/health` et `/api/version` HTTP 200 ; voir [journal v0.26](docs/deployments/2026-11-08-v0.26.0.md).
- Version **v0.22.0-alpha livrée** : réorganisation des chapitres (PR #134), validation propriétaire **E2E BON**, documentation prépublication contrôlée en CI #179 et main #180 SUCCESS. Prochain lot métier restant à développer : propriétés et pilotage des ouvrages.
- Versionnement et politique : [VERSIONING](docs/ops/VERSIONING.md), [CHANGELOG](CHANGELOG.md), [fiche v0.22](docs/releases/v0.22.0.md).
- **v0.23.0-alpha déployée en production privée le 5 novembre 2026**, propriétés du livre et statut éditorial (issue #136, PR #137), CI main #184 et Vercel READY au commit `531d21175d40`. Voir [fiche v0.23](docs/releases/v0.23.0.md) et [journal de production](docs/deployments/2026-11-05T18-51-19Z_v0.23.0.md).
- Lot livré **v0.24.0-alpha** : bibliothèque paginée, recherche et filtres, indicateurs consolidés, issue #138 (PR #140, validée E2E ; prochain lot #141 sur le sélecteur d'import indépendant). Voir [fiche v0.24](docs/releases/v0.24.0.md).
- **Obligation avant TOUT déploiement :** consulter [la porte documentaire et technique](docs/ops/RELEASE-DOCUMENTATION-GATE.md) et exécuter `pnpm release:check`. Documentation utilisateur, API, technique, exploitation, recette, roadmap, changelog, limites et rollback doivent être à jour **dans le commit testé**, avant fusion/deploiement. Après READY, publier le journal de déploiement au SHA/ID réel (sans réécrire les faits historiques).
- Cycle : issue → branche → PR → documentation → tests/CI → validation E2E propriétaire → snapshot Neon → fusion `main` → **production uniquement**, aucune Preview → vérification READY/API → verrou Vercel + journal.

- **Candidate v0.26.0-alpha** : progression détaillée et privée d'un livre, chapitre avec/sans texte, révisions et versions (#145), **non publiée avant validation E2E**. [Fiche v0.26](docs/releases/v0.26.0.md).

- **Candidate v0.27.0-alpha** : éditions multiples, copie non destructive du manuscrit courant et historique en lecture seule (issue #148). **Non livrée** avant CI et E2E propriétaire. [Release v0.27](docs/releases/v0.27.0.md).

## Fonctionnalités déjà disponibles dans l'alpha privée

- Monorepo Next.js, TypeScript, Tiptap, Prisma et Neon PostgreSQL isolé de DTSC Platform.
- Authentification locale (cookies HttpOnly), workspace RBAC OWNER/EDITOR/REVIEWER/VIEWER et actions métier vérifiées côté serveur.
- Bibliothèque multi-ouvrages : création, renommage, archivage et restauration sans effacement.
- Chapitres : création, édition, autosave, contrôle des conflits, renommage, retrait et restauration réversible ; **réorganisation par déplacement d'un cran disponible depuis v0.22**.
- Révisions, versions/snapshots immuables et export PDF/DOCX/Markdown de lecture avec limites documentées.
- Recherche privée, commentaires simples, volet manuscrit défilant, menus contextuels/tactile et raccourcis ; notifications globales contextualisées.
- UI FR/EN, thèmes clair/sombre/système ; première tranche du ruban Word-like.
- Import DOCX par lots après prévisualisation/revue humaine, stockage de source privé sur Supabase et registre de provenance/analyses en Neon. **Le scanner ClamAV n'est PAS installé ni actif sur les manuscrits de production**.

## Limites importantes

- **Sécurité documentaire P0 non terminée :** pas de serveur antivirus isolé actif, pas de quarantaine/promotion immuable réellement raccordée, pas de sauvegarde binaire hors site prouvée. Les issues #104, #126, #131 et #133 restent ouvertes ; aucun mode strict ni flag de file scanner à activer.
- Import PDF avec OCR fidèle et médias/notes/tables Word avancés à poursuivre ; export PDF de lecture ≠ PDF imprimeur.
- Ruban Word-like ≠ Microsoft Word complet ; tableaux avancés #73, typographie #74 et suivi des modifications #75 restent à développer.
- Pas d'ouverture commerciale générale ni de garanties de récupération/scan tant que les P0 opérationnels ne sont pas validés.

## Utilisation et documentation

- [Guide utilisateur — livres, chapitres et droits](docs/guides/CHAPITRES.md)
- [API versionnée](docs/api/openapi.yaml)
- [Conception des menus contextuels](docs/design/ACTIONS-CONTEXTUELLES.md)
- [Procédure d'exploitation Vercel/Neon](docs/ops/VERCEL_PRODUCTION.md)
- [Backlog priorisé](docs/roadmap/BACKLOG.md)

## Démarrage et contrôles

Node.js >=22.18, pnpm 10/Corepack et base Neon **BookStudio dédiée** :

```bash
corepack enable
pnpm install
cp .env.example apps/web/.env.local
# Renseigner les secrets uniquement dans un fichier non versionné
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Avant PR/livraison : `pnpm release:check && pnpm test && pnpm typecheck && pnpm build`. Migrations production uniquement après snapshot et procédure validée. Cahier des charges : [document de référence](docs/CAHIER_DES_CHARGES_v1.md).
