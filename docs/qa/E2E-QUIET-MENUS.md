# E2E — Boutons contextuels ⋯ discrets et accessibles (#65)

1. Sans survol ni focus, tous les boutons « ⋯ » de la bibliothèque, fiches, chapitres, versions, commentaires, archives, éditeur et compte doivent avoir un **fond transparent**, sans contour visible et sans ombre.
2. Sur une carte de couverture, le bouton se fond dans la carte ; il n'ajoute pas une pastille blanche.
3. Survol souris : retour d'une surbrillance légère et d'une bordure cohérente, sans décalage de mise en page.
4. Clavier : tabuler jusqu'au bouton, vérifier un contour **visible** (focus visible) et un fond contrasté. Entrée/Espace ouvrent le menu, Échap le ferme.
5. Menu ouvert : le bouton reste en évidence même lorsque le pointeur part vers les options.
6. Test mobile tactile : 320, 375, 768 px ; cible de clic suffisante, menus non coupés.
7. Test de zoom 200 % ; lecteurs d'écran et `aria-expanded` inchangés.
8. Refaire les mêmes tests en thème sombre quand celui-ci sera ajouté au lot suivant.

Critère : modification uniquement cosmétique, aucune suppression de contrôle métier ni changement de permissions. Cette issue ne peut pas être qualifiée « publiée » avant la release v0.7.0 validée.
