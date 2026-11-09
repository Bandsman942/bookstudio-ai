# Variables Vercel et recette de première publication — BookStudio AI by DTSC

**Périmètre et état actualisé 5 novembre 2026 :** BookStudio v0.21.0-alpha en production au moment de préparer la v0.22, et aucune installation ClamAV isolée opérationnelle. Projet Vercel `bookstudio-ai`, équipe `bandsmans-projects`, dépôt `Bandsman942/bookstudio-ai`, branche `main`, root `apps/web`, Node 22.x. L'application est **distincte** de DTSC Platform ; jamais de chaîne de connexion ou de cookie partagé.

## Variables nécessaires dans Vercel / Production

| Nom exact | Obligatoire | Type | Source et usage |
|---|---|---|---|
| `DATABASE_URL` | Oui | Secret | Connection **poolée** Neon / projet `bookstudio-ai-dtsc` / branche `production` / DB `bookstudio`. Ne jamais utiliser l'URL DTSC Platform. |
| `DIRECT_URL` | Oui pour Prisma CLI et migration | Secret | URL **directe** Neon du **même** projet / même branche ; jamais partagée dans le client ou le dépôt. |
| `APP_ORIGIN` | Oui | Texte | URL HTTPS canonique, p. ex. `https://<domaine-definitif>`, sans slash final. Ne pas inventer le domaine avant déploiement. |
| `BOOKSTUDIO_PUBLIC_SIGNUP` | Oui | Texte | `false` (déjà configurée sur le projet Vercel). |
| `AI_PROVIDER_ENABLED` | Oui | Texte | `false` jusqu'au lot IA + quotas/confidentialité (déjà configurée). |

**Ne pas fournir à Vercel :** les trois `BOOKSTUDIO_BOOTSTRAP_*` (script ponctuel uniquement sur une machine sûre). `NODE_ENV` est géré par Vercel.

## Variables futures, à ajouter lorsque le lot correspondant est livré

| Nom | Condition d'activation |
|---|---|
| `OBJECT_STORE_ENDPOINT` | Implémentation stockage objet sécurisé |
| `OBJECT_STORE_BUCKET` | Idem |
| `OBJECT_STORE_ACCESS_KEY_ID` | Idem, secret |
| `OBJECT_STORE_SECRET_ACCESS_KEY` | Idem, secret |
| `DTSC_API_BASE_URL` | Contrat serveur-à-serveur DTSC publié, versionné et approuvé |
| `DTSC_OIDC_ISSUER` | SSO OIDC validé, aucune réutilisation de cookies DTSC |

Les deux dernières ne doivent pas être remplies simplement avec l'URL publique DTSC : elles attendent une véritable intégration contractuelle. Aucun jeton OpenRouter/IA n'est nécessaire lorsque `AI_PROVIDER_ENABLED=false`.

## Variables Supabase et antivirus (état progressif)

- Les sources privées DOCX sont stockées dans **Supabase Storage**. La configuration actuelle doit être vérifiée sans exposer de secret ni de lien signé ; le Vercel Blob anciennement envisagé (#46) a été abandonné.
- `BOOKSTUDIO_SOURCE_SCAN_QUEUE_ENABLED` : **OFF** (variable absente en production à la dernière vérification), ne pas activer avant worker ClamAV réellement hébergé et vérifié.
- `BOOKSTUDIO_SCAN_WORKER_ENABLED` : **OFF** (variable absente), ne jamais ajouter de secrets M2M avant une infrastructure isolée validée et des tests EICAR réels.
- `BOOKSTUDIO_REQUIRE_SCANNED_SOURCES` : `false`, à conserver jusqu'à promotion immuable, quarantaine et migration des documents antérieurs.
- Les clés de service Supabase, secrets Neon et jetons M2M ne doivent jamais apparaître dans GitHub, dans les requêtes navigateur ni dans les journaux.

## Obligation documentaire avant chaque livraison

La [porte documentaire](RELEASE-DOCUMENTATION-GATE.md) est bloquante : mise à jour du guide utilisateur, API, design/architecture, exploitation, QA E2E, notes/changelog et backlog **sur la PR de la version**. `pnpm release:check` refuse une version >= v0.22 dont les références essentielles sont absentes. La CI et l'E2E du propriétaire doivent viser le code final documenté. Ne déverrouiller Vercel que pour le commit `main` fusionné et explicitement autorisé.

## Provisionnement du propriétaire (une seule fois)

Après migration sur la base cible, utiliser `pnpm --filter @bookstudio/database bootstrap:owner` en fournissant **uniquement dans l'environnement privé d'exécution** : `DATABASE_URL`, `BOOKSTUDIO_BOOTSTRAP_EMAIL`, `BOOKSTUDIO_BOOTSTRAP_NAME`, `BOOKSTUDIO_BOOTSTRAP_PASSWORD` (>=16 caractères). Ne jamais enregistrer ces valeurs dans GitHub, le chat, les captures d'écran ou les variables persistantes de Vercel.

## Procédure de publication

1. CI de toutes les PR P0 verte et validation E2E manuelle dans `docs/qa/E2E-AUTH-RELEASE.md`.
2. Planifier la migration Neon production et tester sa compatibilité sur une copie.
3. Contrôler les variables (existence et cibles, jamais leurs valeurs).
4. Fusionner la version validée dans `main` ; lever le verrou `commandForIgnoringBuildStep` seulement après autorisation finale.
5. Vérifier les logs, cookies, origine, ACL et une sauvegarde/restauration ; n'attribuer le domaine public qu'après la recette de publication.

**Ne pas considérer un build CI ou une première page Vercel comme une preuve que l'application est utilisable en production.**

## Lot v0.23.0-alpha — propriétés et statut

- **Aucune variable nouvelle** ; aucun changement à `DATABASE_URL`, `DIRECT_URL` ni aux secrets Supabase.
- **Aucune migration Prisma nouvelle** ; seules `books.book_type`, `books.language` et `books.status` existantes sont concernées.
- Requiert documentation `docs/releases/v0.23.0.md`, guide et API, CI finale, E2E propriétaire et snapshot Neon avant production.
- Conserver les flags antivirus OFF tant que ClamAV dédié n'est pas installé et validé.

## Candidate v0.24.0-alpha — pagination bibliothèque

- Aucun changement de variables d'environnement, pas de nouvelle migration Prisma.
- L'API liste les livres par pages via Neon. Contrôler latences des requêtes `GET /api/v1/books` et montées en charge (24/100 livres/page), accès cross-tenant et comportement en réseau faible.
- Le moteur de recherche sur titre emploie `contains` sur PostgreSQL. **L'indexation trigramme n'est pas revendiquée** ; mesurer avant ajout d'extension/index et migration dédiée.
- Sauvegarder la base Neon avant fusion, vérifier main-only, Preview OFF, santé/version, runtime et journal réel **après** READY. ClamAV non installé et flags OFF.

## Candidate v0.26.0-alpha — progression des ouvrages

Aucune migration SQL ni variable Vercel pour ce lot. `GET /api/v1/books/{bookId}/progress` consulte des lignes de révision existantes et ne renvoie que des agrégats et identifiants autorisés ; surveiller la latence et les erreurs de lecture sous charge. En cas de panne des statistiques, la vue d'ensemble doit rester ouverte. Documentation et CI avant fusion, snapshot Neon puis publication main-only, Preview OFF, health/version et journal réel après READY. ClamAV demeure hors service.

## Candidate v0.27.0-alpha — copies d'éditions

Aucune migration Prisma ni variable Vercel : tables Book/Edition/Manuscript/Chapter/DocumentRevision et AuditEvent existantes. Vérifier transaction PostgreSQL Serializable, conflit P2034/P2002 et temps d'exécution de l'API de copie. Capacité synchronisée volontairement bornée à 500 chapitres actifs / 20 MiB ; les livres plus volumineux requièrent une future file worker sans altération des sources. Aucun nouveau mode ClamAV. Après documentation complète/CI/E2E propriétaire, snapshot Neon et production exclusivement depuis `main` ; ne pas publier une branche feature ni Preview.

## Candidate v0.28.0-alpha — correctif UI et comparaison

Pas de migration SQL ni variable Vercel. La comparaison utilise les tables d'éditions, chapitres et dernières révisions existantes ; mesurez les latences de `GET /api/v1/books/{id}/editions/compare` et surveillez 422 pour les grandes éditions. La route renvoie seulement les changements de métadonnées/empreintes **sans** le texte ou le hash. Le correctif menu utilise un portail DOM côté client : vérifier la stabilité de l'overlay dans Chrome mobile/desktop, faible réseau, la fermeture et le focus. Livraison uniquement après la porte documentaire et E2E BON ; snapshot Neon puis main prod Vercel, Preview OFF, journal réel après READY. Scanner ClamAV non installé.

## Candidate v0.29.0-alpha — restaurer un snapshot vers une édition nouvelle

Aucune variable ni migration Prisma additionnelle ; accès aux tables déjà en production (`book_snapshots`, `document_revisions`, `chapters`, `editions`, `manuscripts`, `audit_events`). Préflight du contenu enregistré jusqu’à **500 chapitres / 20 MiB** et transaction Serializable jusqu’à 20 s : surveiller les dépassements de temps, 409 et 422, contention des éditions, et latence des sauvegardes (le PATCH verrouille désormais la ligne du livre avant de vérifier l’édition active). Si un fork échoue, la transaction s’annule entièrement. Ne jamais purger les anciennes éditions comme procédure de rollback. Le déploiement reste **main-only**, Preview OFF, documentation intégrée dans la PR et CI/E2E validés avant snapshot Neon et levée temporaire du verrou Vercel. Après READY, vérifier les API privées et la création de nouvelle édition sur environnement autorisé. ClamAV non installé, flags scan OFF, aucune fausse attestation.

## Candidate v0.30.0-alpha — historique et restauration de révision de chapitre

Aucune migration Prisma ni variable Vercel nouvelle. Les tables `document_revisions`, `chapters`, `editions`, `users` et `audit_events` existantes sont utilisées. La liste des révisions est paginée par séquence décroissante, 20/50 lignes maximum, sans charger de prose ; seul l'aperçu d'une révision explicitement ouverte renvoie son texte. La restauration de chapitre verrouille la ligne livre puis vérifie l'édition courante et la séquence avant d'ajouter une révision, dans une transaction `Serializable`. Superviser 401/403/404/409/422 et les latences de restauration sous réseau faible. Aucun ancien texte n'est effacé ; le statut repasse à DRAFT. Snapshots Neon et possibilité de rollback applicatif sans purger les données. Publication uniquement après documentation, CI, E2E propriétaire, snapshot Neon et merge `main`. Builds Vercel verrouillés, Preview OFF. ClamAV serveur dédié toujours non installé et flags OFF.

## Candidate v0.31.0-alpha — comparaison de deux révisions sans perte

Aucune migration, variable, worker supplémentaire ni appel réseau IA. Nouvelle API GET privée `/api/v1/books/{bookId}/chapters/{chapterId}/revisions/compare?from=N&to=M` sur les **textes enregistrés**, contrôle RBAC membre et édition courante, cache `private,no-store`. Borne stricte 250 000 caractères UTF-16 et 12 000 unités lexicales par texte, 4 millions de cellules du calcul LCS (environ 8 MiB de matrice Uint16, plus segments). Les longues parties communes sont éliminées avant la matrice. La requête retourne 422 **sans troncature** si le budget est dépassé ; ne pas contourner ce garde-fou en Vercel. Surveiller p95 latence comparateur, codes 422/503, CPU/mémoire et absence de prose dans les logs ; l'API renvoie volontairement des segments de texte au membre authentifié qui les a demandés, **jamais** à des tiers ou à une IA. CI complète, E2E propriétaire, snapshot Neon pré-fusion, Vercel main-only Preview OFF. ClamAV OFF.

## Candidate v0.32.0-alpha — duplication d'ouvrage sans copies de sources

Aucune migration Prisma, secret, bucket, worker ou variable Vercel nouvelle. Nouvelle API privée POST de duplication du livre : lecture des chapitres actifs à leur `revisionSeq` exacte, transaction Serializable, verrou SELECT FOR UPDATE appliqué au livre autorisé par membership OWNER/EDITOR. Nouveau Book DRAFT, Edition 1, Manuscript et DocumentRevision 0. **Ne jamais copier** les objets Supabase, sources, jobs/attestations ClamAV, snapshots, commentaires ni permissions. UUID `operationId` dans le journal permet un replay 200 fiable. Max 500 chapitres et 20 MiB JSON+texte, 20 secondes transaction ; 409 si conflit, 422 sans troncature. Contrôles p95 et anomalies 5xx ; aucune prose dans l'audit ou les logs. Documentation, unit tests, HTTP E2E multi-tenant et `release:check` doivent passer dans la PR ; E2E utilisateur explicitement BON avant snapshot Neon et fusion main. Vercel production seulement, Preview OFF, ClamAV OFF.

## Candidate v0.33.0-alpha — copie sûre d'un chapitre actif

Nouvelle route POST privée `/api/v1/books/{bookId}/chapters/{chapterId}/duplicate`, sans migration, variable, worker ni nouveau bucket. Member OWNER/EDITOR, Origin anti-CSRF, confirmation, `operationId` UUID idempotent stocké dans l'audit du chapitre source, préconditions d'édition courante, séquence et `updatedAt` ; `FOR UPDATE` sur le livre et transaction `Serializable` avec rollback total en cas de conflit. Copie uniquement du dernier contenu sauvegardé du chapitre, nouveau chapitre/revision 0 **à la fin**, statut DRAFT. Ne **jamais** copier les sources, commentaires, imports, scans, attestations, snapshots ou permissions. Limites 500 chapitres et 20 MiB JSON+texte, max 15s transaction ; surveiller codes 409/422/503 et latence p95 sans journaliser de prose. Tests CI `chapter-copy:check`, HTTP E2E multi-tenant, doc gate, typecheck/build. E2E propriétaire avant snapshot Neon production, merge main et Vercel prod-only Preview OFF ; health/version et journal postprod. ClamAV dédié non installé, OFF.

## Candidate v0.34.0-alpha — copie de chapitre entre deux ouvrages du même workspace

GET privé `/api/v1/books/{bookId}/chapter-copy-targets` : seul le membre OWNER/EDITOR du workspace source peut découvrir ses ouvrages **modifiables**, limite 50 réponses, `hasMore` et recherche titre (sans prose). POST privé `/api/v1/books/{bookId}/chapters/{chapterId}/copy-to-book` : transaction `Serializable` verrouillant les **deux lignes livres dans l'ordre UUID** pour éviter les interblocages, révalidation des deux éditions, de la séquence de révision et des dates. Destination DRAFT, source intacte, une unique révision n°0 de nouveau chapitre, aucun commentaire, source/import/scan Supabase, snapshot ni ACL recopié. Idempotence `operationId` enregistrée sans prose et retour 200 au retry. Bornes 500 chapitres cible et 20 MiB JSON+texte source, rollback 409/422. Aucune migration/variable supplémentaire. Surveiller p95, 409/422/503 et absence de prose dans les journaux. Contrôle CI `chapter-targets:check` + `chapter-copy:check`, E2E PostgreSQL multi-tenant, doc gate, typecheck/build, puis propriétaire E2E BON et snapshot Neon prod AVANT merge main. Vercel production-only Preview OFF, health/version et journal réel ; ClamAV OFF.

## Candidate v0.35.0-alpha — fusion éditoriale non destructive de chapitres

Nouvelle API POST `/api/v1/books/{bookId}/chapters/{chapterId}/merge`, sans migration ni variable nouvelle. La route valide membership OWNER/EDITOR, Origin, deux chapitres distincts et actifs de la dernière édition ; verrou `SELECT ... FOR UPDATE OF b`, transaction `Serializable`, révision/updatedAt des deux sources optimistes. Crée un **troisième** chapitre ID neuf en fin de sommaire avec une révision 0 de blocs JSON A puis B, statut livre remis DRAFT. Original, snapshots, commentaires, sources Supabase/imports/scan conservés sans héritage. `operationId` UUID et hash des paramètres dans l'audit (aucune prose) pour replay 200 fiable ; 409 collision/concurrence, 422 si >500 chapitres ou document réuni >2 MiB/complexité. Aucun contenu tronqué, pas d'IA. Timeout transaction 20 secondes ; mesurer conflits et temps p95, ne pas journaliser le manuscrit. CI `chapter-merge:check`, E2E HTTP PostgreSQL, release:check, types/build/UI/perf avant E2E propriétaire. Snapshot Neon prod AVANT merge, Vercel production main uniquement Preview OFF, health/version et journal postprod. Scanner ClamAV isolé non installé et OFF.

## Candidate v0.36.0-alpha — recherche/remplacement local, aucune nouvelle route

L'outil de recherche/remplacement apparaît dans le Studio, pas dans une route backend : pas de migration, pas de variable, pas de RAG/IA ni de journal des termes recherchés. Le navigateur interroge **uniquement le document ProseMirror en mémoire**. Les opérations de remplacement s'effectuent par une transaction candidate, refus si total >500, chaîne de substitution >1000 caractères ou document >2 MiB/20 000 nœuds, puis un unique dispatch si validé. Le mécanisme autosave existant persiste la nouvelle révision via `PATCH /api/v1/books/{bookId}/chapters/{chapterId}` et le contrôle `baseRevision`. Le toast local n'est pas une confirmation du serveur. Un conflit de révision, un état offline, erreur ou récupération bloquent une nouvelle action de substitution jusqu'à résolution. Interdire tout envoi des recherches ou manuscrits aux logs, analytics ou API externe. QA finale : `chapter-find:check` (Unicode, littéral, marques, limite 2 MiB et Undo), typecheck, E2E HTTP, `release:check`, UI/perf/build. Documentation obligatoire AVANT Vercel. E2E propriétaire v0.36 BON puis snapshot Neon prod pré-merge, Vercel production `main` uniquement, Preview OFF et journal postprod. ClamAV OFF.

## Candidate v0.37.0-alpha — recherche ciblée et menu mobile (#179, #180)

API existante `GET /api/v1/search` : prise en charge de `bookId` privé facultatif et pagination `offset` multiple de 30 (≤30000), LIMIT 31 pour signaler `hasMore` sans tronquer silencieusement, tri déterministe et `Cache-Control: private,no-store`. Recherche ILIKE paramétrée avec wildcards échappées, accès membership sur `books` avant lecture de textes, édition actuelle/chapter révision courante uniquement. La page /search?bookId=... vérifie aussi le titre avant SSR. Pas de migration, nouveau secret, index vectoriel ni worker ; surveiller latence p95 SQL et le nombre de 400/401/404/503, ne pas loguer texte ou requêtes privées.

UI : `WorkspaceShell` partage le sidebar existant dans Bibliothèque, Archives, Recherche et fiche de livre, mais expose un hamburger **☰ en haut à gauche** sous 900px et un drawer off-canvas à défilement indépendant. `StudioEditor` améliore son hamburger, navigation et avertissements de brouillons. Tester 320/375/390/768/1150/1440px, long sommaire, z-index des menus contextuels (portal 2000 > drawer 1211), FR/EN, clair/sombre, safe-area iOS et clavier. Vérifier que le sommaire et le panneau de navigation restent accessibles au téléphone sans perte des données. Sécurité RBAC et API inchangées pour la navigation.

CI `search-paging:check`, `mobile-workspace:check` (contract statique seulement), E2E HTTP PostgreSQL privé 35 chapitres (30+5), `release:check`, UI/perf, Prisma, types/build. **Documentation prépublication obligatoire** avant toute fusion et Vercel, puis propriétaire `E2E v0.37.0-alpha BON`, snapshot Neon production **avant** squash main, Vercel main-only Preview OFF, health/version/logs et journal postproduction après livraison. ClamAV reste OFF/non installé.

## Candidate v0.38.0-alpha — navigation des sections du chapitre courant

Le composant `ChapterSectionOutline` s'appuie sur `extractChapterSectionOutline` dans le navigateur pour **lire seulement** les nœuds de titres H1/H2/H3 du document ProseMirror actif, y compris le brouillon. Aucun endpoint, requête réseau, migration, variable d'environnement, stockage, index ou ressource ClamAV supplémentaire. Navigation par une transaction de **sélection seule** (`docChanged=false`) après revérification de l'ancre, sans sauvegarde, sans logs de prose, sans changement des révisions. Les deux onglets Chapitres/Sections sont dans l'unique sidebar du Studio, accessible via hamburger jusqu'à 900px, avec filtre et signalement au-delà de 300 titres. Les actions contextuelles ⋯ de chapitres restent uniquement dans l'onglet Chapitres ; navigation vers d'autres chapitres soumise à la protection des brouillons.

Gate CI : `pnpm section-outline:check`, `pnpm test`, `pnpm release:check`, `pnpm ui:check`, `pnpm perf:check`, E2E HTTP PostgreSQL existant, worker, types/build. **Recette visuelle propriétaire indispensable** sur Chrome mobile, Safari iOS si disponible, 320/375/768/900/1440px, lecture seule, dark/light, mode concentration et >300 titres. Après `E2E v0.38.0-alpha BON` seulement : snapshot Neon production avant fusion main, Vercel production main-only Preview OFF, sonde READY/health/version/logs, journal postproduction documents-only. ClamAV isolé toujours OFF.

## Candidate v0.39.0-alpha — correctif du Studio Android et repères locaux (#185)

Le correctif ferme un conflit de cascade CSS ayant laissé la sidebar Manuscrit de 248 px dans le flex à ≤760 px ; le centre se retrouve au premier plan sur 320–900 px, avec navigation gauche en volet fixe et bouton direct étincelles pour le volet droit « Intelligence éditoriale » jusqu'à 1150 px. La navigation, les commentaires existants, les brouillons et le sommaire H1–H3 de v0.38 restent disponibles. Les indicateurs locaux (mots/paragraphes/titres/paragraphes longs >180 mots) lisent exclusivement le document en mémoire et ne sont pas une analyse IA. Aucun endpoint, migration Prisma, secret, variable, scan ou worker nouveau ; ClamAV OFF.

Avant fusion : `pnpm editorial-structure:check`, `pnpm mobile-workspace:check`, `pnpm section-outline:check`, `pnpm release:check`, `pnpm test`, `pnpm ui:check`, `pnpm perf:check`, E2E HTTP privé, typecheck/build et **recette physique Android** à 320/360/375/390/768/900 px avec focus, clavier, redimensionnement et lecture seule. **Attendre `E2E v0.39.0-alpha BON` explicite** sur dernier SHA CI vert, créer snapshot Neon `production` AVANT fusion main, puis Vercel production main-only Preview OFF avec `/api/health`, `/api/version`, logs et journal après READY. Un test CSS statique ne valide pas à lui seul la capture du téléphone.

## Production vérifiée v0.39.0-alpha — 9 novembre 2026

Après E2E propriétaire BON, CI #270 SUCCESS et snapshot Neon production `snap-calm-truth-bfjb7ftc` **avant merge**, PR #186 fusionnée sur main `626a718ad2f0`, déploiement Vercel `dpl_F21fTNTpn77U9FoHSBTNPJfeGkmg` READY, `GET /api/health` 200 DB ready et `GET /api/version` 200 v0.39.0-alpha. Aucun cluster d'erreurs runtime dans la fenêtre sondée, Preview OFF, `commandForIgnoringBuildStep=exit 0` restauré. Aucune migration ni nouveau secret/worker ; ClamAV OFF. Journal réel `docs/deployments/2026-11-09-v0.39.0-alpha.md`.

## Candidate v0.40.0-alpha — sommaire global en lecture seule (#189)

Nouvelle route privée `GET /api/v1/books/{bookId}/chapters/{chapterId}/outline`, 60 titres H1–H3 **sauvegardés** au maximum par page, filtre littéral et offset bornés, compteur exact, `Cache-Control: private,no-store`. Le serveur revérifie la session et l'appartenance livre/workspace/édition courante, puis lit le JSON **d'un seul chapitre actif**. La réponse ne contient pas les paragraphes ; ne pas journaliser les titres, filtres ni URL privées. Surveiller p95 latence, volume de requêtes par chapitre, 400/401/404/503 et charge Prisma. Aucune migration, variable, worker, IA ni flag ClamAV. Un navigateur qui garde un lien ancien doit recevoir un avertissement de révision, pas un saut incertain.

**Avant fusion/production** : `pnpm release:check`, `pnpm book-outline:check`, `pnpm section-outline:check`, `pnpm test`, `pnpm ui:check`, `pnpm perf:check`, E2E HTTP PostgreSQL multi-tenant, Prisma, typecheck/build au **dernier SHA**, puis E2E propriétaire réel sur téléphone. Ne fusionner qu'après **`E2E v0.40.0-alpha BON`** ; prendre un snapshot Neon production protégé AVANT fusion, Vercel depuis `main` seulement, Preview OFF ; vérifier READY/health/version et journal rédigé après observation. ClamAV dédié OFF.

## Candidate v0.41.0-alpha — parties persistantes, migration PostgreSQL (#192)

Le schéma introduit `manuscript_parts` et `chapters.part_id` **nullable** avec FK `(part_id, manuscript_id)` de même édition ; la migration `20261109170000_manuscript_parts` est strictement additive. Aucun contenu, source, révision, position ou snapshot existant n'est réécrit. Les parties sont conservées lors de la copie d'édition ou de livre, mais le snapshot historique v1 n'en contient pas : ne pas prétendre à une restauration fidèle de ces métadonnées depuis les anciennes versions. Aucun nouveau secret, fournisseur IA ou paramètre ClamAV.

**Avant toute production**, sur la PR candidate et le SHA final : `pnpm release:check`, `pnpm book-parts:check`, `pnpm book-outline:check`, `pnpm test`, `pnpm ui:check`, `pnpm perf:check`, `pnpm db:generate`, `pnpm db:deploy` **sur PostgreSQL isolé CI**, E2E HTTP multi-tenant, typecheck/build. La présence de la migration dans CI ne permet pas son exécution anticipée en production. Tester manuellement Android Chrome 320/360/375/390 et tablette 768/900 : hamburger, sommaire, Studio, clavier, focus, clair/sombre, 13+ chapitres, compte VIEWER, réseau lent.

**Après validation propriétaire explicite `E2E v0.41.0-alpha BON` et CI verte seulement** : effectuer un snapshot Neon **de la branche de production** avant la fusion, enregistrer son ID, fusionner sur `main` et laisser le pipeline Vercel production uniquement `prisma migrate deploy → pnpm build` appliquer la migration. Pas de Preview ni de `--prod` depuis une branche. Si le verrou d'ignoreCommand bloque le déploiement attendu, ne débloquer que le SHA exact de `main` suivant le protocole validé, puis restaurer `exit 0` et Preview OFF. Vérifier READY, `/api/health` 200 `database:ready`, `/api/version` 200 version 0.41.0-alpha, erreurs runtime et opérations des parties dans un livre de test non sensible ; journal postproduction ensuite. En cas d'échec, conserver les données et le snapshot ; rollback applicatif de la version, **ne pas supprimer `part_id` ou `manuscript_parts` manuellement** sans plan approuvé de migration de retour. ClamAV demeure OFF.
