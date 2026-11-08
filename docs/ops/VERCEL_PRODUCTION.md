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
