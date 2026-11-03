# Recette E2E — Ruban d'édition professionnel FR/EN et thèmes (version candidate après v0.6.0)

**Statut : non publié ; E2E utilisateur obligatoire avant prochaine release.**
La validation automatisée ne remplace pas un vrai essai en session utilisateur.

1. Ouvrir un chapitre en mode éditeur. Vérifier **Accueil** et **Insertion** ; l'ancienne barre « Titre 1 / Titre 2 / G / I / Liste » ne doit plus être visible. Les éléments sont regroupés, pas dispersés.
2. Dans **Accueil** : essayer Normal, Titre 1, 2 et 3 ; gras, italique, souligné, barré, code inline ; désactiver/réactiver et vérifier les états actifs des boutons au déplacement du curseur.
3. Dans les paragraphes : liste à puces et numérotée, citation, bloc de code ; effacer la mise en forme et annuler/rétablir. Le texte ne doit pas être supprimé involontairement.
4. Dans **Insertion** : créer un lien sur une sélection puis un lien sans sélection ; vérifier la présence du texte et l'URL ; retirer le lien. Refuser `javascript:`, `data:`, `file:`, entêtes CR/LF et URL comportant des identifiants HTTP.
5. Insérer un séparateur horizontal et un saut de ligne ; sauvegarder, changer de chapitre, revenir : contenu et formatage doivent persister, sans régression de `revisionSeq`.
6. Créer une **version nommée** ; exporter DOCX et ouvrir dans Microsoft Word ou LibreOffice pour confirmer les titres, les liens cliquables et le soulignement. Vérifier Markdown et PDF pour la lecture et les liens autorisés ; aucune URL dangereuse dans les fichiers.
7. Avec un rôle **VIEWER**, aucun ruban de modification ne doit apparaître ; tentative API de modification toujours refusée.
8. **Clavier** : Tab, flèches de navigation adaptées aux onglets, Entrée/Espace, Échap pour fermer le dialogue de lien. Focus net dans les deux thèmes. Tester lecteurs d'écran si possible.
9. **Mobile** 320/375/768 px, zoom 200 % : ruban défilant horizontalement, aucune action coupée ou chevauchée et frappe du texte possible avec clavier virtuel.
10. **Langues** : français/anglais depuis les menus de préférences ; titres, descriptions et commandes suivent la langue sans changer la langue du contenu du livre.
11. **Thèmes** : clair, sombre, système ; les boutons actifs, le ruban, les champs du dialogue et la page de texte restent lisibles, et les boutons « ⋯ » demeurent transparents au repos mais visibles au focus clavier.
12. **Réseau faible** : Slow 3G, puis hors-ligne/retour réseau ; le ruban ne doit pas relancer un fetch par clic et l'autosauvegarde ne doit pas perdre les nouvelles marques, ni afficher « Enregistré » avant confirmation du serveur.
13. **Non-régression** : commentaires, snapshots, versions, recherche, archives, permissions, logout. Les exports DOCX/PDF/Markdown doivent fonctionner comme avant.

**Livraison** : CI réussie, tests d'intégrité, E2E complet déclaré bon par le propriétaire, snapshot Neon, publication privée sur `main`, tag SemVer et journal de déploiement après READY. Aucune fusion de la release ni déploiement sur simple validation technique d'une PR.
