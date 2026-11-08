# Guide utilisateur — gestion des ouvrages et des chapitres

**BookStudio AI | Français / English | Guide actualisé pour la candidate v0.33.0-alpha (non publiée).**
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

## 11. Comparer deux éditions et utiliser les menus des ouvrages (v0.28.0-alpha livrée)

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

## 13. Consulter et restaurer les révisions d'un chapitre (candidate v0.30.0-alpha)

Dans un **chapitre ouvert dans l'éditeur**, cliquez sur **Historique** (en haut de l'écran). La colonne des révisions montre leur numéro, leur date et le nom de l'auteur qui les a enregistrées. La liste charge 20 révisions à la fois ; le bouton **Charger les révisions précédentes** permet de remonter tout l'historique sans limite arbitraire à 100 éléments.

Choisissez une révision pour afficher son **texte enregistré** à cette date, en lecture seule (la mise en page riche n'est pas reproduite dans cet aperçu). Si votre rôle est OWNER/EDITOR, cliquez sur **Restaurer cette révision** puis confirmez. Cette commande **ajoute une nouvelle révision à la suite**, sans effacer la source historique ni les autres versions. Le statut du livre revient à **Brouillon** car le contenu éditorial a changé.

**Précaution essentielle** : attendez **Enregistré** avant toute restauration ; les modifications locales non enregistrées, les conflits d'édition et les coupures réseau bloquent la commande. Si la révision a changé ailleurs depuis l'ouverture, l'API refusera avec HTTP 409. Les anciennes éditions restent consultables via **Éditions**, mais leur contenu ne peut pas être modifié par la route des révisions du chapitre courant.

### English

In the chapter editor choose **History**. The revision timeline shows each saved revision's date, sequence and author, paginated 20 at a time. Select an entry to read its **saved text** without editing it. OWNER/EDITOR may **Restore this revision**, which appends a new revision rather than overwriting any historical record; the book status resets to Draft. Save pending local edits and resolve conflicts before restoring. Stale server versions are rejected with 409; revisions from previous editions are read-only via the Editions viewer.

## 14. Comparer deux révisions d'un même chapitre (candidate v0.31.0-alpha)

1. Ouvrez un chapitre du livre, puis cliquez sur **Historique**. Les versions présentées représentent les textes **enregistrés**, et non vos éventuelles modifications non sauvegardées dans le navigateur.
2. Dans **Révision de départ** et **Révision d'arrivée**, choisissez deux numéros différents puis cliquez sur **Comparer**. Pour rechercher un ancien numéro absent de la première page, sélectionnez **Charger les révisions précédentes**.
3. La comparaison affiche : **vert/souligné = ajout**, **rouge/barré = suppression**, texte ordinaire = inchangé. Les compteurs désignent des unités lexicales **mots ou ponctuation** (pas les espaces). L'outil reconstitue intégralement les deux textes enregistrés sans omission.
4. Les changements de **mise en forme Word** ne sont pas comparés dans cette tranche : si le texte est identique mais que les JSON structurés diffèrent, un avertissement le signale. Vous pouvez comparer dans les deux sens. Il s'agit d'une lecture seule ; l'opération ne crée aucune révision.
5. Si les textes comportent trop de changements pour le calcul interactif (250 000 caractères UTF-16, 12 000 unités lexicales par texte ou plus de 4 millions de cases LCS), le service répond **422**, sans tronquer aucune donnée ni modifier le livre. Vous pouvez toujours ouvrir chaque version séparément et poursuivre l'édition. Le comparateur ne relit que les révisions du chapitre **de l'édition actuelle** et respecte les droits d'espace.
6. L'interface s'adapte au téléphone, au clavier, aux thèmes clair/sombre et au français/anglais. Le texte est rendu sans interprétation HTML.

### English

In the chapter editor open **History**, choose distinct **From revision / To revision** values and select **Compare**. Earlier revisions can be loaded progressively. Green/underlined segments were **added**, red/struck-through segments were **removed**, normal text is **unchanged**. The counts refer to word-like or punctuation units, not whitespace. Comparison is read-only and uses **saved plain text only**: unsaved edits are excluded; rich formatting is not compared. A warning may report structural changes with identical plain text. Very large diffs return 422 without truncating or modifying any saved content. Only revisions from this active chapter are accessible; other workspaces are denied.

## 16. Dupliquer un ouvrage sans toucher à l'original (candidate v0.32.0-alpha)

Depuis **Bibliothèque** ou la **fiche du livre**, ouvrez le menu **⋯**, puis cliquez sur **Dupliquer le livre…**. La commande nécessite un rôle OWNER ou EDITOR dans l'espace de travail. Choisissez le nouveau titre et confirmez **Créer la copie indépendante**. Vous serez dirigé vers un **nouveau livre** marqué **Brouillon**, avec sa propre édition n°1.

**Repris :** le type et la langue du livre, la langue de l'édition courante, les titres et positions des chapitres actifs, leur **dernier texte et document structuré enregistrés sur le serveur**. Les chapitres ont chacun un nouvel identifiant et leur première révision est la n°0. Le livre et son historique d'origine demeurent inchangés.

**Jamais repris :** anciens commentaires/annotations, versions historiques, snapshots nommés, sources physiques Supabase et importations associées, historiques de sécurité, attestations ClamAV, scans antivirus, droits/memberships ou états de publication. Les fichiers sources devront être rattachés séparément si nécessaire, avec contrôles de sécurité réels ; **le scanner ClamAV n'est pas installé**.

Avant de confirmer, vérifiez que vos onglets d'édition indiquent **Enregistré** : les brouillons locaux non sauvegardés ne font pas partie de la copie. Si le livre ou son édition change pendant l'opération, le serveur répond 409 sans créer de livre incohérent ; si plus de 500 chapitres ou 20 MiB de contenus, 422 sans troncature. Si le réseau est interrompu, la même opération peut être répétée sans créer de deuxième livre.

### English

Open the **⋯** menu on a book card or overview, choose **Duplicate book…**, enter a title and confirm (OWNER/EDITOR only). A separate **Draft** book opens in the same workspace, with edition 1 and new chapter IDs/revision 0. Only the current edition's **saved active chapter content**, type/language and order are copied. Old snapshots, comments, sources, imports, scans, permissions and previous editions are **not** inherited. Save pending browser drafts first. Concurrent changes return 409; oversized requests return 422; retrying the same operation does not duplicate it.

**Confidentialité de l'espace :** la copie est créée **dans le même workspace**. Les membres déjà autorisés dans cet espace conservent donc leurs droits habituels de lecture/modification sur le nouvel ouvrage, selon leur rôle : aucun nouveau membre n'est invité ni aucune permission créée. Pour isoler un livre des membres existants, il faudra une gestion d'espaces distincts (non incluse dans cette version).

**Workspace access:** the duplicate stays in the **same workspace**, so its existing members keep their role-based access to the new book. No new membership is created. This feature does not create a private workspace.

## 17. Dupliquer un seul chapitre (candidate v0.33.0-alpha)

Dans un livre, ouvrez le menu **⋯** du chapitre désiré, depuis le **sommaire** ou le **Studio**, puis sélectionnez **Dupliquer ce chapitre…**. Seuls les membres ayant le droit OWNER/EDITOR peuvent effectuer cette action. Indiquez le **titre du nouveau chapitre** (suggestion automatique : Copie de…) et cliquez sur **Créer la copie du chapitre**.

Un nouveau chapitre est **ajouté à la fin du sommaire**, sans supprimer, renommer ou déplacer celui d'origine. Il reprend **exclusivement la dernière version sauvegardée** du contenu structuré et du texte. Il possède son propre identifiant et commence à la **révision 0**. Vous pouvez ensuite le réorganiser manuellement dans le sommaire.

**Ne sont pas copiés :** les anciennes révisions, commentaires, ancres de relecture, sources Supabase, journaux d'importation, anciennes pièces jointes, snapshots nommés et attestations antivirus. Les autres chapitres et snapshots restent inchangés. L'ajout d'un chapitre est une modification éditoriale : le statut du livre revient à **Brouillon**.

⚠️ **Avant l'action, sauvegardez vos brouillons ouverts**. Les modifications locales non enregistrées ne font jamais partie de la copie. Si le chapitre ou l'édition a changé, HTTP 409 et aucun chapitre incohérent n'est créé. Les limites sont 500 chapitres actifs dans l'édition et 20 Mio pour le contenu copié : dépassement 422 **sans troncature**. En cas de connexion coupée, le même identifiant d'opération permet de retrouver la copie sans en créer une deuxième.

### English

On a chapter's **⋯** menu in the book outline or Studio, select **Duplicate this chapter…** (OWNER/EDITOR only), choose a new title and confirm. A fresh chapter is **appended at the end** of the current edition, with a new ID and revision 0 holding only the **latest saved source content**. The original chapter, older revisions, comments, source files, imports, snapshots and security attestations are not copied or changed. The book reverts to Draft. Save unsaved browser drafts before duplicating. Version conflicts return 409, over-limit copies 422 without truncation, network retry with the same operation ID is idempotent.
