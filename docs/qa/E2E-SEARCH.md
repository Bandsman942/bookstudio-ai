# Recette E2E — recherche plein texte privée (BS-005b)

**Version cible : prochaine version mineure après v0.2.0-alpha.** Ne pas tester sur un manuscrit sensible tant que la procédure de restauration de sauvegarde n'a pas été exercée.

1. Connectez-vous à un compte A et créez deux chapitres d'un même livre, avec un mot inhabituel dans le premier, par exemple « mitochondrie » ; attendez l'indicateur **Enregistré**.
2. Ouvrez **Bibliothèque → Recherche**, entrez « mitochondrie » et cliquez Rechercher. Le résultat doit afficher le titre du livre, le chapitre concerné, un extrait du texte et la révision enregistrée.
3. Cliquez sur le résultat : il doit ouvrir le chapitre voulu.
4. Modifiez le chapitre A pour retirer complètement le mot et sauvegardez. Une nouvelle recherche ne doit plus afficher cette occurrence (recherche des **révisions actuelles**, pas l'historique).
5. Restaurez une version contenant le mot ; une nouvelle recherche doit retrouver le passage, à sa nouvelle révision.
6. Avec un compte B sans accès au livre A, recherchez ce mot : aucun résultat du livre A ne doit apparaître, même avec l'identifiant de projet connu.
7. Sans session, un appel à `/api/v1/search?q=mitochondrie` doit répondre **401**.
8. Une requête trop courte (un seul caractère), trop longue (>80) ou contenant un caractère de contrôle doit répondre **400**.
9. Recherchez littéralement `%_` : aucun wildcard SQL ne doit faire apparaître tous les livres.
10. Vérifiez clavier, états vide/erreur/chargement et affichage sur mobile 320 px, tablette 768 px, ordinateur 1440 px.

**Limites connues :** recherche sous-chaîne insensible à la casse SQL dans le texte des dernières révisions enregistrées. Pas de recherche vectorielle ni d'extraits d'anciens snapshots. Le corpus long et la performance doivent être mesurés avant une ouverture commerciale.

**Déploiement :** CI verte + recette E2E + version SemVer et note de déploiement. Aucun changement de production par la simple création de cette PR.
