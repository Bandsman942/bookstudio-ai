# BookStudio AI by DTSC

Application autonome de rédaction, de révision et d'édition intelligente de livres — dépôt `Bandsman942/bookstudio-ai`.

## Version et état réel

- Version de production **à vérifier dynamiquement** par `GET /api/version` et `GET /api/health` sur `https://bookstudio-ai.dtsc-platform.com` ; ne jamais déduire le déploiement du fichier `release.json`.
- Dernière production **v0.40.0-alpha vérifiée le 9 novembre 2026**, commit `3ecb8c9b9295`, Vercel `READY`, `/api/health` et `/api/version` HTTP 200 ; voir [journal v0.40](docs/deployments/2026-11-09-v0.40.0-alpha.md).
- **v0.40.0-alpha livrée en production privée le 9 novembre 2026** : sommaire global du livre, sections H1–H3 sauvegardées consultables à la demande et navigation sûre vers le Studio (#189). E2E propriétaire BON, CI #274 SUCCESS, snapshot Neon avant fusion, déploiement Vercel READY depuis main `3ecb8c9`, health/version 200. [Fiche v0.40](docs/releases/v0.40.0.md) · [journal vérifié](docs/deployments/2026-11-09-v0.40.0-alpha.md).
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

## v0.34.0-alpha — livrée en production privée

BS-004h issue #170 : **Copier un chapitre dans un autre livre…** depuis son menu ⋯. Choix d'un ouvrage modifiable du **même workspace**, recherche titre, copie indépendante du **dernier contenu réellement enregistré** à la fin de l'édition courante de destination (nouvel ID, révision 0). Source intacte et livre destination en Brouillon. Idempotence, verrouillage des deux ouvrages, contrôle multi-tenant, refus explicite sans troncature ; aucun commentaire, source Supabase, snapshot, ancienne révision ni attestation ClamAV copié. [Release](docs/releases/v0.34.0.md) · [QA](docs/qa/E2E-CHAPTER-CROSS-BOOK-0.34.0.md). Production actuelle **v0.34.0-alpha**, E2E propriétaire BON, CI #243 SUCCESS, snapshot Neon protégé avant fusion et Vercel READY. Preview OFF, ClamAV OFF.

## v0.35.0-alpha — livrée en production privée

Issue BS-004i #173 : nouvelle commande **Fusionner avec un autre chapitre…** dans les menus de chapitres, créant un **troisième chapitre indépendant** en fin du livre depuis les deux dernières révisions enregistrées, dans l'ordre choisi, avec JSON/formatage conservé et révision 0. Les originaux, historiques et commentaires ne sont jamais écrasés, le statut retourne à Brouillon. API privée transactionnelle idempotente, limites éditeur 2 Mio sans troncature, UI FR/EN accessible. [Release](docs/releases/v0.35.0.md) · [Recette E2E](docs/qa/E2E-CHAPTER-MERGE-0.35.0.md). Production actuelle **v0.35.0-alpha**, E2E propriétaire BON, CI #248 SUCCESS au SHA final, snapshot Neon protégé avant fusion et Vercel READY. ClamAV toujours OFF.

## v0.36.0-alpha — livrée en production privée

BS-005a issue #176 : **rechercher et remplacer dans le chapitre ouvert dans Studio**, via ⌕ ou Ctrl/Cmd+F/H. Texte littéral (pas de regex), navigation suivant/précédent, option sensible à la casse, remplacement isolé ou global après confirmation explicite. Les éditions existantes/formatages sont protégés : seules les correspondances **entièrement dans un segment de texte** sont remplaçables, sans écraser les styles adjacents. Remplacer tout est **atomique et annulable d'un seul Ctrl+Z**, limite 500 résultats, résultat intégral ≤2 MiB validé avant mutation, autosave existant, aucune requête IA ni nouvelle route. UI FR/EN, mobile et clair/sombre. [Release](docs/releases/v0.36.0.md) · [QA](docs/qa/E2E-CHAPTER-FIND-0.36.0.md). Production actuelle **v0.36.0-alpha**, E2E propriétaire BON, CI #254 SUCCESS, snapshot Neon protégé avant fusion et Vercel READY. ClamAV OFF.

## v0.37.0-alpha — livrée en production privée

Deux évolutions : **Recherche dans un seul livre** (issue #179) depuis la vue d'ensemble et le Studio, avec accès privé aux seules dernières révisions enregistrées, pages de 30 résultats et bouton pour charger la suite, sans perdre des résultats au-delà de 30 ; **hamburger mobile du workspace** (issue #180), visible au **coin supérieur gauche** (44 px) sur Bibliothèque, ouvrages, Archives et Recherche, révélant **toutes les options de la barre latérale desktop** et les chapitres/actions, avec fermeture, défilement, accessibilité, thèmes et safe area iOS. Hamburger du Studio renforcé, conservant le blocage de navigation si un brouillon n'est pas sauvegardé.

[Release candidate](docs/releases/v0.37.0.md) · [Conception](docs/design/BOOK-SEARCH-MOBILE-0.37.0.md) · [E2E](docs/qa/E2E-BOOK-SEARCH-MOBILE-0.37.0.md). **Production actuelle v0.37.0-alpha**, propriétaire E2E BON, GitHub CI #261 SUCCESS au SHA final, snapshot Neon protégé avant fusion, Vercel READY. Preview OFF. ClamAV toujours reporté/OFF. ClamAV toujours reporté/OFF.

## v0.38.0-alpha — livrée en production privée

BS-005c issue #183, suite du cahier des charges §5.1 : **sommaire dynamique des sections H1–H3 dans le Studio**. Dans le menu gauche (hamburger sur mobile/tablette), basculez entre **Chapitres** et **Sections** ; les titres de section de votre chapitre courant apparaissent avec indentation, filtre Unicode, compteur réel et navigation directe sans modifier le texte ni la révision. Les listes dépassant 300 titres affichent une limite explicite et restent consultables via filtre. Les menus contextuels des chapitres restent dans l'onglet Chapitres, les brouillons sont protégés. Aucun endpoint, migration ou IA ajoutés. [Release](docs/releases/v0.38.0.md) · [QA](docs/qa/E2E-SECTION-OUTLINE-0.38.0.md).

**Production v0.38.0-alpha vérifiée** : E2E propriétaire BON, GitHub CI #265 SUCCESS, snapshot Neon `snap-curly-recipe-bfml77am` avant PR #184 fusionnée, main `393ac0c76d13`, Vercel `dpl_DNXRdpPCD6z1yHiWoBfknm3g6r3F` READY, santé/version 200. [Journal réel](docs/deployments/2026-11-09-v0.38.0-alpha.md). Preview OFF, ClamAV OFF. Le défaut mobile sous 760px est traité en v0.39.

## v0.39.0-alpha — livrée en production privée : Studio mobile et repères éditoriaux locaux

Issue #185 : correction du Studio **écrasé sur téléphone** par la barre Manuscrit persistante ; sous 900px, l'éditeur retrouve la largeur utile et le hamburger ☰ ouvre le panneau gauche en surimpression. Un bouton **étincelles** offre un accès direct au panneau droit **Intelligence éditoriale**, avec commentaires et premiers repères locaux (mots, paragraphes, titres et paragraphes longs). Il ne s'agit **pas** d'une correction par IA ; aucun texte n'est transmis à un fournisseur IA. Vues exclusives, fermeture accessible, FR/EN, thèmes, brouillons et sommaire H1–H3 préservés. [Release candidate](docs/releases/v0.39.0.md) · [Design](docs/design/STUDIO-MOBILE-EDITORIAL-0.39.0.md) · [Recette mobile](docs/qa/E2E-STUDIO-MOBILE-0.39.0.md).

**Production vérifiée** : E2E propriétaire BON, GitHub CI #270 SUCCESS, snapshot Neon `snap-calm-truth-bfjb7ftc` avant PR #186 fusionnée, commit `main` `626a718ad2f0`, Vercel `dpl_F21fTNTpn77U9FoHSBTNPJfeGkmg` READY, santé/version HTTP 200 (DB ready). [Journal réel](docs/deployments/2026-11-09-v0.39.0-alpha.md). Preview OFF, ClamAV OFF ; IA générative non activée.
