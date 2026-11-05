# Guide utilisateur — gestion des ouvrages et des chapitres

**BookStudio AI | Français / English | Candidate v0.22.0-alpha.**
Accès privé : les capacités réelles dépendent de votre rôle dans l'espace de travail.

## 1. Bibliothèque et livres

Depuis **Bibliothèque**, vous pouvez ouvrir un livre autorisé. Les rôles **OWNER/EDITOR** peuvent créer, renommer, archiver et restaurer un ouvrage. Archiver masque le livre de la bibliothèque active sans effacer ses chapitres ni son historique. Les rôles **REVIEWER/VIEWER** accèdent à la lecture uniquement suivant leurs autorisations.

## 2. Chapitres

La **vue d'ensemble** énumère les chapitres et permet la création, l'ouverture, le renommage, le retrait réversible et la restauration depuis **Chapitres retirés**. La navigation **Manuscrit** à gauche est défilable indépendamment : même avec plus de 13 chapitres, vous pouvez rejoindre les derniers. Sur mobile, utilisez le bouton de navigation des chapitres puis le lien **Vue d'ensemble**.

### Réorganiser l'ordre (v0.22.0)

1. Ouvrez la vue d'ensemble ou un chapitre, puis le menu **⋯** à côté du chapitre à déplacer.
2. Sélectionnez **Monter d'une position** ou **Descendre d'une position**. La première et la dernière ligne ne peuvent pas dépasser les limites du manuscrit.
3. Après le toast de confirmation, l'ordre est mis à jour. Rafraîchissez l'écran au besoin. Répétez l'opération pour déplacer un chapitre de plusieurs positions.
4. Si vous recevez **Conflit : structure modifiée ailleurs**, actualisez la page avant de recommencer. Aucun chapitre n'est écrasé.
5. Une action de navigation sera bloquée dans l'éditeur tant que des modifications locales non enregistrées risquent d'être perdues. Sauvegardez d'abord.

**Ce qui ne change pas :** texte, commentaires, contenu des révisions et snapshots existants. La restauration d'un chapitre retiré le replace **à la fin** de la structure courante.

## 3. Droits et confidentialité

OWNER/EDITOR : actions de modification. REVIEWER/VIEWER : consultation, menus destructifs et de réorganisation indisponibles. Même une requête API directe est revalidée par le serveur. Les manuscrits sont privés ; ne transmettez pas de liens signés de source hors du flux prévu.

## 4. Raccourcis et accessibilité

Sur ordinateur, le menu **⋯** peut être ouvert au clavier, et **Shift+F10** sert de raccourci contextuel. Les focus visibles sont conservés ; sur téléphone, les menus s'adaptent au bord de l'écran. Les toasts FR/EN annoncent les succès, refus, permissions et conflits.

## 5. Limite antivirus (IMPORTANT)

Le worker ClamAV existe dans le code de v0.21 mais **n'est pas raccordé à un serveur dédié opérationnel**. Aucune preuve antivirus sur les documents de production n'est revendiquée. Les scans, la quarantaine et la promotion immuable restent dans les issues #104/#126/#131/#133 ; ne pas prendre un manuscrit simplement téléchargé pour un fichier analysé et approuvé.

---

# English quick guide

**Library:** OWNER/EDITOR can create, rename, archive and restore a book; REVIEWER/VIEWER only see permitted content. **Chapters:** use the chapter **⋯** menu to create, rename, remove and restore. With v0.22, **Move up / Move down** changes one position without touching text, comments, revisions or snapshots. A restored chapter returns at the end of the book. If an order conflict appears, refresh before retrying. On mobile open the manuscript drawer and use **Book overview**; navigation scrolls independently. **Security:** ClamAV is not yet hosted; source manuscripts are not guaranteed scanned.

## 6. Propriétés de l'ouvrage et progression (candidate v0.23)

Sur la carte du livre ou la **vue d'ensemble**, ouvrir le menu `⋯` :

- **Modifier les propriétés…** : choisir le type (Général, Roman, Essai, Sciences, Médecine, Éducation) et la **langue de référence** FR/EN. Cela ne traduit pas votre manuscrit et ne modifie pas la langue de ses éditions existantes. Les contenus, commentaires et versions restent identiques.
- **Faire évoluer le statut éditorial…** : afficher le statut actuel et sélectionner une **étape autorisée** parmi les transitions du workflow. Vous pouvez revenir en rédaction depuis la relecture ou en relecture depuis l'approbation/production ; un saut non autorisé est refusé.
- La progression est **une déclaration éditoriale interne**. Choisir le statut `PUBLISHED` ne publie pas le livre sur Internet, ne crée pas de fichier EPUB et n'envoie rien à un imprimeur.
- Seuls les rôles **OWNER et EDITOR** peuvent modifier ces données. Un ouvrage archivé doit d'abord être restauré. En cas de conflit **409**, rafraîchir la fiche avant de reprendre : aucun texte n'est écrasé.

### English

From a book card or Book overview, open `⋯` → **Edit book properties** to change the reference language (FR/EN) or book genre. Book text and edition languages are never translated or rewritten. Use **Change editorial status** to select only an allowed workflow transition. `PUBLISHED` is a manually declared milestone, **not** automatic public publication. OWNER/EDITOR can edit, readers cannot; archive first requires restoration. A 409 conflict requires refresh.

## 7. Rechercher, filtrer et parcourir une bibliothèque volumineuse (candidate v0.24)

Sur **Bibliothèque**, les compteurs présentent tous les livres accessibles, même si les premières cartes affichées sont limitées à **24 ouvrages**.

1. Dans « Rechercher un titre », saisir jusqu'à 80 caractères ; cette recherche concerne le **titre**, pas le texte des chapitres.
2. Choisir le type (roman, médecine, sciences, etc.) et/ou l'étape éditoriale (brouillon, rédaction, relecture, approbation, production, publication déclarée).
3. Choisir le tri **Modification récente** ou **Titre A–Z**, puis sélectionner **Appliquer** (ou Entrée).
4. Lire le résultat **X / Y ouvrages affichés**. Si plusieurs pages existent, utiliser **Afficher davantage d’ouvrages**. Les pages sont associées aux filtres ; changer les critères repart du début.
5. **Réinitialiser** rétablit la liste complète, les filtres et le tri récent. Un chargement impossible affiche un message et conserve les cartes déjà visibles.
6. Les lecteurs ne voient que leurs ouvrages autorisés ; les actions d'édition restent réservées à OWNER/EDITOR. Les compteurs ne révèlent pas les livres d'autres espaces.

**Limite connue :** le sélecteur de destination de l'import utilise les ouvrages actuellement visibles dans la bibliothèque ; pour importer vers un livre qui n'apparaît pas, filtrez la bibliothèque avant d'ouvrir la fenêtre d'import. Le travail d'un sélecteur d'import indépendant et paginé restera à compléter dans un lot dédié.

### English

On **Library**, search by book title (not chapter content), filter by book type or editorial milestone, choose Recently updated or Title A–Z and press Apply. The first page shows 24 books; **Load more books** displays subsequent results without reloading the whole application. The counters reflect the entire authorized library. Invalid or outdated page requests are rejected without exposing books from other workspaces.

## 8. Destination d'import autonome et pilotage éditorial (candidate v0.25)

Dans **Importer un manuscrit**, le sélecteur de destination recherche désormais parmi
**tous les ouvrages modifiables** par votre compte, et non seulement ceux présents
sur la première page de la bibliothèque. Saisissez un titre, choisissez
**Rechercher**, sélectionnez un livre ou cliquez sur **Afficher d'autres livres**
pour parcourir les résultats suivants. Il faut être OWNER ou EDITOR du workspace.
L'application vérifie encore l'autorisation côté serveur lors du transfert :
une destination archivée ou devenue inaccessible est refusée.

Le tableau **Pilotage éditorial** récapitule les six étapes (Brouillon,
Rédaction, Relecture, Approuvé, Production, Publié déclaré) et les archives pour
**l'ensemble des livres accessibles**, pas seulement les cartes chargées. Chaque
case d'étape permet de filtrer les ouvrages correspondants. Le statut Publié
reste une déclaration interne : aucune publication réelle n'est déclenchée.

### English

The import destination selector independently searches all editable books.
Search the title and load more results, even if the book is absent from the
current library page. Server permissions are checked again when uploading.
The editorial overview counts all authorized books by six stages plus archives;
select a stage to filter. Published is a manual milestone, not public publishing.
