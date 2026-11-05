# E2E propriétaire v0.24.0-alpha — bibliothèque volumineuse (#138)

1. Connectez-vous sur un compte ayant **au moins 30 livres** (et si possible 120) dans un ou plusieurs workspaces autorisés ; le total global doit afficher 30/120, pas 24 ni 100.
2. Sur **Bibliothèque**, vérifier que seules **24 cartes** sont chargées au départ, avec le compteur « 24 / 120 » et « Afficher davantage ». Charger les suivantes et vérifier qu'aucune carte ne se répète.
3. Filtrer sur un type (ex. MÉDECINE), puis un statut (ex. EN RÉDACTION), rechercher un **titre** partiel et appliquer. Vérifier le nombre total filtré, le tri Modification récente et Titre A–Z.
4. Changer l'un des critères et réappliquer : le défilement repart de la première page, le curseur ancien est refusé (HTTP 400). Un filtre sans correspondance montre un état vide explicite.
5. Avec deux comptes appartenant à des espaces différents, vérifier qu'aucun titre/compteur ne fuit vers l'autre compte, y compris avec un curseur obtenu ailleurs.
6. Tester compatibilité des archives : `GET /api/v1/books?archived=1` renvoie les archives autorisées, non incluses dans les compteurs de la bibliothèque active.
7. Désactiver la connexion pendant « Afficher davantage » : cartes déjà affichées conservées, toast spécifique FR/EN, possibilité de réessayer après retour réseau.
8. Vérifier type/langue/statut sur les cartes et actions RBAC `⋯` pour OWNER/EDITOR vs VIEWER/REVIEWER. Après changement des propriétés, `router.refresh` repart de la page stable.
9. Mobile (320px, 375px, 768px), desktop, clair/sombre, clavier/lecteur d'écran : champs nommés, focus visible, filtres adaptés sans débordement, bouton accessible.
10. Vérifier CI `pnpm library-paging:check`, HTTP E2E API, typecheck/build, **documentation complète dans la PR** contrôlée par `pnpm release:check`.
11. Aucun scanner ClamAV dédié n'est installé : pas d'activation des variables ni de validation antivirus réclamée.

**Aucune fusion ni mise en production** sans E2E propriétaire `v0.24.0-alpha BON`, CI sur le SHA final documenté, snapshot Neon, `main` uniquement, Preview OFF et contrôles de production.

## E2E v0.25.0-alpha — prolongement #141

Contrôler la recherche de destination d'import parmi plus de 100 livres, le choix d'un ouvrage absent des 24 cartes initiales, la pagination de 20 résultats, l'interdiction pour VIEWER/REVIEWER et hors workspace, l'archivage concurrent et le transfert DOCX confirmé côté serveur. Vérifier les six compteurs éditoriaux et les archives sur tous les livres autorisés. Tester réseau faible, FR/EN, clavier et mobile 320px. Exiger CI verte, manifeste documentaire et E2E propriétaire BON avant toute livraison. Scanner ClamAV non installé.
