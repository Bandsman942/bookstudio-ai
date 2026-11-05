# BookStudio AI by DTSC

Application autonome de rédaction, de révision et d'édition intelligente de livres — dépôt `Bandsman942/bookstudio-ai`.

## Version et état réel

- Version de production **à vérifier dynamiquement** par `GET /api/version` et `GET /api/health` sur `https://bookstudio-ai.dtsc-platform.com` ; ne jamais déduire le déploiement du fichier `release.json`.
- Production privée **v0.22.0-alpha confirmée le 5 novembre 2026**, commit `4123f9e7b6af`, Vercel `READY`. Dernière vérification de version et santé : HTTP 200. Voir la [fiche de déploiement](docs/deployments/2026-11-05T18-13-19Z_v0.22.0.md).
- Version **v0.22.0-alpha livrée** : réorganisation des chapitres (PR #134), validation propriétaire **E2E BON**, documentation prépublication contrôlée en CI #179 et main #180 SUCCESS. Prochain lot métier restant à développer : propriétés et pilotage des ouvrages.
- Versionnement et politique : [VERSIONING](docs/ops/VERSIONING.md), [CHANGELOG](CHANGELOG.md), [fiche v0.22](docs/releases/v0.22.0.md).
- Prochaine version candidate : **v0.23.0-alpha**, propriétés du livre et étapes éditoriales internes, issue #136 / BS-004 (non publiée avant recette). Voir [fiche v0.23](docs/releases/v0.23.0.md).
- **Obligation avant TOUT déploiement :** consulter [la porte documentaire et technique](docs/ops/RELEASE-DOCUMENTATION-GATE.md) et exécuter `pnpm release:check`. Documentation utilisateur, API, technique, exploitation, recette, roadmap, changelog, limites et rollback doivent être à jour **dans le commit testé**, avant fusion/deploiement. Après READY, publier le journal de déploiement au SHA/ID réel (sans réécrire les faits historiques).
- Cycle : issue → branche → PR → documentation → tests/CI → validation E2E propriétaire → snapshot Neon → fusion `main` → **production uniquement**, aucune Preview → vérification READY/API → verrou Vercel + journal.

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
