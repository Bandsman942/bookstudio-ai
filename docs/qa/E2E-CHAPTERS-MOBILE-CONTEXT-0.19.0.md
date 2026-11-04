# Recette E2E v0.19.0-alpha — chapitre et ergonomie (#127)

## Fonctionnel
1. Ouvrir un ouvrage de 13 à 30 chapitres sur desktop et mobile (320, 375, 760, 1024 et 1440 px). Vérifier le scroll **seulement dans la liste** Manuscrit, les chapitres du bas accessibles et le chapitre sélectionné visible après navigation.
2. Sur mobile, ouvrir le tiroir « Chapitres » (bouton ☰), changer de chapitre, fermer avec Escape/le fond puis utiliser « Vue d’ensemble » sans perdre l’accès à la navigation.
3. Chaque ligne chapitre de gauche, vue d’ensemble et navigation latérale de l’ouvrage propose `⋯`. Sur desktop, le clic droit et Shift+F10 ouvrent le même menu près du pointeur, sans débordement vertical/horizontal ; sur mobile, le toucher `⋯` ouvre un menu utilisable, même sur la dernière ligne en bas d’une liste.
4. OWNER/EDITOR : ouvrir, renommer, ajouter, retirer un chapitre puis le restaurer dans « Chapitres retirés ». Vérifier le titre, les révisions, les commentaires, les imports associés et les versions historiques après restauration.
5. REVIEWER/VIEWER : lecture du chapitre, pas de commandes d’ajout, renommage, retrait ou restauration. Tester aussi API directe pour garantir 403/404, CSRF, conflits de versions et cross-tenant.
6. Après retrait : chapitre absent de la recherche active et de la sidebar, lien direct inopérant, mais export d’une version enregistrée avant retrait toujours possible. Restaurer explicitement le chapitre avant de restaurer une version qui le contient.
7. Tester raccourcis Ctrl/Cmd+S, Ctrl/Cmd+Shift+O/K/N, Alt+Shift+M, Alt+Shift+↑/↓, Shift+F10 et ? ; conserver le clic droit natif dans l’éditeur, les champs de saisie et les actions clavier Tiptap (annuler/rétablir, gras, italique).
8. Tester thème clair/sombre, FR/EN, clavier seul, navigation au focus, labels, retours toasts contextualisés et absence de perte de brouillon en connexion faible.

## Publication
CI GitHub tests+typecheck+build et E2E HTTP, puis **E2E v0.19.0-alpha BON** du propriétaire. Migration additive et snapshot Neon avant fusion; Vercel production uniquement sur main, aucune Preview.
