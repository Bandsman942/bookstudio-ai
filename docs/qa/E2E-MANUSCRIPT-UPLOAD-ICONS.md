# E2E — v0.10.0-alpha : import manuscrit visible et icônes

**Précondition :** espace alpha privé, deux comptes (OWNER/EDITOR et VIEWER), ouvrages avec droits différents, bucket Supabase privé `Uploaded_books`. Aucun manuscrit sensible réel avant antivirus et restauration.

1. **Bibliothèque :** le bouton « Importer un manuscrit » est immédiatement visible, sans ouvrir un livre ou chercher en bas de page. La carte d'import peut aussi ouvrir le même parcours.
2. **Nouveau compte sans livre :** importer ouvre l'explication « créez d'abord un livre » et un bouton vers la création. Aucun transfert orphelin ni accès interdit.
3. **Propriétaire :** sélectionner un ouvrage éditable et un DOCX puis valider. DevTools : POST signé vers l'API BookStudio, binaire PUT directement à `*.supabase.co`, POST `action=confirm`; vérifier l'objet dans le bucket et redirection vers `#book-source-files`.
4. **Dans la fiche ouvrage :** « Importer un manuscrit » dans l'en-tête et panneau de sources juste après le titre, AVANT les chapitres. Tester le bouton et le glisser-déposer PDF, ainsi que la lecture/téléchargement signé et suppression avec confirmation.
5. **Permissions :** un VIEWER peut voir ses sources autorisées mais ne peut ni envoyer ni supprimer. La bibliothèque ne lui propose aucun ouvrage non modifiable comme destination. API interdit cross-book, accès anonyme et origine malveillante.
6. **Erreurs et lenteur :** .exe, fichier >20 Mio, réseau coupé, métadonnées non conformes et source manquante. Afficher l'erreur exacte, jamais un faux succès ni fuite de clé secrète. Réessayer; l'éditeur conserve ses révisions.
7. **Icônes :** vérifier Bibliothèque, Recherche, Archives, Modèles, projet, chapitres, Sources, Versions, Commentaires, ruban ; alignement uniforme et noms lisibles, aucun glyphe illisible.
8. **Accessibilité et responsive :** clavier tab/enter/escape, focus visible, lecteur d'écran label de fichiers, glisser-déposer facultatif, 320/375/768/1440px, zoom 200 %, thèmes clair/sombre/système, FR/EN.
9. **Non-régression :** création/renommage/archivage livre, édition autosauvegardée faible réseau, commentaires, snapshots, export Word/PDF et recherche. Aucune conversion fichier→chapitre n'est annoncée.

**Publication :** E2E propriétaire v0.10.0-alpha BON obligatoire avant merge, pas de preview, deploy `main` seulement, snapshot Neon et journal READY.
