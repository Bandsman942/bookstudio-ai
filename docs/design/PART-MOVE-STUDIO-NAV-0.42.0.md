# Conception — déplacement des parties et navigation Studio v0.42.0-alpha

## Partie déplacée en bloc (BS-005g #195)

L'ordre canonique du manuscrit reste la liste des **chapitres actifs** triés par `(position,id)`. Une partie persistante (`ManuscriptPart`) désigne une plage **contiguë** et non un conteneur de texte. L'algorithme pur `movePartBlock` identifie la plage de la partie, puis échange sa position avec la plage immédiatement voisine : autre partie **ou** groupe de chapitres non affectés. L'algorithme rejette les groupes fragmentés, l'ID absent, une partie vide ou les bords ; il ne modifie pas les objets JavaScript en entrée. `partBlockPositionChanges` remappe les IDs de chapitres aux **slots de position précédemment occupés par les chapitres actifs**, en laissant les trous des chapitres supprimés intacts.

API `PATCH /api/v1/books/{bookId}/parts/{partId}/move`, JSON strict `{direction:'up'|'down', expectedEditionId:UUID, expectedOrderToken:SHA256}`. L'utilisateur doit être OWNER/EDITOR du même workspace. Les vérifications d'Origin, édition courante, livre actif et existence de la partie sont refaites sous verrou PostgreSQL `FOR UPDATE` sur `books` et transaction `Serializable`. Avant toute écriture, recalculer le jeton `partMoveToken` via les IDs/**positions ET partId** des chapitres actifs ; conflit = 409 sans mutation. Ce jeton spécifique est exposé dans `GET /parts` et évite de réutiliser celui du réordonnancement de chapitre seul. Maximum 2000 chapitres actifs et capacité int32 des nouvelles positions temporaires.

La contrainte unique `(manuscript_id,position)` inclut **aussi les chapitres retirés**. Une affectation directe de positions permutées échouerait. Il faut donc deux requêtes paramétrées dans **une seule transaction** :

1. Garer uniquement les lignes actives concernées dans des positions temporaires **uniques et supérieures au maximum** de toutes les positions du manuscrit, en contrôlant leur position initiale.
2. Les replacer dans les emplacements actifs d'origine, selon la permutation calculée. Contrôler le nombre exact de lignes dans les deux phases ; tout défaut = rollback intégral.

`updated_at` des lignes déplacées suit la mutation des métadonnées ; **`revision_seq` et la table immuable `document_revisions` ne changent jamais**. Aucun objet `storage`, snapshot, commentaire, import ou attestation ClamAV n'est déplacé. Le livre reçoit un `updated_at`, l'audit enregistre `{bookId,direction,chaptersMoved}` sans titre/prose. Le client réactualise la vue d'ensemble et le sommaire ; un jeton devenu périmé avertit l'auteur avant de recommencer.

## Studio à trois zones de défilement (BS-005h #196)

Le Studio est une **application de viewport** : `.studio` fixé à `inset:0; height:100dvh`, et non un document dont le `body` est le quatrième conteneur scrollable. Les colonnes enfant sont `min-height:0`, avec trois scrolls indépendants :

- Gauche : `.studio-sidebar` flex colonne. Le contexte du livre occupe un espace borné et **scrollable à part** s'il déborde ; onglets Chapitres/Sections visibles ; la liste de navigation bénéficie du reste de la hauteur avec `min-height:0` et `overflow-y:auto`. Pied compact n'écrasant pas la liste.
- Centre : ruban et statut d'enregistrement fixés par le flux flex ; `.editor-scroll` reçoit le reste de la hauteur. Zoom, brouillons, actions du ruban et ProseMirror restent inchangés.
- Droite : `.studio-insights` scrollable indépendamment, conserve notes et commentaires jusqu'en bas.

En-dessous de 900px, la gauche reste cachée hors hamburger et s'ouvre comme un tiroir plein viewport, avec list scrollable et safe areas ; la droite s'ouvre par étincelles, exclusivement. Focus/voile/Escape/lecture seule/protection des brouillons sont inchangés. Si `extractChapterSectionOutline` ne trouve aucun **node heading** H1/2/3 réel, afficher un guide sur les styles Word-like et un lien de repli vers le sommaire global dont le clic passe par `protectNavigation`. Ce n'est **pas** une extraction de sections IA depuis des paragraphes.

## Contrôles et limites

Unitaires : permutations, non-affectés, continuité, slots exacts et immutabilité ; contrat CSS/JSX (viewport, trois scrolls, état vide, mobile). HTTP E2E : session, workspace, Origin, édition et jeton, move/reverse, 409 sans mutation, décompte de révisions inchangé. CI : version/doc, UI/perf, Prisma, API PostgreSQL, types/build. **Recette manuelle obligatoire** bureau (dont la capture propriétaire avec espace vide), Android Chrome 320–390px, tablette, zoom 125–200%, lots 13+ chapitres et vrai document avec ou sans H1–H3. Pas de nouveau scan/IA, ClamAV OFF.
