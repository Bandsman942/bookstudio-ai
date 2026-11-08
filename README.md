# BookStudio AI by DTSC

Application autonome de rédaction, de révision et d'édition intelligente de livres — dépôt `Bandsman942/bookstudio-ai`.

## Version et état réel

- Version de production **à vérifier dynamiquement** par `GET /api/version` et `GET /api/health` sur `https://bookstudio-ai.dtsc-platform.com` ; ne jamais déduire le déploiement du fichier `release.json`.
- Dernière production **v0.33.0-alpha vérifiée le 8 novembre 2026**, commit `ab236434d7c5`, Vercel `READY`, `/api/health` et `/api/version` HTTP 200 ; voir [journal v0.33](docs/deployments/2026-11-08-v0.33.0-alpha.md).
- Version **v0.22.0-alpha livrée** : réorganisation des chapitres (PR #134), validation propriétaire **E2E BON**, documentation prépublication contrôlée en CI #179 et main #180 SUCCESS. Prochain lot métier restant à développer : propriétés et pilotage des ouvrages.
- Versionnement et politique : [VERSIONING](docs/ops/VERSIONING.md), [CHANGELOG](CHANGELOG.md), [fiche v0.22](docs/releases/v0.22.0.md).
- **v0.23.0-alpha déployée en production privée le 5 novembre 2026**, propriétés du livre et statut éditorial (issue #136, PR #137), CI main #184 et Vercel READY au commit `531d21175d40`. Voir [fiche v0.23](docs/releases/v0.23.0.md) et [journal de production](docs/deployments/2026-11-05T18-51-19Z_v0.23.0.md).
- Lot livré **v0.24.0-alpha** : bibliothèque paginée, recherche et filtres, indicateurs consolidés, issue #138 (PR #140, validée E2E ; prochain lot #141 sur le sélecteur d'import indépendant). Voir [fiche v0.24](docs/releases/v0.24.0.md).
- **Obligation avant TOUT déploiement :** consulter [la porte documentaire et technique](docs/ops/RELEASE-DOCUMENTATION-GATE.md) et exécuter `pnpm release:check`. Documentation utilisateur, API, technique, exploitation, recette, roadmap, changelog, limites et rollback doivent être à jour **dans le commit testé**, avant fusion/deploiement. Après READY, publier le journal de déploiement au SHA/ID réel (sans réécrire les faits historiques).
- Cycle : issue → branche → PR → documentation → tests/CI → validation E2E propriétaire → snapshot Neon → fusion `main` → **production uniquement**, aucune Preview → vérification READY/API → verrou Vercel + journal.

- **v0.26.0-alpha livrée** : progression détaillée et privée d'un livre, chapitres avec/sans texte et activité (#145), après validation E2E. [Fiche v0.26](docs/releases/v0.26.0.md).

- **Version livrée v0.27.0-alpha** : éditions multiples, copie non destructive du manuscrit courant et historique en lecture seule (issue #148). **E2E propriétaire BON, CI #201/#202, Vercel READY.** [Release v0.27](docs/releases/v0.27.0.md).

- **v0.28.0-alpha livrée** : comparaison de deux éditions et correction des modales de menus contextuels des ouvrages (issues #152/#151), après E2E propriétaire et CI #205. [Fiche v0.28](docs/releases/v0.28.0.md).

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


## Prochaine version en recette (NON DÉPLOYÉE)
- **v0.29.0-alpha livrée** : restauration d'un snapshot historique dans une édition indépendante, sans écraser les précédentes, avec prévention des sauvegardes tardives sur des chapitres devenus historiques (#155). [Release candidate](docs/releases/v0.29.0.md) · [E2E](docs/qa/E2E-SNAPSHOT-FORK-0.29.0.md). Livrée après CI #210, validation propriétaire, snapshot Neon et déploiement Vercel READY ; ClamAV différé.

## v0.30.0-alpha — livrée en production privée

Historique paginé de toutes les révisions sauvegardées d'un chapitre, aperçus privés et restauration non destructive vers une nouvelle révision depuis le Studio (#158). Tests unitaires/HTTP E2E et documentation obligatoires dans la PR ; livrée après E2E propriétaire BON, CI #216 et snapshot Neon antérieur à la fusion ; Vercel READY. Les versions précédentes restent immuables et ClamAV reste OFF. [Documentation QA](docs/qa/E2E-CHAPTER-HISTORY-0.30.0.md).

## v0.31.0-alpha — livrée en production privée

Comparaison privée, précise et non destructive des textes enregistrés de deux révisions d'un chapitre (#161) : Historique → sélecteurs → Comparer ; ajouts, suppressions, parties inchangées, limites explicites sans troncature. [Fiche de release](docs/releases/v0.31.0.md) · [QA](docs/qa/E2E-CHAPTER-DIFF-0.31.0.md). CI/documentation obligatoires dans la PR ; E2E v0.31 propriétaire BON, CI #221 SUCCESS, snapshot Neon pré-fusion, Vercel READY. ClamAV toujours reporté.

## v0.32.0-alpha — livrée en production privée

Issue BS-004f #164 : commande **Dupliquer un ouvrage** depuis les menus contextuels des livres. Un nouveau livre indépendant DRAFT est créé avec l'édition 1 et uniquement les chapitres actifs dans leur **dernière révision enregistrée**, sans transférer les fichiers sources, imports, scans, commentaires, snapshots, éditions historiques, droits ou publications. La copie est transactionnelle et les retries sont idempotents. [Release](docs/releases/v0.32.0.md) · [Recette E2E](docs/qa/E2E-BOOK-DUPLICATE-0.32.0.md). **Production actuelle : v0.32.0-alpha**, propriétaire E2E BON et GitHub CI #229 SUCCESS, snapshot Neon de protection avant fusion et Vercel READY. ClamAV OFF.

## v0.33.0-alpha — livrée en production privée

Nouvelle fonctionnalité **Dupliquer ce chapitre…** dans les menus contextuels du sommaire et du Studio, issue #167 (BS-004g). Une nouvelle ID de chapitre est ajoutée à la fin de l'édition courante, avec une révision zéro portant uniquement le **dernier contenu enregistré** du chapitre source. Les commentaires, révisions historiques, imports, sources, snapshots, scans et permissions ne sont pas copiés ; source originale conservée. Réexécution idempotente sous lock du livre. [Release](docs/releases/v0.33.0.md) · [E2E](docs/qa/E2E-CHAPTER-COPY-0.33.0.md). Production actuelle **v0.33.0-alpha**, E2E propriétaire BON, CI #235 SUCCESS, snapshot Neon protégé avant merge main et Vercel READY. ClamAV OFF.

## Candidate v0.34.0-alpha — NON DÉPLOYÉE

BS-004h issue #170 : **Copier un chapitre dans un autre livre…** depuis son menu ⋯. Choix d'un ouvrage modifiable du **même workspace**, recherche titre, copie indépendante du **dernier contenu réellement enregistré** à la fin de l'édition courante de destination (nouvel ID, révision 0). Source intacte et livre destination en Brouillon. Idempotence, verrouillage des deux ouvrages, contrôle multi-tenant, refus explicite sans troncature ; aucun commentaire, source Supabase, snapshot, ancienne révision ni attestation ClamAV copié. [Release](docs/releases/v0.34.0.md) · [QA](docs/qa/E2E-CHAPTER-CROSS-BOOK-0.34.0.md). Production actuelle **v0.33.0-alpha** jusqu'à E2E propriétaire v0.34 BON, CI finale, snapshot Neon et merge main. Preview OFF, ClamAV OFF.
