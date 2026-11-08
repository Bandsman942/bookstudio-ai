# Système d'actions contextuelles — BookStudio AI

**Lot :** BS-025 #55 / BS-026 #56 livrés en production ; extension BS-004 #5 — **v0.22.0-alpha candidate E2E approuvée, publication soumise au contrôle documentaire et CI**.

## Principe d'interface
Conserver une action primaire visible pour chaque section (ex. « Nouveau livre », « Ajouter un chapitre », « Créer une version », « Ajouter une note »). Tous les autres verbes attachés à un objet sont accessibles à partir du bouton **⋯** de cet objet ; éviter l'empilement de boutons indépendants dans les fiches, cartes et lignes de liste.

| Surface | Action principale | Menu « ⋯ » |
|---|---|---|
| Bibliothèque | Nouveau livre | Ouvrir, Renommer, Archiver… sur chaque carte |
| Fiche ouvrage | Ajouter un chapitre | Renommer, Archiver… pour le livre |
| Chapitre | Ouvrir le chapitre via le titre | Ouvrir, Créer, Renommer, **Monter / Descendre d'une position** (OWNER/EDITOR, limites de liste), Retirer réversiblement… |
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

## Réorganisation structurelle (v0.22)

Une action Monter/Descendre déplace seulement la **position** d'un chapitre. Le menu est désactivé aux extrémités ou pour un lecteur. L'éditeur exige de résoudre les changements locaux avant de naviguer ; la vue d'ensemble peut déclencher l'action directement. L'API `PATCH /api/v1/books/{bookId}/chapters/reorder` accepte `chapterId`, `direction: up|down` et `expectedOrderToken` obtenu par `GET /api/v1/books/{bookId}/chapters`. Le serveur revérifie RBAC/CSRF, renvoie 409 si l'ordre a changé, et échange les positions au moyen d'une position sentinelle libre pour respecter la contrainte SQL `UNIQUE(manuscript_id,position)`. Texte, révisions, commentaires et snapshots ne changent pas. Une restauration depuis la corbeille ajoute le chapitre en fin d'ouvrage.

## Correctif v0.28.0-alpha — reproduction vidéo #151

**Vidéo propriétaire du 8 novembre 2026, onglet Bibliothèque :** le menu ⋯ fonctionne, mais après **Modifier les propriétés** le dialogue commence dans une colonne de la largeur de la carte, partiellement tronqué, puis revient au centre quand la souris quitte la carte.

**Cause technique confirmée dans le code :** `.book-card:hover{transform:translateY(-4px)}` crée un bloc de référence pour un descendant `position:fixed`, et `.book-card{overflow:hidden}` le coupe. `BookActionsMenu` rendait la modale dans cette carte, contrairement au menu `ActionMenu` déjà portalisé.

**Solution :** les quatre dialogues de livre (renommer, propriétés, statut, archiver) passent par `createPortal(...,document.body)`. Le calque `book-actions-overlay` occupe le viewport, au-dessus des cartes et menus, avec bordures safe-area, défilement interne mobile et verrou du scroll de fond. Le déclencheur ⋯ conserve son comportement discret, hover/focus et clavier. Tester ouverture puis déplacement de souris sur la couverture **sans repositionnement ni clignotement**.

**Garde de régression :** `pnpm ui:check` teste le portail et le calque overlay. E2E manuel 320/375/768/1364px, zoom 200 %, hover, clic droit, Escape, bouton Fermer, erreurs/confirmations RBAC et absence de scroll sous la modale.
