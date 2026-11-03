# Politique de versions et de déploiements — BookStudio AI by DTSC

**Versionnement obligatoire :** `vMAJOR.MINOR.PATCH` selon Semantic Versioning 2.0.

## Conventions
- `v0.x.y` : produit alpha/bêta, architecture ou contrats encore en évolution. Exemple : `v0.1.0`.
- `v1.0.0` : première disponibilité générale, uniquement après validation de **tous** les critères P0, sécurité, sauvegardes/restauration réelles, import/export, E2E de publication et validation humaine.
- `PATCH` `v1.0.1` : correction compatible, sécurité ou fiabilité.
- `MINOR` `v1.1.0` : nouvelle fonctionnalité rétrocompatible.
- `MAJOR` `v2.0.0` : incompatibilité de contrat de données ou d'API documentée.
- Préversions autorisées : `v1.0.0-rc.1`, `v1.0.0-rc.2`. Ne pas publier `v1.0.0` sans recette finale.

## Source de vérité
- `release.json` : version souhaitée / canal / tag Git / état (pending-deployment ou deployed).
- `package.json` et `apps/web/package.json` : version identique, vérifiée en CI.
- `/api/version` : version du produit et SHA de commit fourni par Vercel, **sans secrets**.
- `CHANGELOG.md` : historique chronologique des changements réellement livrés.
- `docs/releases/vX.Y.Z.md` : fiche autonome par déploiement (ou correction de version).
- Tag Git annoté `vX.Y.Z` : **après** preuve de déploiement réussi sur le commit SHA exact. Ne jamais avancer un tag déjà publié.

## Processus de version
1. PR avec issue, tests, E2E automatisés et notes `[Non publié]`.
2. Choisir le numéro SemVer compatible, mettre à jour `release.json`, les deux package.json et la fiche `docs/releases/vX.Y.Z.md`.
3. La CI exécute `pnpm release:check` : versions cohérentes, fiche existante et références de PR.
4. Valider E2E en environnement protégé et obtenir le feu vert humain approprié.
5. Vérifier les variables requises, les migrations de schéma et la sauvegarde/rollback **avant** de lever le verrou Vercel.
6. Déployer uniquement `main`; les previews automatiques restent désactivées ; interdire les builds non autorisés.
7. Vérifier que Vercel signale READY pour **le commit et la version attendus**, et refaire les vérifications post-déploiement.
8. Écrire l'ID exact du déploiement, l'URL réelle, le SHA Git, la date UTC et les résultats des tests dans `docs/releases/vX.Y.Z.md`, puis déplacer `status` à `deployed` dans un PR dédié. Si le déploiement échoue, documenter l'échec, ne pas annoncer « déployé ».
9. Créer un tag Git `vX.Y.Z` pointant sur le commit effectivement déployé. Le document de suivi postérieur doit référencer ce SHA, **sans changer le code applicatif du release déjà testé**.
10. Publier une note de livraison synthétique avec corrections, risques et décision éventuelle. Après toute mise en ligne ultérieure, procéder de même.

## Invariants de sécurité
- Le dépôt est public, les manuscrits sont privés ; aucun identifiant Neon, cookie, contenu de manuscrit ou chaîne `DATABASE_URL` dans le GitHub/changelog/logs.
- Une CI verte n'est **pas** une preuve d'E2E humain ou de déploiement.
- Ne pas rendre public un environnement insuffisamment durci ni activer `BOOKSTUDIO_PUBLIC_SIGNUP` avant audit.
- Ne jamais marquer une migration comme appliquée si seule une base PostgreSQL de CI l'a exécutée.
- Rollback du code : déploiement précédent connu et testé ; DB : migrations compatibles / procédure restauratrice vérifiée, jamais `DROP` automatique sur production.
- Les noms de branches, états de PR, URL de publication et SHA doivent être vérifiés à chaque livraison.

## Règle de documentation
**Un déploiement Vercel Production = une fiche de déploiement documentée**, même pour un hotfix ou un rollback. Le `CHANGELOG.md` décrit les modifications fonctionnelles ; la fiche de déploiement est l'historique technique et d'audit.
