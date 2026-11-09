# BS-005c — Sommaire dynamique des sections H1–H3 du chapitre (v0.38.0-alpha)

## Objectif

Suite du cahier des charges §5.1 et de l'issue P0 [#183](https://github.com/Bandsman942/bookstudio-ai/issues/183) : améliorer la navigation dans de longs chapitres sans remplacer ni réécrire leur texte. La tranche v0.38 propose un **plan de sections dynamique du chapitre actuellement ouvert**, consultable depuis le même menu gauche du Studio. Les structures « parties », les plans inter-chapitres complets et la génération de table des matières pour export sont des lots ultérieurs distincts.

## Données et cohérence

- Le document actif reste l'instance Tiptap/ProseMirror déjà ouverte dans le Studio ; **aucun nouvel endpoint, stockage, index, analyse IA, travailleur ou migration**.
- Fonction pure `extractChapterSectionOutline(editor.state.doc,filter,limit)` : parcours en profondeur `doc.descendants`, nœuds `heading` avec `attrs.level` strictement 1, 2 ou 3 et `textContent.trim()` non vide ; extraction du titre et de la **position native ProseMirror** dans l'ordre réel du document. Ne lit ni n'écrit aucune ancienne révision ni source/import.
- La recherche dans les titres est locale, sensible aux accents et **insensible à la casse**, sans expression régulière. `filter` ≤100 caractères, sans contrôle/saut de ligne. Maximum **300 titres affichés simultanément**, avec `matches` calculé sur le document entier et `hasMore` explicite. L'interface affiche « N sur M » et demande d'affiner le filtre lorsque M > 300, afin de ne **jamais cacher silencieusement des sections**. Une recherche filtrée permet d'atteindre n'importe quel titre du document.
- L'index est recalculé lorsque Tiptap émet `update` (texte ou niveau de titre), et à chaque modification du filtre. Il inclut les brouillons locaux, dont la persistance reste gérée par l'autosauvegarde **existante**.
- `sameSectionAtPosition` compare au moment du clic la position, le niveau et le titre dans le **document actif**, empêchant de naviguer vers une section différente après un déplacement/une édition concurrente locale.

## Navigation, éditabilité, sécurité des manuscrits

- Le panneau gauche du Studio affiche deux boutons accessibles **« Chapitres »** et **« Sections »**, avec `aria-pressed` et une seule zone scrollable à la fois. L'onglet Chapitres conserve **toutes les options et menus contextuels ⋯**, l'onglet Sections propose les titres du chapitre actif indentés en fonction de H1/H2/H3, filtre, nombre de résultats et message si aucun titre. Le lecteur VIEWER/REVIEWER peut utiliser les deux parcours en lecture seule ; aucun contrôle d'édition n'est ajouté.
- Choisir une section exécute seulement `editor.state.tr.setSelection(TextSelection.create(doc,heading.position+1)).scrollIntoView()` : **`docChanged=false`**, aucune mutation, pas de révision, pas de journal de prose et pas d'appel à l'API de sauvegarde. Une sélection reste possible en lecture seule.
- Sur mobile/tablette portrait jusqu'à **900 px**, la même vue est accessible via **☰ haut gauche** du Studio. La sélection ferme le drawer puis déplace le curseur dans le texte, sans passer par une autre page et donc sans perdre de brouillon. Focus/Tab/Shift+Tab/Escape, clôture et safe areas reprennent les gardes v0.37.
- Le bouton de navigation inter-chapitres reste protégé par **`canLeaveEditor`** et les menus ⋯ sont entièrement conservés sous « Chapitres ». Le lien « Rechercher dans ce livre » reste accessible depuis la sidebar. Ne pas présenter la structure H1–H3 comme un sommaire complet du livre ou comme un outil d'IA.

## Accessibilité et limites

- Titre long rendu en ellipsis, valeur complète au `title` et à `aria-label`. Cible tactile ≥44px, indentation visuelle H1/H2/H3, actif indiqué par `aria-current=location`, liste défilante indépendante pour les gros manuscrits. Le compteur et l'avertissement `>300` utilisent `role=status` et `aria-live=polite`.
- Le sommaire suit seulement les styles natifs `heading` (H1–H3), pas les paragraphes ressemblant visuellement à un titre, ni les noms de chapitres des autres éditions. Les titres vides et les H4 non supportés sont omis plutôt que d'être inventés.
- Les positions sont valides uniquement dans le **document qui les a générées** ; après édition, elles sont reconstruites. La vérification pré-navigation évite un saut vers le mauvais titre si un clic survient lors d'une mise à jour.
- Aucune fuite vers un fournisseur IA, aucun nouveau modèle SQL, droits/permissions inchangés, ClamAV reste **non installé et OFF**.

## Tests

`pnpm section-outline:check` : extraction H1–H3 dans le bon ordre, Unicode, marques gras, position ProseMirror, pas de mutation, transaction de sélection `docChanged=false`, test de titre déplacé, aucun titre vide, >300 résultats et filtrage des titres ultérieurs, paramètres invalides. Câblage UI statique pour onglets + drawer 900px et non-régression du menu ⋯. CI intégrale `pnpm release:check`, UI/perf, tests, HTTP E2E PostgreSQL inchangés, worker, TypeScript, Next build. **Recette manuelle de l'éditeur sur téléphone et tablette requise** ; la CI ne constitue pas une preuve visuelle mobile.

**Release gate** : documentation complète dans la PR fonctionnelle avant fusion ; CI SUCCESS sur SHA final ; propriétaire `E2E v0.38.0-alpha BON` ; snapshot Neon production pré-merge ; Vercel `main` uniquement Preview OFF ; sondes health/version/logs ; journal postproduction documentaire.
