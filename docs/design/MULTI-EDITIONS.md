# Architecture des éditions multiples — BS-004f #148

**v0.27.0-alpha — candidate NON déployée.** Reprise de l'entité `Edition` déjà présente, sans migration SQL.

## Invariants éditoriaux

- L'édition courante reste **le plus grand numéro** `Edition.number`, comportement existant de `accessToBook()`, des imports, du Studio et des exports courants.
- Créer une nouvelle édition est **une duplication** (pas un déplacement) du dernier texte **enregistré** de chaque chapitre actif. Les chapitres de destination reçoivent de **nouveaux UUID**, `revisionSeq=0`, et une `DocumentRevision` initiale avec le JSON ProseMirror, le texte et le hash intacts de la dernière révision source.
- Les chapitres retirés ne sont pas dupliqués. L'ancienne édition conserve tous ses chapitres, révisions et commentaires inchangés. Les `BookSnapshot` existants restent rattachés au livre et leurs manifestes conservent les références d'origine.
- La langue de la nouvelle édition est celle de l'édition source. La propriété `Book.status` revient à DRAFT : publier/déclarer une édition ne publie **jamais** la suivante.
- **Aucune** copie automatique d'EditorialComment, provenance de source ou scan ClamAV, pas de faux rattachement d'ancre ni de signature antivirus.

## Transaction et contrôle d'accès

- `GET /api/v1/books/{bookId}/editions` : session + membership, livre non archivé, liste des numéros/langues et nombre de chapitres **actifs**. `expectedUpdatedAt` et `currentEditionId` accompagnent la liste.
- `POST` : CSRF Origin, session, rôle OWNER/EDITOR, confirmation littérale, `expectedEditionId` et `expectedUpdatedAt` exigés. Transaction **Serializable** : lecture du livre et de la dernière édition, lecture SQL paramétrée de `DISTINCT ON (chapter_id)` en `sequence DESC`, contrôle d'intégrité de chaque chapitre, test de limite, `Book.updateMany` avec verrou optimiste, création édition/manuscrit/chapitres/révisions, audit `EDITION_CREATED` sans prose. Le schéma garantit l'unicité `(bookId,number)`.
- Maximum synchrone : **500 chapitres actifs, 20 MiB** de JSON + texte ; erreur 422 explicite sans état partiel. Les opérations plus grosses nécessitent un worker asynchrone à conception ultérieure.
- 409 pour conflits de version/édition ou défaut d'intégrité ; 404 pour l'ouvrage non accessible ; 403 CSRF ; 503 pour échec temporaire. Aucun ancien document n'est réécrit ni détruit.

## Lecture historique

`GET /books/{bookId}/editions/{editionId}` renvoie la structure et les métadonnées, jamais la prose. `GET /books/{bookId}/editions/{editionId}/chapters/{chapterId}` autorise les lecteurs dans le workspace et fournit **uniquement le texte brut** de la dernière révision enregistrée du chapitre de cette édition. Il n'existe pas de PATCH/DELETE historiques. L'UI affiche ce texte par React en tant que texte échappé (`<pre>`, pas de HTML interprété). Les formats riches, tableaux et images ne sont pas prévisualisés fidèlement dans cette première tranche.

## Concurrence, sécurité, performance

La transaction Serializable et le numéro d'édition protègent contre les créations concurrentes ; une écriture du Studio locale **non sauvegardée n'est pas copiée**. Le texte des chapitres n'est jamais envoyé au client lors de la duplication ; la fenêtre de lecture historique, après contrôle RBAC, l'affiche uniquement à son auteur ou à un collaborateur autorisé. `Cache-Control: private, no-store` pour toutes les routes. Pas de requête globale cross-tenant ni de secrets logués.

## Limites à poursuivre

L'historique est en lecture seule ; pas d'édition simultanée de différentes éditions, pas de fusion/rebase de chapitres, pas de clonage de commentaires, fichiers sources, métadonnées de scan ou de publication externe. La pagination d'une histoire contenant des centaines d'éditions et les copies asynchrones volumineuses constituent des tâches ultérieures ; ne pas fermer BS-004 parent #5 avant la recette globale.
