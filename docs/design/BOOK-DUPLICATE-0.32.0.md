# BS-004f — duplication d'un ouvrage, version 0.32.0-alpha

## Objectif

Depuis une carte de Bibliothèque ou la fiche d'un ouvrage, un membre OWNER/EDITOR peut créer un nouveau livre indépendant à partir du manuscrit courant enregistré. Il saisit un nouveau titre, confirme la portée de la copie, puis ouvre automatiquement le nouveau livre DRAFT.

## Intégrité de la duplication

L'endpoint POST /api/v1/books/{bookId}/duplicate prend une confirmation forte DUPLICATE_BOOK_FROM_SAVED_EDITION, un operationId UUID idempotent, expectedEditionId, expectedUpdatedAt et le titre normalisé (2 à 180 caractères). Une transaction PostgreSQL Serializable verrouille la ligne livre de la source au moyen de SELECT FOR UPDATE après vérification par jointure de la membership OWNER/EDITOR. Les sauvegardes concurrentes et changements d'édition empruntent le même verrou.

Les chapitres copiés sont exclusivement les chapitres actifs de l'édition la plus récente. Le serveur charge la révision avec sequence exactement égale à chapter.revisionSeq, vérifie la structure JSON, le texte et l'empreinte stockée. Il interdit toute troncature, impose 500 chapitres actifs et 20 MiB au maximum de texte et JSON, puis crée atomiquement un nouveau Book (même workspace, owner = acteur, type et langue préservés, status DRAFT), une édition numéro 1, un manuscrit, des nouveaux UUID de chapitres en position identique et leurs révisions numéro zéro.

Le livre source et toutes ses révisions, éditions, commentaires et snapshots demeurent inchangés. Les tables BookSnapshot, EditorialComment, ManuscriptSourceImport, SourceSecurityRecord, SourceScanJob, permissions, invitations et les objets Supabase ne sont jamais recopiés, créés ni rattachés au nouveau livre. En particulier, aucun état antiviral SCANNED_CLEAN n'est inventé. Les JSON de contenu révisionnel sont recopiés sans interprétation et leurs empreintes d'origine sont conservées (compatibilité historique JSONB).

Un événement BOOK_DUPLICATED sur le livre source journalise l'acteur, le UUID d'opération, le nouveau livre, l'édition de départ et le nombre de chapitres, mais aucune prose. Sous verrou du livre, un retry du même operationId recherche cet événement et renvoie l'ID existant avec HTTP 200, sans créer un nouveau livre.

## Erreurs et exploitation

HTTP 201 pour création, 200 pour replay, 400 titre/confimation/champ invalide, 401 session absente, 403 origine non autorisée, 404 workspace inaccessible ou rôle insuffisant, 409 précondition/source corrompue, 413 corps >4 KiB, 422 taille hors limites et 503 incident transactionnel. L'échec annule l'ensemble de la transaction. Aucune migration Prisma ni nouvelle variable Vercel, rollback applicatif possible sans supprimer les copies déjà créées.

## Interface

La commande Dupliquer le livre… utilise BookActionsMenu partagé par la Bibliothèque et la fiche. Le dialogue est rendu hors de la carte grâce à un portail DOM ; il explique clairement que les brouillons locaux et les sources, commentaires, scans et historiques ne sont pas transférés. Il lit GET /editions immédiatement avant la confirmation pour les préconditions, bloque les doubles clics, garde le même operationId en cas de retry réseau, affiche des toasts FR/EN contextualisés et ouvre l'ouvrage copié après HTTP 201/200. Respect mobile, clavier, thème clair/sombre.

## Tests

Tests unitaires du plan (révision exacte, positions et UUID source, limites, corruption, cas vide), et E2E HTTP PostgreSQL sur deux chapitres sauvegardés, snapshot/commentaire initial, nouvelles IDs, contenu exact, révision 0, statut DRAFT, absence de sources/commentaires/snapshots hérités, replay idempotent, 401/403/404/409 et source conservée. Ne pas annoncer de copie des fichiers Supabase.

## Précision RBAC multi-tenant

La propriété ownerId du nouveau livre est attribuée à l'acteur, **mais l'autorisation de consultation est fondée sur l'appartenance au workspace**. Puisque le livre est créé dans le **même espace**, les membres déjà autorisés peuvent consulter ou modifier la copie selon leurs rôles. L'API **n'ajoute aucune membership, aucun rôle ou invitation**, mais ne constitue PAS un mécanisme d'isolement privé entre membres du même workspace.
