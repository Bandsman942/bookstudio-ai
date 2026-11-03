# Ruban d'édition — BookStudio AI, étape 1 (#68)

## But
Remplacer la barre minimaliste visible sur la capture de l'utilisateur (Titre 1 / Titre 2 / G / I / Liste / Undo / Redo) par un ruban compact, inspiré des logiciels bureautiques, sans surcharger l'éditeur ni interrompre l'écriture.

## Fonctionnalités réalisées dans cette première tranche
- **Accueil** : styles Normal / Titre 1 / Titre 2 / Titre 3, gras, italique, souligné, barré, code inline, listes à puces/numérotées, citation, bloc de code, effacer le formatage, annuler/rétablir.
- **Insertion** : liens externes HTTP(S) et mailto validés, suppression de lien, séparateur horizontal, saut de ligne.
- Les boutons mettent leur état actif à jour via `useEditorState`, sans forcer le rerender de tout le document à chaque frappe.
- Ruban horizontal défilant au toucher sur petit écran ; **aucun** bouton flottant superposé au manuscrit.
- ARIA tablist/tab/tabpanel, nom explicite de chaque commande, boutons actifs avec `aria-pressed`, contour clavier `:focus-visible`, compatibilité thème clair/sombre/système et dictionnaires FR/EN.
- Les commandes restent absentes pour les utilisateurs en lecture seule.

## Intégrité et sécurité
- L'éditeur utilise le `StarterKit` Tiptap 3, qui inclut liens et soulignement. Les liens automatiques au collage/à la frappe sont désactivés et seuls `https://`, `http://`, `mailto:` explicitement autorisés peuvent être créés.
- `assertValidDocument` accepte les marques `underline` et `link`, rejette protocoles dangereux et attributs inattendus. Une requête API reste soumise au contrôle de session, d'origine, aux droits et aux révisions.
- Exports DOCX : marques soulignées et liens extérieurs conservés via relations OpenXML. Markdown : liens et style simple conservés ; PDF lecture : mise en forme inline et annotations de lien via PDFKit. Ces exports sont testés, mais la fidélité d'un document complet n'équivaut pas encore à Microsoft Word.
- Aucun chargement de fichier utilisateur, aucune donnée envoyée à l'IA, et aucune nouvelle variable d'environnement.

## À suivre, par étapes indépendantes du cahier des charges
- Tableaux avec cellules, insertion et redimensionnement ; conserver la structure et les propriétés à l'export.
- Images : stockage original **privé**, antivirus, légendes, droits/alt, optimisation adaptative ; dépend du blocage #46.
- Polices, couleurs, surlignage, alignements, retraits, espacements, sous/superscripts ; normalisation du modèle et de l'export.
- Pagination imprimable fidèle, styles de titres/numérotation, en-têtes/pieds, table des matières automatique, notes de bas de page.
- Commentaires inline sur sélection, suivi des modifications et approbation versionnée.
- Bibliographie CSL/DOI et modèles éditoriaux selon ouvrage.

**Ne pas afficher des outils non opérationnels** avant que modèle, validation, export et E2E les prennent en charge. Éviter de promettre l'équivalence complète Word tant que les parcours ne la prouvent pas.
