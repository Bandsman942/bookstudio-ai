# BS-004g — duplication sûre d'un chapitre (v0.33.0-alpha)

## Contrat métier

Un auteur ayant accès en écriture à un livre doit pouvoir dupliquer un **chapitre actif** dans la dernière édition de ce même livre, sans effacer son texte ni son historique. L'action apparaît dans le menu contextuel ⋯ de chaque chapitre (sommaire et éditeur). Elle demande un nouveau titre et explicite que la **dernière révision enregistrée** est copiée, mais jamais les brouillons locaux non sauvegardés.

Un chapitre **distinct**, à la **fin du manuscrit courant**, est créé avec une nouvelle clé primaire UUID, un titre indépendant, la position maximale existante + 1 (y compris chapitres supprimés, pour ne pas violer la contrainte unique) et **une seule** révision numéro 0 dont le JSON ProseMirror, texte et hash sont recopiés à l'identique depuis la révision de séquence `chapter.revisionSeq`. Les anciennes révisions, les snapshots, les commentaires, ancres et métadonnées d'import ainsi que les objets de stockage et attestations antivirus ne sont **jamais** copiés. La copie est un nouveau chapitre éditorial, donc le statut du livre repasse à `DRAFT` pour invalider les validations antérieures. Les autres chapitres ne sont ni déplacés ni modifiés.

## API et intégrité transactionnelle

`POST /api/v1/books/{bookId}/chapters/{chapterId}/duplicate` avec JSON strict comprenant `confirm:"DUPLICATE_CHAPTER_FROM_SAVED"`, `title`, `operationId` UUID, `expectedEditionId`, `expectedRevision`, `expectedChapterUpdatedAt`.

La route valide l'origine CSRF, l'utilisateur, le workspace et rôle OWNER/EDITOR ; seul un livre non archivé et un chapitre non retiré de l'édition **courante** peuvent être copiés. La transaction Serializable verrouille le livre `FOR UPDATE OF b` après une jointure `memberships` autorisée, puis retrouve l'édition et la révision sous le verrou. L'édition, la séquence et `updatedAt` du chapitre doivent concorder avec les préconditions. Les sauvegardes du Studio utilisent aussi le verrou livre, évitant de sélectionner une révision pendant sa modification. L'éventuelle concurrence avec les changements d'ordre se solde par un rollback 409.

- `201` : nouveau chapitre (ID, titre, révision 0, position), `replayed=false`.
- `200` : reprise idempotente par le même `operationId`, associé à un audit `CHAPTER_DUPLICATED` portant acteur, ID source, ID nouveau chapitre, édition, séquence, position, **sans prose**. Sous le verrou, répétition = même ID, aucune deuxième création.
- `400` : schéma, ID, titre ou confirmation invalides ; `401` : utilisateur absent ; `403` : Origin interdit ; `404` : livre ou chapitre actuel absent/inaccessible (y compris ancienne édition ou autre tenant).
- `409` : chapitre ou édition a changé, tentative de révision obsolète, source manquante ou non conforme, collision concurrente ; `413` : JSON > 4096 octets ; `422` : plus de 500 chapitres actifs ou >20 MiB de document/texte ou position impossible ; `503` : échec transactionnel sans ligne partielle.

La vérification de structure `assertValidDocument` couvre les nœuds pris en charge, sans modifier le JSON et sans recalculer l'ancien hash sérialisé avant JSONB. Un contrôle du nombre de chapitres et du poids total de la révision copiée évite les opérations démesurées. Pas de migration Prisma, nouveau secret, worker ou activation de ClamAV. Le rollback de version conserve les copies déjà faites comme chapitres ordinaires.

## Interface et qualité

`ChapterActionsMenu` partagé : action FR `Dupliquer ce chapitre…` / EN `Duplicate this chapter…`, dialogue rendu par portail DOM hors des cartes, champ titre auto-rempli `Copie de X`, avertissement sur les brouillons, confirmation et toasts contextualisés ; bouton désactivé pendant l'opération, `Escape`, piège de focus Tab et adaptation mobile. Avant ouverture et avant envoi, `beforeNavigate` protège les brouillons dans l'éditeur. Le client recharge l'édition courante juste avant POST, réutilise le même UUID si une tentative réseau est incertaine, puis ouvre le chapitre copié.

CI : `pnpm chapter-copy:check`, tests HTTP PostgreSQL multi-tenant de deux révisions, commentaire/snapshot originaux non copiés, nouvel ID et révision 0, idempotence, préconditions 409, accès 401/403/404, chapitre de l'ancienne édition 404, états du livre et documentation complète dans la PR avant publication.
