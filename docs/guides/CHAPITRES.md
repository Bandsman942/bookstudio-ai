# Guide utilisateur — gestion des ouvrages et des chapitres

**BookStudio AI | Français / English | Guide actualisé pour la candidate v0.38.0-alpha (non publiée).**
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

## 18. Copier un chapitre dans un autre ouvrage du même espace (candidate v0.34.0-alpha)

1. Dans le sommaire ou le Studio, ouvrez **⋯ → Copier dans un autre livre…** sur le chapitre source. La commande apparaît uniquement si vous disposez des droits OWNER/EDITOR.
2. Dans le dialogue, modifiez si nécessaire le **titre du chapitre copié**, puis choisissez un **autre ouvrage modifiable** du **même espace de travail**. Le sélecteur propose au maximum 50 résultats : si plus de livres correspondent, un message vous invite à **rechercher par titre**, sans supprimer ni masquer définitivement aucun ouvrage. Les livres archivés, le livre source lui-même et ceux d'un autre workspace sont exclus.
3. Vérifiez que le chapitre source est **Enregistré** : seule la version actuellement sauvegardée sur le serveur est copiée. Les brouillons locaux non enregistrés ne sont jamais repris. Le bouton **Copier vers cet ouvrage** confirme l'action et ouvre directement le nouveau chapitre dans l'ouvrage de destination.
4. Dans l'ouvrage de destination, le nouveau chapitre apparaît **en dernière position**, avec son propre identifiant et sa **révision 0** ; son contenu est celui de la dernière révision sauvegardée du chapitre d'origine. Les autres chapitres du livre cible restent en place et le livre revient à **Brouillon**, car il a été modifié.
5. Le chapitre source, sa version, les commentaires, les anciennes éditions et les snapshots sont **intacts**. Les commentaires, historiques, objets Supabase, importations, fichiers sources, scans et attestations ClamAV ne sont jamais copiés. Aucune nouvelle permission n'est créée : les membres existants de la destination conservent les droits normaux de son workspace.
6. Un conflit de révision ou d'édition dans l'un des deux livres provoque **409**, sans copie partielle ; un nombre de chapitres trop élevé (>500) ou un contenu >20 MiB provoque **422**, sans troncature. En cas de connexion interrompue, vous pouvez répéter la même opération pour retrouver la copie déjà créée sans doublon.

### English

From a source chapter's **⋯** menu, choose **Copy to another book…** (OWNER/EDITOR). Search for a different editable destination in the **same workspace**, enter a title and confirm. At most 50 books are shown at once; refine the search if more match. A new chapter is appended to the target book with the **latest saved source content**, a new ID and revision 0; destination returns to Draft. The source, its comments, earlier revisions and snapshots remain unchanged. Sources, storage files, import and antivirus records are never transferred. Save local drafts first. Conflicts return 409, oversized copies 422 without truncation; the same operation ID can be safely retried.

## 19. Fusionner deux chapitres en conservant les originaux (candidate v0.35.0-alpha)

La **fusion non destructive** permet de réunir les textes de deux chapitres déjà sauvegardés **dans un troisième chapitre indépendant**. Elle ne supprime jamais les deux sources.

1. Dans le sommaire ou le Studio, ouvrez **⋯ → Fusionner avec un autre chapitre…** sur le chapitre que vous souhaitez voir **en premier** (A). La commande nécessite OWNER/EDITOR.
2. Dans le dialogue, recherchez et sélectionnez le **deuxième chapitre (B)**, distinct et actif dans l'édition courante, puis choisissez le **titre du nouveau chapitre** (C). Lisez la confirmation : aucun titre de section n'est ajouté automatiquement et aucune suppression des originaux n'a lieu.
3. **Enregistrez tous vos brouillons ouverts** avant de fusionner. Seules les **dernières révisions sauvegardées sur le serveur** de A et B sont utilisées. Les blocs riches ProseMirror (titres, paragraphes, listes, marques, liens autorisés) sont réunis **dans l'ordre A puis B**, sans analyse IA ni troncature.
4. Confirmez **Créer un nouveau chapitre fusionné**. Le chapitre **C** s'ouvre, avec un **nouvel identifiant** et une **révision 0**, placé **à la fin du sommaire**, sans déplacer A et B. Le statut de l'ouvrage revient à **Brouillon**. Vous pourrez retoucher et réorganiser C normalement dans le Studio.
5. Vérifiez que **A et B conservent** leurs versions anciennes, commentaires/ancres, snapshots du livre, imports et sources éventuelles. C ne reçoit **aucun** commentaire, ancien historique, fichier Supabase, attestation antivirus ou permission supplémentaire. ClamAV isolé n'est pas installé et aucune preuve de sécurité n'est déduite.
6. Si l'édition ou l'un des deux chapitres a changé, **409** sans aucun résultat partiel ; si le document combiné dépasse **2 Mio** ou la complexité de l'éditeur, ou si le livre compte déjà **500 chapitres actifs**, **422 sans troncature**. Après une coupure réseau, répéter strictement la **même opération** avec son identifiant évite les doublons.

### English

Open a chapter's **⋯ → Merge with another chapter…** (OWNER/EDITOR), search for a second active chapter and choose a new title. A completely **new chapter** is appended at the end of the current edition, joining the first source's **saved** ProseMirror blocks followed by the second's, with its own ID and revision 0. Both originals, their revision histories, comments and snapshots are untouched. No imports, files, scans or permissions are inherited. Save local drafts first. The book returns to Draft; stale source/edition returns 409, >2 MiB combined editor document or >500 active chapters returns 422 without truncation. Retry the identical operation safely.

## 20. Rechercher et remplacer dans un chapitre du Studio (candidate v0.36.0-alpha)

1. Ouvrez un chapitre dans le **Studio**. Dans l'en-tête, cliquez sur le bouton **⌕** ou utilisez **Ctrl/Cmd+F** : le panneau de recherche s'ouvre. Utilisez **Ctrl/Cmd+H** pour ouvrir directement le mode remplacement (si vous disposez des droits d'écriture). Les utilisateurs ayant uniquement un droit de lecture peuvent chercher et naviguer.
2. Tapez le mot ou le passage souhaité : la recherche est **littérale** (un point `.` est un point, pas une expression régulière), insensible à la casse par défaut, et prend en charge les caractères Unicode. Cochez **Respecter la casse** au besoin. Le panneau affiche la position **i/N** et les boutons **Précédent/Suivant** ; Entrée et Shift+Entrée dans le champ permettent de naviguer également. Les occurrences sont sélectionnées dans le manuscrit sans le modifier.
3. Cliquez sur **Remplacer…** pour saisir le nouveau texte (0–1000 caractères, une seule ligne, vide = supprimer seulement le terme trouvé). **Remplacer cette occurrence** ne touche qu'un seul passage. Pour la totalité des résultats, cliquez **Prévisualiser tout remplacer** : vérifiez le **nombre** puis cliquez **Confirmer N remplacements**. Le chapitre peut être modifié entre ces deux actions : dans ce cas, la confirmation expire et aucune substitution n'est faite sans révision.
4. Le remplacement est appliqué **à votre éditeur local**, puis la sauvegarde automatique habituelle s'en charge. Vérifiez que l'indicateur passe finalement à **« Enregistré »** avant de quitter le chapitre. Vous pouvez annuler un remplacement, y compris l'opération globale, par **Ctrl/Cmd+Z** en une étape.
5. Pour protéger la mise en forme, **une correspondance doit être entièrement dans un même nœud texte ProseMirror**. Un mot réparti entre « gras » et « non-gras » n'est pas proposé comme un seul résultat. Les titres/paragraphes/listes et les marques déjà en place **ne sont jamais aplatis automatiquement** ; une recherche globale à travers plusieurs segments stylistiques reste un chantier ultérieur.
6. Au-delà de **500 résultats**, le panneau affiche une limite claire et **désactive Remplacer tout** plutôt que de changer silencieusement 500 passages sur un total supérieur. Affinez votre recherche. Si le document résultant dépasse la taille compatible avec l'éditeur (**2 Mio**) ou les bornes de complexité, l'opération entière est refusée **sans troncature ni écrasement du chapitre**. Les conflits d'autosave et les situations hors connexion bloquent le remplacement ; les autres livres et anciennes éditions sont intacts. Les termes recherchés restent dans le navigateur et ne sont pas envoyés à l'IA.

### English

Open a chapter in **Studio**, click **⌕** or press **Ctrl/Cmd+F** to find, **Ctrl/Cmd+H** to find and replace (editors only). Literal, Unicode-aware search is case-insensitive by default and can be made case-sensitive. Navigate with Previous/Next or Enter/Shift+Enter; replace one occurrence or **review and explicitly confirm** the total. All substitutions are applied in one fully validated ProseMirror transaction, undoable in one step, then saved through the existing autosave; wait for **Saved**. The initial version only searches within **one text node**, never across differently marked segments. More than 500 matches blocks Replace All; replacements cannot exceed 1000 characters or one line; documents over 2 MiB are refused without truncation. Nothing is sent to an AI or third-party search provider.

## 21. Recherche dans tout un ouvrage (candidate v0.37.0-alpha)

Pour rechercher dans **tous les chapitres d'un livre autorisé**, ouvrez sa vue d'ensemble et cliquez **Rechercher dans ce livre** (ou utilisez le lien du menu gauche). Dans le **Studio**, ouvrez le menu **⋯ d'affichage → Rechercher dans tous les chapitres du livre** ou le lien **Rechercher dans ce livre** du sommaire. Lorsque le chapitre comporte un brouillon local non sauvegardé, la navigation depuis Studio est bloquée jusqu'à la confirmation de sauvegarde, pour éviter une perte.

La page précise le **titre de l'ouvrage** et indique qu'elle recherche uniquement **les dernières révisions enregistrées dans l'édition courante**. Elle exclut les brouillons non sauvegardés, commentaires, snapshots, fichiers sources, archives, chapitres supprimés, éditions passées et ouvrages des autres espaces de travail. Un compte sans droit de lecture ne voit même pas le titre du livre, et le serveur renvoie 404.

1. Saisissez un terme **littéral** de 2 à 80 caractères et cliquez **Rechercher**. Les caractères `%`, `_` et `\\` sont du texte normal, jamais des jokers SQL ; aucune requête IA n'est effectuée.
2. Les résultats affichent le chapitre, un **court extrait** du texte sauvegardé et la révision correspondante. Cliquez sur un résultat pour ouvrir son chapitre. Les résultats sont organisés dans un ordre stable pour un manuscrit non modifié.
3. Une page comporte **30 chapitres au maximum**. Si plus de résultats existent, un message l'indique et le bouton **Afficher les 30 résultats suivants** permet de charger une autre page, sans masquer les précédentes. Le total chargé reste visible. Sur une connexion faible, une erreur de chargement de la suite ne fait pas perdre les pages déjà affichées.
4. Pour passer à tous vos livres accessibles, choisissez **Chercher dans tous mes livres**. Si le manuscrit est modifié entre deux pages, relancez la recherche pour obtenir un ordre cohérent. Un offset hors limites est explicitement rejeté.
5. Cette version permet de **rechercher à l'échelle d'un livre**, mais **pas encore de remplacer tous les chapitres simultanément**. Pour remplacer, utilisez la recherche locale du chapitre ouvert (fonction v0.36).

### English — Book-wide search

Choose **Search this book** from the book overview or Studio chapter navigation, and enter a literal 2–80-character term. Only the **latest saved revisions of active chapters in the current edition** of this authorized book are searched. The private API never includes archived, historical or other-workspace content. Each page shows up to **30 results** and a **Load next 30 results** button only if more exist, preserving already-loaded results after a network failure. Results link to their chapters. Unsaved drafts are excluded; use the local Studio find/replace for the currently open document.

## 22. Menu hamburger ☰ sur mobile (candidate v0.37.0-alpha)

Sur téléphone, les options de la **barre latérale gauche** sont désormais rangées dans un **menu hamburger ☰ en haut à gauche** (zone cliquable d'environ 44 px) sur **Bibliothèque, Vue d'ensemble du livre, Recherche et Archives**. Appuyez pour faire apparaître la colonne entière, y compris Retour bibliothèque, Sources, Structure, Versions, Recherche dans ce livre et la **liste complète des chapitres avec leurs menus contextuels ⋯** si ces options existent pour votre rôle. Il s'agit du même menu que sur ordinateur, simplement replié pour laisser plus de place au texte.

Pour le refermer : appuyez sur **×**, sur le **fond sombre**, sur un **lien** du menu ou utilisez **Échap** sur un clavier physique. Le menu peut défiler même avec de très nombreux chapitres ; le contenu derrière reste immobile. Le clavier Tab/Shift+Tab reste dans le panneau lorsqu'il est ouvert, puis revient au hamburger à la fermeture. Les couleurs clair/sombre, la langue FR/EN et l'encoche iPhone sont respectées.

Dans le **Studio d'édition plein écran**, le hamburger déjà disponible est agrandi et reste utilisable **même en mode concentration**. Il révèle le sommaire, les actions ⋯, les liens de navigation et la recherche dans tout le livre. Il **n'ignore jamais la sauvegarde** : si vos modifications ne sont pas encore enregistrées, le Studio bloque la sortie vers une autre page et affiche un avertissement. À partir de 768 px, la disposition classique est conservée.

### English — Mobile navigation

On narrow screens, tap the **☰ button at the upper-left** of Library, Book Overview, Search or Archives to reveal the **complete left navigation**, including the book's long chapter list and ⋯ actions. Close using **×**, the backdrop, Escape or a navigation link. The menu scrolls independently, preserves keyboard focus and respects iPhone safe areas and light/dark themes. Studio's own hamburger is kept visible and enlarged, even in focus mode; pending unsaved drafts still block unsafe navigation.

## 23. Sommaire des sections du chapitre courant (candidate v0.38.0-alpha)

Le Studio dispose d'une nouvelle navigation structurée qui **ne modifie jamais votre manuscrit**. Sur ordinateur, utilisez la barre latérale ; sur téléphone ou tablette (jusqu'à 900px), ouvrez le **hamburger ☰ en haut à gauche**. Deux onglets sont disponibles :

- **Chapitres** : retrouve tous les chapitres de votre livre et leurs menus contextuels ⋯ (renommer, dupliquer, réorganiser, copier, fusionner, etc., selon vos droits). Les actions habituelles ne disparaissent pas.
- **Sections** : présente les titres **H1, H2 et H3 réellement saisis dans le chapitre ouvert**, avec indentation selon le niveau. Les styles de paragraphes en gras ne sont pas pris pour des titres. Un titre vide n'est pas inventé ; les H4 ne sont pas inclus dans cette première tranche.

La liste se met à jour en fonction du **document actuellement ouvert dans l'éditeur**, même si un brouillon n'est pas encore enregistré. Saisissez une partie du titre dans **Filtrer les titres H1–H3** pour retrouver une section (Unicode/accents acceptés). Le compteur indique combien de titres correspondent ; au-delà de **300**, l'application indique clairement qu'il reste des résultats et demande de préciser le filtre. **Aucune partie du manuscrit n'est effacée ni tronquée.**

Sélectionnez une section pour **déplacer le curseur et afficher son emplacement** sans changer le texte. Les titres sont revérifiés au moment de la navigation pour éviter un saut erroné après une modification du document. Aucun appel IA ou service externe n'est effectué. Cette fonction est également disponible en lecture seule et en mode concentration. Pour naviguer vers un **autre chapitre**, retournez dans **Chapitres** ; le garde habituel empêche la sortie lorsque des modifications restent à sauvegarder.

Cette première version est un sommaire **interne au chapitre courant**, pas encore la table des matières complète du livre, ni une hiérarchie persistante des parties, ni une table intégrée aux exports PDF/DOCX.

### English — Live section outline

In Studio's left sidebar (or the **☰** mobile drawer), switch between **Chapters** and **Sections**. Chapters keeps the complete chapter list and ⋯ action menus. Sections lists the current open document's real **H1/H2/H3** headings with hierarchical indentation, title filtering and accurate result counts. The outline includes local unsaved drafts, but clicking a section **only moves the caret and viewport**, without editing or saving the document. More than 300 headings are signaled explicitly; refine the filter to find later matches. Reader roles can navigate. Whole-book tables of contents and publication exports are not part of this release.
