# Recette E2E — menus contextuels « ⋯ » et renommage de chapitre

**Candidat :** prochain lot alpha **non déployé**. Le test des APIs n'est pas une preuve de bon fonctionnement tactile ou du focus clavier.

1. **Bibliothèque — ordinateur :** chaque carte présente un bouton « ⋯ » distinct du lien vers le livre. Son menu contient « Ouvrir », « Renommer » et « Archiver » pour un éditeur ; le menu ne s'ouvre pas en cliquant sur la couverture. La création d'un livre reste le seul CTA principal.
2. **Fiche livre :** cliquer sur « ⋯ », puis Renommer. Confirmer le nouveau titre ; actualiser ; vérifier le titre et les chapitres inchangés. Ouvrir Archiver… et annuler, puis confirmer dans un cas de test ; le livre doit apparaître dans Archives.
3. **Chapitres :** ouvrir le « ⋯ » d'un chapitre, choisir Renommer, saisir un titre ; contrôler que le texte et le compteur de révision sont **inchangés**. Deux onglets ou une ancienne date de mise à jour doivent provoquer HTTP **409** avec un message utile. Un autre compte sans autorisation doit recevoir **404** ; sans origine, **403**.
4. **Versions :** ouvrir le menu à droite de la ligne. Télécharger PDF, Word et Markdown ; chacun doit conserver son format. Restaurer… doit afficher une **confirmation non destructive** ; Annuler n'envoie aucune requête de restauration. Confirmer doit conserver l'historique.
5. **Commentaires :** menu à droite de chaque commentaire, action « Résoudre » puis « Rouvrir » ; le changement doit persister et ne pas modifier le texte du livre.
6. **Archives :** le « ⋯ » de l'ouvrage permet Restaurer ; l'ouvrage revient dans la bibliothèque et son contenu est préservé. Un simple lecteur voit la mention « Lecture seule ».
7. **Éditeur :** les deux options « Mode concentration » et « Panneau éditorial » figurent dans un seul menu ; la barre de mise en forme reste disponible lorsque le rôle est éditeur. Un lecteur ne doit pas pouvoir modifier ni auto-enregistrer le texte.
8. **Compte :** ouvrir les actions du compte en haut, retrouver Recherche, Archives et Déconnexion ; cette dernière doit réellement révoquer la session.
9. **Clavier :** Tab sur déclencheur, Entrée/Espace pour ouvrir, Haut/Bas/Home/End pour naviguer, Echap pour refermer avec retour du focus, Tab pour sortir. Clic à l'extérieur ferme. Nom du bouton annoncé correctement par lecteur d'écran.
10. **Responsive & zoom :** vérifier 320, 375, 768 et 1440 px, zoom 200 %, navigation tactile, menus proches du bord droit et en bas de liste. Aucun item ne doit être caché par une carte `overflow:hidden`, ni se chevaucher avec un autre menu.
11. **Concurrence et RBAC :** déclencher 409 sur livre et chapitre obsolètes, vérifier un utilisateur avec rôle VIEWER, et confirmer le refus API pour toute action non autorisée.

## Critères de passage
Aucune régression sur création de livre, sauvegarde automatique, snapshots, export PDF/DOCX/MD, commentaires et archives. L'interface doit rester lisible, les modales doivent être annulables et aucune suppression définitive ne doit être accessible. Validation E2E du propriétaire **requise avant fusion de la release et publication en production**.
