# Registre chronologique des déploiements BookStudio AI

Ce dossier est l'historique des déploiements **réels**, distinct du `CHANGELOG.md` fonctionnel.

- À chaque mise en ligne Vercel Production **ou rollback**, créer `docs/deployments/YYYY-MM-DDTHH-MM-SSZ_vX.Y.Z.md` à partir de `TEMPLATE.md`.
- Compléter l'ID réel du déploiement, URL, commit, date UTC, état Vercel, variables vérifiées (présence seulement), migration, tests E2E, contrôles post-déploiement.
- Si le build échoue, enregistrer l'échec et la cause ; ne jamais annoncer le projet comme publié.
- Revenir sur la version des fichiers doc après déploiement via une PR et **réactiver le verrou de déploiement** avant toute fusion documentaire, pour éviter un nouveau déploiement inutile.
- Ne jamais inclure de manuscrit privé, chaîne de connexion ou jeton dans les fiches.

**À ce jour : aucune fiche de déploiement réel.** L'application est configurée sur Vercel mais aucun déploiement n'a encore été lancé.
