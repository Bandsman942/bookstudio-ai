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
