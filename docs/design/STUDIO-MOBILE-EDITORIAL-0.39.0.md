# BS-005d — Studio mobile et repères éditoriaux locaux (v0.39.0)

## Cause et réparation

Le CSS historique `@media(max-width:760px){.nav,.studio-sidebar{display:none}}` était contredit par `.studio-sidebar{display:flex;...}` apparu **plus tard** pour permettre le scroll indépendant des chapitres. À 360 CSS px, les 248 px de la colonne latérale restaient donc dans le layout flex ; le centre était réduit à une bande, reproduisant le bug Android Chrome du propriétaire. La règle de tablette 761–900 ne couvrait pas les petits téléphones.

Une garde finale `@media(max-width:900px)` force `.studio>.studio-sidebar` à `display:none!important` **hors ouverture** et `.studio.studio-mobile-navigation-open>.studio-sidebar` à `display:flex!important;position:fixed` **quand on ouvre le hamburger**. Elle redonne au `.studio-center` toute la largeur, limite le débordement du document/ruban et conserve les safe areas. Les sélecteurs sont spécifiques au Studio : Bibliothèque, Recherche et la fiche de livre gardent le `WorkspaceShell` partagé de v0.37.

## Intelligence éditoriale accessible

Le contrôle de 44 px « étincelles » dans la topbar est visible au plus à 1150 CSS px ; sur écran large, le panneau et les actions de présentation habituels restent inchangés. Le contrôle est un bouton natif, avec `aria-label`, `aria-expanded`, focus visible et activation au clavier. Un tiroir droit fixe recouvre le centre sans réduire la largeur éditable. Escape, backdrop, fermeture et Tab/Shift+Tab suivent le cycle modal ; l'activation d'un tiroir referme l'autre. Les commentaires restent exclusivement accessibles aux membres ayant accès au chapitre via les contrôles de serveur existants.

La fonction `analyzeEditorialStructure` lit les nœuds JSON Tiptap en mémoire, compte mots dans titres/paragraphes, paragraphes non vides et titres ; elle signale les paragraphes de **plus de 180 mots** sans jugement linguistique ou modification. Mise à jour dans le checkpoint local de 350 ms déjà existant ; pas de nouveau listener, timer, endpoint, base, analytics, dépendance tierce ou sérialisation indépendante à chaque frappe. Le résultat n'a pas de lien avec la correction IA future ; ne pas marquer ce lot comme une IA générative opérationnelle.

## Isolation et non-régression

- Pas de mutation de ProseMirror pour les indicateurs, pas de révision, autosave, commentaire ou audit supplémentaire.
- État actif de la navigation mobile et du tiroir éditorial indépendant de celui de l'éditeur ; fermeture lors de la bascule des breakpoints et retour au focus d'origine.
- Tester les mêmes CSS à 320/360/375/390/768/900/1150/1440 px, le vrai Android avec zoom texte, clavier logiciel et longue liste de chapitres.
- Les tests `mobile-workspace:check` capturent la cascade et l'accessibilité déclarée ; `editorial-structure:check` vérifie les métriques et l'immuabilité. L'essai visuel E2E demeure indispensable.
