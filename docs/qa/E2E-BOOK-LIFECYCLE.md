# E2E — cycle de vie réversible des ouvrages (issue #50)

**Version cible :** prochaine mineure après `v0.3.0-alpha`. La présente fonctionnalité ne doit pas être présentée comme déployée avant sa release versionnée.

1. Depuis la bibliothèque, ouvrir un ouvrage et choisir **Renommer** ; indiquer un titre différent et enregistrer. Vérifier le titre dans la vue d'ensemble et dans la bibliothèque.
2. Depuis deux onglets, tenter une modification avec une ancienne date de version : le backend répond **409 BOOK_CONFLICT**, sans écraser le nouveau titre.
3. Dans la fiche du livre, choisir **Archiver**, lire l'explication et confirmer. Le livre doit disparaître de la bibliothèque principale et de la recherche, mais ses révisions, snapshots, commentaires et chapitres doivent rester intacts.
4. Ouvrir **Bibliothèque → Archives**, puis **Restaurer**. Le livre revient dans la bibliothèque avec son titre, ses chapitres, ses snapshots et ses contenus originaux.
5. Sur le compte B sans rôle dans l'espace A : toute tentative de renommer, archiver ou restaurer un livre A répond **404**, et le livre A ne figure pas dans ses archives.
6. Sans session : **401**. Requête de modification sans origine HTTPS autorisée : **403**. Nouveau titre invalide : **400**.
7. Sous rôle VIEWER : lecture autorisée, contrôles de modification/archivage/restauration absents ; appels API refusés.
8. Interface : modales lisibles, boutons Annuler/Fermer, pas de suppression permanente. Tester 320, 768 et 1440 px, parcours clavier et messages de conflit.

**Limites :** aucun effacement définitif ; les ouvrages archivés ne sont pas accessibles tant que la restauration n'a pas été effectuée. L'audit des trois opérations est conservé sans manipulation du texte des manuscrits.

**Gate de livraison :** CI verte, E2E utilisateur déclaré bon pour cette version, numéro SemVer, journal, backup Neon et vérification post-déploiement. Aucun déploiement automatique depuis la PR.
