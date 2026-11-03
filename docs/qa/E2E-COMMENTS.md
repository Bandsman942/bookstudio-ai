# Recette E2E — commentaires éditoriaux simples (issue #44)

**Environnement recommandé :** développement isolé ou future version alpha protégée, jamais manuscrit sensible avant restauration contrôlée.

1. En compte A, créer un livre et un chapitre, puis rédiger et attendre **Enregistré**.
2. Dans le panneau de droite **Commentaires**, ajouter « Corriger la bibliographie ». La note doit apparaître avec nom, date et état **Ouvert**.
3. Modifier le texte du chapitre et attendre la nouvelle révision. La note existante doit afficher **⚠ À revoir · ancienne révision N**, sans rattacher automatiquement l'extrait à un autre passage.
4. Marquer la note **Résolu**, recharger : elle doit rester résolue et dater de sa révision d'origine ; pouvoir la rouvrir.
5. Connecter un compte B non membre au même livre : les listes et opérations de commentaire du livre A doivent retourner **404**.
6. Vérifier l'API : une création sans origine autorisée retourne **403** ; une base de révision obsolète **409** ; un commentaire trop court **400**.
7. Pour une ancre avec quote et offsets, la citation doit correspondre exactement au texte de la révision ; sinon HTTP **409**. Ne pas accepter un rattachement probabiliste.
8. Un rôle simple lecteur peut consulter les commentaires sans ajouter ou résoudre.
9. Vérifier le texte avec caractères spéciaux `<script>` : il doit s'afficher comme texte, jamais exécuter un script.
10. Tester sur 320 / 768 / 1440 px et au clavier ; champ textarea visible et lisible dans le panneau.

**Limites :** commentaires généraux sur chapitre disponibles via l'interface ; le backend peut conserver citation+offsets mais l'outil de sélection/annotation inline n'est pas encore livré. Pas de coédition Yjs, pas de notifications externes dans ce lot.

**Gate :** aucune migration production sans CI verte, sauvegarde Neon, version SemVer, recette sur l'environnement de test et note de déploiement.
