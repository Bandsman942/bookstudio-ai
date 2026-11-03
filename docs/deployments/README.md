# Registre chronologique des déploiements BookStudio AI

Ce dossier est l'historique des déploiements **réels**, distinct du `CHANGELOG.md` fonctionnel.

- À chaque mise en ligne Vercel Production **ou rollback**, créer `docs/deployments/YYYY-MM-DDTHH-MM-SSZ_vX.Y.Z.md` à partir de `TEMPLATE.md`.
- Compléter l'ID réel du déploiement, URL, commit, date UTC, état Vercel, variables vérifiées (présence seulement), migration, tests E2E, contrôles post-déploiement.
- Si le build échoue, enregistrer l'échec et la cause ; ne jamais annoncer le projet comme publié.
- Revenir sur la version des fichiers doc après déploiement via une PR et **réactiver le verrou de déploiement** avant toute fusion documentaire, pour éviter un nouveau déploiement inutile.
- Ne jamais inclure de manuscrit privé, chaîne de connexion ou jeton dans les fiches.

**Premier déploiement READY :** `2026-11-03T12-23-04Z_v0.2.0.md`. Une tentative préalable a échoué, documentée dans `2026-11-03T12-17-36Z_v0.2.0_FAILED.md`. La production est une alpha protégée, non une disponibilité commerciale.

**Deuxième déploiement READY :** `2026-11-03T13-18-20Z_v0.3.0.md` ; recherche privée et commentaires, migration additive après snapshot/reprise testée. Le site reste privé sous Vercel Authentication.

**Troisième déploiement READY :** `2026-11-03T13-44-30Z_v0.4.0.md` ; renommage, archivage et restauration réversibles. CI et recette propriétaire validées ; snapshot Neon avant publication. Production privée toujours protégée.

**Quatrième déploiement READY :** `2026-11-03T15-49-26Z_v0.6.0.md` ; mode réseau faible, réduction des requêtes, région Vercel `pdx1` confirmée et snapshot préalable.
