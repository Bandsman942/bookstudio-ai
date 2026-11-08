# Guide utilisateur — gestion des ouvrages et des chapitres

**BookStudio AI | Français / English | Guide actualisé pour la candidate v0.27.0-alpha.**
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

## 9. Progression réelle d'un livre (candidate v0.26.0)

Ouvrir **Bibliothèque → un ouvrage → Vue d'ensemble**. La section **Progression du manuscrit** présente les chapitres actifs, ceux qui contiennent du **texte réellement enregistré**, les chapitres encore vides, les chapitres retirés, le nombre d'enregistrements de révisions (y compris les révisions initiales) et les versions nommées.

La barre en pourcentage indique **la proportion de chapitres avec du texte**, pas le pourcentage de travail achevé. Un chapitre contenant une seule phrase n'est pas « terminé » pour autant. Chaque chapitre affiche « Texte enregistré » ou « Pas encore de texte ». Un chapitre vidé puis sauvegardé redevient vide dans les indicateurs, même s'il comportait du texte auparavant.

Le lien vers le **dernier chapitre modifié** permet de reprendre la lecture/rédaction ; un renommage ou un changement de structure peut également être la dernière modification de chapitre. Le dernier enregistrement d'une révision est affiché séparément. Les liens conduisent vers la structure et les versions. Actualiser la page après une sauvegarde, suppression ou restauration pour recalculer les chiffres.

Si la lecture des indicateurs est indisponible, le livre et l'éditeur restent utilisables ; aucun texte n'est supprimé. Les autres espaces de travail ne peuvent pas consulter vos résultats.

### English

Open a book's **Overview → Manuscript progress**. The panel shows active, written and still-empty chapters, removed chapters, revision records (including initial revisions) and named snapshots. The percentage measures **chapters containing saved text**, not editorial completion. Each chapter shows a saved-text or empty label. The most recently changed chapter and most recent revision are separate timestamps. Refresh after saving to update the figures. The editor remains available even if progress analytics cannot load.

## 10. Éditions d'un même ouvrage — v0.27.0-alpha (candidate)

Sur la **Vue d'ensemble d'un livre**, repérez la section **Éditions de l'ouvrage**. Le catalogue présente les éditions numérotées, leur langue et leur nombre de chapitres actifs. Une seule édition est marquée **Courante** : c'est l'édition au numéro le plus élevé, sur laquelle travaille l'éditeur de manuscrit.

- Tout membre ayant accès au livre peut **Consulter** une ancienne édition. Choisissez ensuite un chapitre : son dernier texte enregistré s'ouvre dans une fenêtre **en lecture seule**, sans réécriture ni modification de révision. L'aperçu restitue le texte ; il ne constitue pas un rendu Word fidèle des images/tableaux/formats riches.
- Les rôles **OWNER/EDITOR** disposent de **Créer une nouvelle édition**. Une confirmation explique ce qui sera copié : les derniers contenus **enregistrés** de tous les chapitres actifs, avec leurs titres et leur ordre. Sauvegardez vos modifications en attente avant de confirmer. La copie génère de nouveaux identifiants de chapitres et de nouvelles révisions de départ ; les originaux restent inchangés.
- Les commentaires, références de sources importées, verdicts antivirus et approbations **ne sont pas dupliqués automatiquement** vers la nouvelle édition. Les versions nommées historiques sont conservées au niveau du livre ; leur export reste possible.
- Le statut éditorial du livre revient à **Brouillon** pour la nouvelle édition. La mention « Publié » sur l'ancienne n'est pas transférée.
- Si un autre onglet ou collaborateur a modifié le livre, un conflit **409** demande l'actualisation de la page. Une copie directe supérieure à **500 chapitres actifs ou 20 MiB de données enregistrées** est refusée avec une explication : le livre original reste intact ; une procédure asynchrone pour très grands livres sera nécessaire.
- Les anciennes éditions sont **strictement consultables** ; les opérations de rédaction, import et export courant suivent l'édition la plus récente. Pour un livre archivé, restaurez d'abord le livre avant de consulter ses éditions.

### English

On Book Overview, open **Book editions**. Members can view previous editions and read the saved text of historical chapters without changing them. OWNER/EDITOR can create a new edition from the latest **saved** text; unsaved local edits are not included. New chapter IDs and initial revisions are created; old editions, historical comments and snapshots remain intact. Editorial status returns to Draft. Earlier editions are read-only, with a plain-text preview rather than a faithful layout. Concurrent changes return 409; synchronous copies above 500 active chapters or 20 MiB are refused without touching the original.

## 11. Comparer deux éditions et utiliser les menus des ouvrages (v0.28.0-alpha candidate)

Dans **Vue d'ensemble du livre → Éditions → Comparer les éditions**, sélectionnez l'édition de départ et celle d'arrivée. Cliquez sur **Comparer** pour afficher les chapitres qui ont gardé les mêmes données, ceux dont le **titre, l'ordre ou le contenu enregistré** a changé, les nouveaux et ceux qui ne figurent plus dans la seconde édition.

Cette comparaison est **non destructive** et ne modifie aucune révision. Elle analyse les **empreintes des dernières révisions enregistrées**, sans soumettre les manuscrits à une IA ni les publier. Les différences de rédaction ne sont pas détaillées phrase par phrase dans cette version. Si un chapitre a été **renommé et entièrement réécrit**, le rapprochement n'est pas toujours démontrable : il peut apparaître comme un ancien chapitre absent et un nouveau chapitre ajouté. Dans ce cas, vérifiez les textes en ouvrant chaque édition en lecture seule. La comparaison directe est limitée à **350 chapitres actifs par édition** ; au-delà, un traitement asynchrone sera nécessaire.

### Menus contextuels des livres

Les commandes **Renommer**, **Modifier les propriétés**, **Faire évoluer le statut éditorial** et **Archiver** ouvrent maintenant des fenêtres globales stables au-dessus de la bibliothèque, y compris lors du survol d'une carte et sur mobile. Le menu de la carte demeure accessible par **⋯**, le clic droit et le clavier. L'action ne doit jamais être contrainte par la largeur ou le défilement de la carte.

### English

In Book Overview → Editions → **Compare editions**, choose two different editions and compare their saved chapter title/order/content fingerprints. The result shows unchanged, changed, added and removed chapters. No content is modified, transmitted to AI or exposed through the comparison API. Ambiguous title-and-content rewrites are not automatically assumed to represent the same chapter. Max 350 active chapters per edition. Book ⋯ actions now open viewport-level dialogs outside transformed book cards, on desktop and mobile.

## 12. Restaurer une ancienne version dans une nouvelle édition (candidate v0.29.0-alpha)

1. Dans **Vue d'ensemble → Versions & historique**, repérez la version nommée à réutiliser (l’étiquette d’**édition source** précise si elle est historique).
2. Sur son menu **⋯**, choisissez **Restaurer dans une nouvelle édition**. Cette action diffère de **Restaurer** qui remet des révisions dans l’édition actuelle et ne convient pas aux snapshots d’une ancienne édition.
3. Lisez la confirmation. **Enregistrez d’abord vos éventuelles modifications non sauvegardées**. La création reprend uniquement les textes/titres/ordres **mémorisés lors du snapshot**, et non les dernières révisions du livre. Elle crée une édition avec ses nouveaux identifiants et statut **Brouillon**.
4. Vérifiez la nouvelle édition dans le catalogue. Les anciennes éditions, commentaires, révisions et snapshots restent consultables et exportables. Les commentaires, sources importées et approbations ne sont **pas copiés** vers la nouvelle édition.
5. Si vous recevez un 409, rechargez : un autre onglet a pu modifier le livre ou la version est incohérente. Au-delà de 500 chapitres/20 Mio, aucune copie partielle n’est faite. Cette opération nécessite OWNER/EDITOR.

### English

From **Book overview → Versions & history → ⋯ → Restore into a new edition**, select a named snapshot, including one from an earlier edition. After confirmation, BookStudio creates independent chapter IDs and initial revisions containing **exactly the saved snapshot content**; old editions and history remain untouched. The book returns to Draft. Unsaved edits, comments, imported sources and approvals are not copied. Existing **Restore** is a separate in-place action for the current edition. Stale tabs receive conflicts and must refresh. This direct copy supports at most 500 chapters / 20 MiB. Only OWNER/EDITOR may execute.
