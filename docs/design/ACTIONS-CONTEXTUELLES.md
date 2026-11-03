# Système d'actions contextuelles — BookStudio AI

**Lot :** BS-025 #55 / BS-026 #56 — **état : non publié**, prochaine version alpha.

## Principe d'interface
Conserver une action primaire visible pour chaque section (ex. « Nouveau livre », « Ajouter un chapitre », « Créer une version », « Ajouter une note »). Tous les autres verbes attachés à un objet sont accessibles à partir du bouton **⋯** de cet objet ; éviter l'empilement de boutons indépendants dans les fiches, cartes et lignes de liste.

| Surface | Action principale | Menu « ⋯ » |
|---|---|---|
| Bibliothèque | Nouveau livre | Ouvrir, Renommer, Archiver… sur chaque carte |
| Fiche ouvrage | Ajouter un chapitre | Renommer, Archiver… pour le livre |
| Chapitre | Ouvrir le chapitre via le titre | Ouvrir, Renommer le chapitre… |
| Versions | Créer une version | Télécharger PDF / Word / Markdown ; Restaurer… si habilité |
| Archives | Revenir à la bibliothèque | Restaurer l'ouvrage (rôle adéquat) |
| Commentaires | Ajouter une note | Résoudre / Rouvrir le commentaire |
| Éditeur | Outils de typographie (barre dédiée, exception justifiée) | Activer/quitter concentration ; afficher/masquer panneau |
| Compte | Aucun CTA de déconnexion isolé dans l'en-tête | Recherche, Archives, Déconnexion |

### Sécurité et conformité métier
- Les menus sont une **affordance UI**, jamais une autorisation. Les routes revérifient l'utilisateur, le rôle, l'espace, le livre et l'origine de la requête.
- Un utilisateur lecteur ne voit pas les actions de modification (et l'API les refuse).
- L'archivage, la restauration historique et les actions à conséquences importantes exigent une confirmation explicite indiquant l'absence de destruction.
- Renommer un chapitre ne modifie **ni le corps du texte ni `revisionSeq`** ; une date de métadonnée obsolète déclenche HTTP 409. Même logique pour le livre.
- Pas de suppression définitive à ce stade.

### Accessibilité et interactions
- Déclencheur 40 × 40 px (36 px sur certaines grandes cartes) ; symbole « ⋯ » + `aria-label` décrivant l'objet ; `aria-haspopup=menu`, `aria-expanded`, `aria-controls`.
- Ouverture au clic, tactile, Entrée et Espace (comportement natif du bouton) ; flèches haut/bas sur déclencheur.
- Déplacement par Haut/Bas, Home/End ; Echap ferme et redonne le focus au déclencheur. Tab quitte et ferme ; clic et focus à l'extérieur ferment le menu.
- Les éléments ont `role=menuitem`, les groupes sont annoncés ou décoratifs, les actions désactivées ne sont pas exécutées.
- Contraste et contour de focus sur clavier ; danger signalé visuellement mais jamais uniquement par couleur.
- Le menu est aligné sur le bord droit de son objet, ne doit pas être coupé par les cartes ou tableaux ; largeur maximale adaptée au viewport 320 px et au zoom 200 %.
- Pendant une mutation, désactiver le menu concerné et afficher une erreur descriptive si l'action échoue.
- Le bouton contextuel est **frère et non enfant** du lien de carte ou de chapitre : jamais un `<button>` à l'intérieur de `<a>`.

### Pratiques à conserver dans les prochains modules
Créer une issue et une PR, réutiliser `ActionMenu` pour les actions secondaires et afficher une seule CTA principale par zone. Ne pas reconstituer une rangée de boutons PDF/Word/Markdown/Restaurer. Pour les nouveaux gestes, ajouter des E2E sur le parcours complet, le clavier, les rôles et les conflits ; versionner et publier seulement après validation de la release.
