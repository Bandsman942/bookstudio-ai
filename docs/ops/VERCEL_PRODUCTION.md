# Variables Vercel et recette de première publication — BookStudio AI by DTSC

**Périmètre :** projet Vercel `bookstudio-ai`, équipe `bandsmans-projects`, dépôt `Bandsman942/bookstudio-ai`, branche `main`, root `apps/web`, Node 22.x. L'application est **distincte** de DTSC Platform ; jamais de chaîne de connexion ou de cookie partagé.

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

## Provisionnement du propriétaire (une seule fois)

Après migration sur la base cible, utiliser `pnpm --filter @bookstudio/database bootstrap:owner` en fournissant **uniquement dans l'environnement privé d'exécution** : `DATABASE_URL`, `BOOKSTUDIO_BOOTSTRAP_EMAIL`, `BOOKSTUDIO_BOOTSTRAP_NAME`, `BOOKSTUDIO_BOOTSTRAP_PASSWORD` (>=16 caractères). Ne jamais enregistrer ces valeurs dans GitHub, le chat, les captures d'écran ou les variables persistantes de Vercel.

## Procédure de publication

1. CI de toutes les PR P0 verte et validation E2E manuelle dans `docs/qa/E2E-AUTH-RELEASE.md`.
2. Planifier la migration Neon production et tester sa compatibilité sur une copie.
3. Contrôler les variables (existence et cibles, jamais leurs valeurs).
4. Fusionner la version validée dans `main` ; lever le verrou `commandForIgnoringBuildStep` seulement après autorisation finale.
5. Vérifier les logs, cookies, origine, ACL et une sauvegarde/restauration ; n'attribuer le domaine public qu'après la recette de publication.

**Ne pas considérer un build CI ou une première page Vercel comme une preuve que l'application est utilisable en production.**
