# E2E v0.23.0-alpha — propriétés et progression des ouvrages (#136)

## Parcours fonctionnels

1. Se connecter comme OWNER/EDITOR. Ouvrir un ouvrage existant via sa carte ou la vue d'ensemble et son menu `⋯`. Vérifier « Modifier les propriétés… » et « Faire évoluer le statut éditorial… ».
2. Changer type **ESSAY → MEDICINE** et langue de référence **fr → en**. Vérifier carte de bibliothèque, vue d'ensemble et API. Ne jamais traduire le contenu du manuscrit, les éditions ni les snapshots.
3. Statut **DRAFT → WRITING → REVIEW**, puis **REVIEW → WRITING** ; vérifier la liste des transitions proposées, le journal d'audit et les toasts contextualisés en FR/EN.
4. Un saut **DRAFT → APPROVED/PUBLISHED** doit être refusé (HTTP 422), de même qu'une valeur arbitraire (HTTP 400). `PUBLISHED` ne doit **jamais** publier le livre sur Internet ni lancer une exportation.
5. Entre deux onglets, modifier le même ouvrage depuis l'onglet A puis depuis B : réponse HTTP 409, toast d'actualisation, aucune perte de métadonnées, texte ou révision.
6. Depuis un rôle REVIEWER/VIEWER ou un autre workspace : pas de menu éditorial, refus API. Requête sans Origin ou Origin étranger : 403. Sans session : 401.
7. Archiver un ouvrage et tenter de modifier ses propriétés ou son statut : refus 404. Restaurer et vérifier son type, sa langue et ses révisions préservées.
8. Contrôler clavier, Escape, focus visible, mobile 320/375/768 px, thèmes clair/sombre/système, connexion faible. Aucune erreur raw JSON dans les toasts.
9. Automatisé : CI GitHub Postgres tests et HTTP E2E, `pnpm typecheck`, `pnpm build`, `pnpm release:check` vérifiant les **six catégories documentaires** avant tout déploiement.
10. Confirmer **zéro migration SQL**, **zéro variable Vercel nouvelle**, aucune activation du scanner ClamAV absent.

## Politique de livraison

**Candidate non fusionnée/non déployée.** Requiert CI SUCCESS sur le SHA final **contenant la documentation**, validation propriétaire explicite `E2E v0.23.0-alpha BON`, snapshot Neon protégé, fusion `main`, Vercel production seulement, Preview OFF, contrôles READY/health/version puis journal horodaté.
