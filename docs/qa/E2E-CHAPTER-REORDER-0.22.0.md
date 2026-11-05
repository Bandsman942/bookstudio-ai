# Recette E2E v0.22.0-alpha — structure des chapitres (#5)

1. Ouvrir un livre de 13 à 30 chapitres sur ordinateur et mobile 320px/375px.
   Dans chaque ligne `⋯`, vérifier « Monter » / « Descendre » avec
   actions indisponibles en première/dernière position.
2. Déplacer le chapitre 13 d'une position vers le haut puis vers le bas.
   Vérifier les numéros et ordre visibles dans la vue d'ensemble, sa
   barre de navigation et l'éditeur, après rechargement complet.
3. Vérifier un chapitre contenant 10 000 mots, des commentaires, plusieurs
   révisions et un snapshot antérieur : déplacer sans perdre **aucun**
   caractère, commentaire, version ou citation.
4. Avec deux onglets éditant l'ordre en même temps : le premier réussit,
   le second obtient un toast de conflit contextualisé (409), peut
   actualiser et réessayer sans perte de structure.
5. Roles : OWNER/EDITOR peuvent réordonner ; REVIEWER/VIEWER/outsider
   ne voient pas la commande et ne peuvent pas modifier l'ordre par API.
   Vérifier CSRF 403 et requêtes anormales 400.
6. Retirer puis restaurer un chapitre et vérifier qu'il réapparaît à la
   fin du manuscrit sans position dupliquée.
7. Sur l'éditeur, saisir un texte non enregistré et tenter « Monter » :
   la commande est bloquée jusqu'à confirmation de sauvegarde.
8. Tester thèmes clair/sombre, FR/EN, souris, clavier (menu Shift+F10),
   tactile et réseau faible ; menus ne doivent pas être coupés.
9. CI GitHub typecheck/build/tests/E2E HTTP vert ; politique main-only,
   Preview OFF, snapshot Neon avant production.

**Après E2E propriétaire BON seulement** : fusion puis livraison.

## Validation consignée

Propriétaire : **E2E v0.22.0-alpha BON**, 5 novembre 2026. CI #175 a d'abord échoué sur l'unicité `(manuscript_id,position)` ; un échange par position temporaire a corrigé l'échec. **CI #176 SUCCESS** au SHA fonctionnel `0b786e4e0f40b044097a9b3e46a73eaff4deebe2`. Toute mise à jour documentaire avant déploiement requiert une nouvelle CI verte sur le SHA final de la PR. Aucune analyse EICAR réelle n'est comprise dans cette recette ; scanner dédié non installé.
