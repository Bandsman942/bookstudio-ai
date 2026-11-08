# Porte documentaire et de publication — BookStudio AI

**Date d'entrée en vigueur : 5 novembre 2026, dès la v0.22.0-alpha.**
Décision du propriétaire : **toute documentation nécessaire doit être actualisée, relue et intégrée à la PR AVANT de publier une version en ligne.** Cette règle s'applique à tous les lots (correctifs P0 compris) et complète le pipeline existant.

## Barrière obligatoire et vérifiable (préproduction)

1. **Documentation utilisateur** : guide/parcours fonctionnel réellement modifié, droits RBAC, limites, mobile, FR/EN lorsque concerné.
2. **Documentation technique** : design/architecture, composants et invariants de données, sécurité, effet sur les anciennes révisions, rollback/compatibilité.
3. **Documentation API** : routes, schémas d'entrée/sortie, statuts HTTP, validations, autorisations, migration et erreurs nouvelles.
4. **Documentation exploitation** : variables, migrations/rollback, surveillance, comportement réseau lent, sauvegardes, flags inactifs.
5. **Recette QA** : cas positifs/négatifs, rôles, plusieurs onglets, clavier/mobile, preuves CI, approbation E2E propriétaire.
6. **Notes de version et changelog** : fonctionnalités ajoutées, limitations non couvertes, risques, dépendances, URL vers docs.
7. **Backlog/état des issues** : clôturer seulement les critères satisfaits et conserver les P0 partiels (ne jamais décrire une protection antivirus fictive).
8. Dans `docs/releases/vX.Y.Z.md`, inclure `## Documentation prepublication` et les six champs `Documentation-User`, `Documentation-Technical`, `Documentation-API`, `Documentation-Operations`, `Documentation-QA`, `Documentation-Roadmap` avec chemins existants. La CI `pnpm release:check` valide leur existence et bloque une livraison documentaire incomplète.
9. Exiger **CI verte au SHA final de la PR** ET **E2E utilisateur BON** après vérification que les changements post-E2E n'ajoutent pas de comportement métier non retesté ; snapshot Neon de production, fusion sur `main`, déploiement unique sur Vercel production avec Preview désactivées.
10. **Après** Vercel READY, contrôler SHA `main` = déploiement, `/api/health`, `/api/version`, migration et erreurs ; conserver dans `docs/deployments/` une fiche datée contenant des IDs réellement observés. Un journal n'est pas annoncé « publié » tant que sa PR documentaire n'a pas été intégrée.

## Cas particuliers

- Sans nouvelle route ou migration, mettre explicitement `Sans changement` dans le document concerné : ne pas l'omettre.
- Les mises à jour de documentation doivent **précéder** la fusion et le déverrouillage du pipeline ; un correctif documentaire après production ne remplace jamais la préparation.
- Les secrets ne doivent jamais être copiés dans les docs, journaux ou tests.
- Le scanner ClamAV réel reste **non installé** ; les flags `BOOKSTUDIO_SOURCE_SCAN_QUEUE_ENABLED` et `BOOKSTUDIO_SCAN_WORKER_ENABLED` restent OFF et `BOOKSTUDIO_REQUIRE_SCANNED_SOURCES=false` tant que les tickets #104/#126/#133 sont incomplets.

## v0.22 : pièce de contrôle

- Release : `docs/releases/v0.22.0.md`
- Guide : `docs/guides/CHAPITRES.md`
- Technique : `docs/design/ACTIONS-CONTEXTUELLES.md`
- API : `docs/api/openapi.yaml`
- QA : `docs/qa/E2E-CHAPTER-REORDER-0.22.0.md`
- Exploitation : `docs/ops/PRODUCTION-GATE.md`, `docs/ops/VERCEL_PRODUCTION.md`
- Backlog : `docs/roadmap/BACKLOG.md`
- Validation propriétaire E2E v0.22 BON ; GitHub CI #176 SUCCESS sur le commit fonctionnel, puis nouvelle CI nécessaire sur la version documentée.

## Lot v0.23.0-alpha (prépublication)

- Le type et la langue de référence ne transforment pas les octets du manuscrit ni les éditions existantes ; aucune migration SQL.
- Le statut éditorial est un état manuel, aucun déclenchement externe ni faux effet « publication ».
- Dossier documentaire : `docs/releases/v0.23.0.md`, `docs/guides/CHAPITRES.md`, `docs/design/BOOK-LIFECYCLE.md`, `docs/api/openapi.yaml`, `docs/qa/E2E-BOOK-METADATA-0.23.0.md`, `docs/roadmap/BACKLOG.md`.
- Cette PR **ne doit pas** être fusionnée tant que GitHub CI sur SHA documenté et validation propriétaire `E2E v0.23.0-alpha BON` ne sont pas confirmées ; snapshot Neon avant publication, Preview OFF, scanner ClamAV non activé.

## Lot candidate v0.24.0-alpha — bibliothèque scalable

Le manifeste obligatoire `docs/releases/v0.24.0.md` référence les six documents. `pnpm release:check`, E2E API et tests de pagination vérifient les filtres et curseurs. Sans validation propriétaire **E2E v0.24.0-alpha BON**, aucune fusion sur `main` ni déploiement Vercel. **Aucune migration SQL**, rollback applicatif seulement avec vérification préalable de l'état de la base. Les compteurs globaux sont construits à partir des livres autorisés ; jamais du seul premier lot de cartes.

## Prépublication v0.25.0-alpha — issue #141

Le sélecteur d'import utilise `GET /api/v1/books?editable=1&limit=20` :
le serveur filtre OWNER/EDITOR avant pagination, y compris les compteurs.
La confirmation du transfert refait le contrôle métier. Le tableau éditorial
est agrégé depuis la base pour l'utilisateur connecté ; pas de nouveaux
champs de base ni de migrations SQL. Surveiller les performances de
`GET /api/v1/books` à grande échelle, les états mobiles et le réseau faible.
Les documents utilisateur, design, API, exploitation, QA, roadmap et notes de
version doivent être présents dans la PR avant CI/E2E et production.

Aucun worker ClamAV n'est installé sur son hôte dédié ; ne pas activer
les flags de scan ni le mode strict. La version doit rester candidate tant
que `E2E v0.25.0-alpha BON` n'est pas reçu.

## Candidate v0.26.0-alpha — progression de l'ouvrage

Documentation requise dans la PR avant fusion : `docs/releases/v0.26.0.md`, `docs/guides/CHAPITRES.md`, `docs/design/BOOK-PROGRESS.md`, `docs/api/openapi.yaml`, `docs/qa/E2E-BOOK-PROGRESS-0.26.0.md`, `docs/roadmap/BACKLOG.md`. Vérifier le calcul sur dernière révision et l'absence de prose dans l'API, les droits en lecture, les 320/375px, l'absence de régression éditeur et le fallback si les métriques ne sont pas disponibles. La CI doit être verte au SHA final documenté, puis E2E propriétaire BON. Aucun snapshot/déploiement avant cette validation. Scanner ClamAV réel non installé, flags OFF.

## Candidate v0.27.0-alpha — éditions multiples

**P0 intégrité :** copie synchrone transactionnelle de la dernière révision uniquement ; vérifier sauvegarde du texte AVANT création, nouvelles IDs, conservation du manuscrit ancien, commentaires et versions. Le bouton doit expliquer clairement la copie. Tests 409 concurrent, 403 CSRF, 404 cross-tenant, aucun transfert de sources ni « SCANNED_CLEAN » inventé.

Manifeste prépublication : `docs/releases/v0.27.0.md`, `docs/guides/CHAPITRES.md`, `docs/design/MULTI-EDITIONS.md`, `docs/api/openapi.yaml`, `docs/qa/E2E-MULTI-EDITIONS-0.27.0.md`, `docs/roadmap/BACKLOG.md`. Toutes ces pièces doivent figurer dans la PR et passer `pnpm release:check` **avant** E2E/fusion. CI main, snapshot Neon pré-fusion, Vercel production main-only Preview OFF, journal réel après READY.

## v0.28.0-alpha — menus vidéo et comparaison d'éditions

Preuve documentaire requise avant tout déploiement : `docs/releases/v0.28.0.md`, guide, conception `docs/design/EDITION-COMPARISON.md` et `docs/design/ACTIONS-CONTEXTUELLES.md`, OpenAPI, exploitation, recette `docs/qa/E2E-EDITION-COMPARE-MENU-0.28.0.md` et roadmap. Exécuter `pnpm release:check`, `pnpm edition-diff:check`, `pnpm ui:check`, HTTP E2E multi-tenant, typecheck et build sur le dernier SHA. Le film utilisateur documente la régression : vérifier **toutes les modales de livre** après ouverture depuis une carte survolée ; pas de modale limitée à la carte. L'API de comparaison ne doit jamais renvoyer de prose ni de hashes. Attendre E2E propriétaire `v0.28.0-alpha BON`, snapshot Neon, fusion main et Vercel production-only Preview OFF. ClamAV OFF.

## Candidate v0.29.0-alpha — restauration non destructive historique

Ajouter **avant déploiement** les six pièces du manifeste `docs/releases/v0.29.0.md`, y compris design `docs/design/SNAPSHOT-FORK-0.29.0.md`, QA `docs/qa/E2E-SNAPSHOT-FORK-0.29.0.md`, OpenAPI, guide, exploitation et roadmap. Contrôles CI : `pnpm release:check`, `pnpm snapshot-fork:check`, E2E HTTP, sécurité ACL/CSRF, typecheck et build. Aucun déploiement sans **E2E propriétaire v0.29 BON** et CI du dernier commit, snapshot Neon protégé avant fusion, puis Vercel production uniquement depuis main. ClamAV OFF.

## Candidate v0.30.0-alpha — historique du chapitre

La PR doit contenir AVANT la fusion : `docs/releases/v0.30.0.md`, guide `docs/guides/CHAPITRES.md`, conception `docs/design/CHAPTER-HISTORY-0.30.0.md`, OpenAPI, exploitation, QA `docs/qa/E2E-CHAPTER-HISTORY-0.30.0.md`, changelog et roadmap. La CI doit valider `pnpm release:check`, `pnpm chapter-history:check`, `pnpm test`, le test HTTP E2E multi-tenant et de restauration sans perte, typecheck et build. Aucun commit en production avant E2E propriétaire `v0.30.0-alpha BON`, snapshot Neon protégé et déploiement depuis `main` uniquement. ClamAV reste OFF.

## Candidate v0.31.0-alpha — diff lexical des révisions

Exiger AVANT le déploiement : `docs/releases/v0.31.0.md`, guide révisions, conception `docs/design/CHAPTER-DIFF-0.31.0.md`, OpenAPI, exploitation, QA `docs/qa/E2E-CHAPTER-DIFF-0.31.0.md`, changelog et roadmap. CI : `pnpm release:check`, `pnpm chapter-diff:check`, `pnpm test`, HTTP E2E multi-tenant, typecheck/build. Le diff doit conserver le texte exact (espaces et sauts de ligne) et ne jamais le tronquer silencieusement ; historique autre édition refusé. Avant publication : E2E propriétaire `v0.31.0-alpha BON`, snapshot Neon, main seulement, READY /api/health et /api/version, journal réel postproduction. Preview OFF, ClamAV OFF.

## Candidate v0.32.0-alpha — duplication sûre des ouvrages

**Avant toute fusion** : manifeste complet `docs/releases/v0.32.0.md`, guide `docs/guides/CHAPITRES.md`, design `docs/design/BOOK-DUPLICATE-0.32.0.md`, API `docs/api/openapi.yaml`, exploitation `docs/ops/VERCEL_PRODUCTION.md`, recette `docs/qa/E2E-BOOK-DUPLICATE-0.32.0.md`, changelog et roadmap. CI `pnpm release:check`, `pnpm book-duplicate:check`, `pnpm test`, HTTP E2E multi-tenant, TypeScript/build sur dernier SHA. Vérifier qu'aucun objet source/import/scan/snapshot/commentaire/permission n'est hérité, copie uniquement la révision enregistrée de chaque chapitre, 409 concurrency, 422 sans troncature, replay idempotent, et aucun état CLEAN fictif. Attendre **E2E v0.32.0-alpha BON**, snapshot Neon prod avant merge puis Vercel main-only Preview OFF, health/version et journal réel postproduction. ClamAV non installé, OFF.

## Candidate v0.33.0-alpha — duplication de chapitre

Les documents `docs/releases/v0.33.0.md`, `docs/guides/CHAPITRES.md`, `docs/design/CHAPTER-COPY-0.33.0.md`, `docs/api/openapi.yaml`, `docs/ops/VERCEL_PRODUCTION.md`, `docs/qa/E2E-CHAPTER-COPY-0.33.0.md`, `docs/roadmap/BACKLOG.md`, README et changelog sont intégrés **avant toute publication**. La CI finale exécute `pnpm release:check`, `pnpm chapter-copy:check`, `pnpm test`, E2E HTTP PostgreSQL multi-tenant, TypeScript et build. Vérifier source courante sauvegardée et immuable, nouvelle ID/révision 0, append en dernière position sans réordonner les autres, retour DRAFT, aucun commentaire ou objet import/scan/snapshot copié, idempotence réseau et conflits 409. **E2E propriétaire v0.33.0-alpha BON requis avant fusion ou Vercel**, snapshot Neon production avant main, Preview OFF, ClamAV OFF.

## Candidate v0.34.0-alpha — copie sûre de chapitre dans un autre livre

Manifeste obligatoire **AVANT tout déploiement** : `docs/releases/v0.34.0.md`, guide `docs/guides/CHAPITRES.md`, design `docs/design/CHAPTER-CROSS-BOOK-0.34.0.md`, OpenAPI, `docs/ops/VERCEL_PRODUCTION.md`, recette `docs/qa/E2E-CHAPTER-CROSS-BOOK-0.34.0.md`, changelog, README et roadmap. Tests `pnpm release:check`, `pnpm chapter-copy:check`, `pnpm chapter-targets:check`, `pnpm test`, E2E HTTP PostgreSQL privé, types/build et UI/perf. Valider même workspace pour les deux livres, deux memberships d'écriture, sélection filtrée, contenu exact dernière révision, destination DRAFT, source immuable, 409 conflits/idempotence et 422 sans troncature. Fusion/déploiement après **`E2E v0.34.0-alpha BON` explicite**, snapshot Neon production pré-merge et Vercel `main` exclusivement, Preview OFF. ClamAV OFF.

## Candidate v0.35.0-alpha — contrôle de la fusion non destructive

Dossier **prépublication** complet : `docs/releases/v0.35.0.md`, guide `docs/guides/CHAPITRES.md`, design `docs/design/CHAPTER-MERGE-0.35.0.md`, OpenAPI, exploitation `docs/ops/VERCEL_PRODUCTION.md`, QA `docs/qa/E2E-CHAPTER-MERGE-0.35.0.md`, README, changelog et roadmap. Gate obligatoire `pnpm release:check`, `pnpm chapter-merge:check`, `pnpm test`, E2E HTTP PostgreSQL multi-tenant, `pnpm ui:check`, `pnpm perf:check`, TypeScript/build au dernier SHA. Tester ordre A puis B avec marques, non-suppression sources/comments/snapshots, statut DRAFT, refus 409 et 422 sans troncature, replay idempotent 200 et audit sans prose. **E2E v0.35.0-alpha BON propriétaire requis avant fusion/déploiement**, snapshot Neon production protégé AVANT merge main, Vercel prod main-only Preview OFF. ClamAV OFF.
