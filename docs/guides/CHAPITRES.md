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
