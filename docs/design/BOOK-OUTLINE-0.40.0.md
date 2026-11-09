# Architecture — sommaire global v0.40.0-alpha (BS-005e #189)

## Frontière de confiance et projection

`BookOverview` affiche les métadonnées des chapitres actifs chargées dans la page serveur. `BookOutline` affiche toute cette liste, puis demande **à la demande** les titres des sections d'un chapitre en pages de **60**. La requête `GET /api/v1/books/{bookId}/chapters/{chapterId}/outline` exécute `activeUser → accessToBook` (livre non archivé, rôle membre OWNER/EDITOR/REVIEWER/VIEWER) puis vérifie le chapitre dans le manuscrit de la dernière édition. Elle lit **la révision à `chapter.revisionSeq`**, et `savedBookOutlinePage` projette uniquement `{ordinal,level,title}` pour les nœuds de type `heading` H1/H2/H3 non vides.

Le serveur reçoit `filter` (texte littéral ≤100 caractères, aucun caractère de contrôle) et `offset` entier sûr 0–100000 ; `total` réel, `hasMore`, `revision` et l'ID du chapitre sont renvoyés avec `Cache-Control: private, no-store`. La lecture ne crée ni révision, ni contenu, ni appel IA. Les autres paragraphes n'apparaissent pas dans la réponse. Le serveur charge **un JSON de chapitre par requête**, pas un livre de centaines de pages ; les titres suivants sont récupérés explicitement. Les chapitres listés ne sont pas chargés automatiquement : économie réseau sur téléphone.

## Navigation sûre

Chaque titre reçoit son **ordinal absolu, non filtré**, dans l'ordre ProseMirror du chapitre sauvegardé. Le lien contient `outlineRevision` et `outlineOrdinal` numériques. Le Studio compare cette révision à celle ouverte et vérifie la présence d'un éventuel brouillon local avant de résoudre l'ordinal en position réelle. Seul un `TextSelection` et un défilement sont déclenchés (aucun `docChanged`, `PATCH`, snapshot ou modification). Si la révision a évolué, que l'ancre est absente ou qu'une récupération locale existe, un toast avertit et **ne saute pas** vers un mauvais passage. Si l'auteur édite après le saut, la sauvegarde existante reste inchangée.

## Limitations explicites

- La page globale ne compile pas d'un seul coup tous les titres de tous les chapitres ; chaque chapitre se déplie séparément, évitant N requêtes cachées et la lecture de toute la prose. Un titre à la 61e position exige « Charger les titres suivants ».
- Les liens d'une page ancienne doivent être régénérés si une autre session a sauvegardé une révision. La page ne synchronise pas automatiquement les changements de titres dans d'autres onglets.
- Les parties persistantes, arborescence de plusieurs niveaux entre chapitres, renumérotation automatique et insertion de TOC dans les exports sont hors de cette version. Le sommaire H1–H3 se rapporte aux titres réels du chapitre, pas à une table de contenu publiée.
- Le filtre Unicode repose sur `toLocaleLowerCase()` et non une collation linguistique avancée. Des titres énormes peuvent produire une réponse volumineuse (jusqu'à 60 titres) ; la taille des révisions est bornée par le validateur d'édition existant.

## Contrôles

Unitaires : titres H1–H3, ordre, marques et Unicode, suppression des titres vides, confidentialité des paragraphes, pagination 60+7, stabilité de l'ordinal filtré, offset invalide et absence de mutation. HTTP PostgreSQL : session refusée, cross-tenant 404, dernière révision seulement, 60+7, filtre, archive 404 et chapitre nouveau vide. Contrôle manuel sur Android Chrome 320–390px, tablette 768/900px, desktop, lecteur, thème et réseau faible. CI complète et E2E propriétaire avant main. ClamAV dédié OFF.
