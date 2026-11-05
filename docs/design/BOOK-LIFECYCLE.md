# Cycle de vie et propriétés des ouvrages (BS-004 #5 / #136)

**Version de conception : v0.23.0-alpha (candidate NON déployée)**

## Domaines séparés

- **Livre** (`Book`) : `title`, `bookType`, `language`, `status`, `updatedAt`, `archivedAt`.
- **Éditions** : langue éditoriale `Edition.language`, indépendante de la langue de référence du livre ; modifier `Book.language` **ne traduit pas** le texte et ne modifie aucune édition.
- **Manuscrit, révisions et snapshots** : invariants d'intégrité inchangés par les actions de ce lot.
- **Archivage** : `archivedAt` distinct du workflow `status`. Un ouvrage archivé ne peut être modifié sans restauration. `ARCHIVED` n'est pas proposé comme statut éditorial.

## Transitions contrôlées

| État source | Étapes suivantes permises |
|---|---|
| DRAFT | WRITING |
| WRITING | REVIEW |
| REVIEW | WRITING, APPROVED |
| APPROVED | REVIEW, PRODUCTION |
| PRODUCTION | REVIEW, PUBLISHED |
| PUBLISHED | Aucune (archivage géré séparément) |

Les transitions proviennent de `transitionAllowed()` dans `@bookstudio/domain`. `PUBLISHED` représente seulement une **déclaration manuelle** ; il n'envoie pas de fichier, ne déclenche pas EPUB/PDF ni publicité. Aucun automatisme de promotion du livre.

## Contrat API

`PATCH /api/v1/books/{bookId}` : `action=properties` exige `bookType` parmi GENERAL/NOVEL/ESSAY/SCIENCE/MEDICINE/EDUCATION et `language` parmi fr/en. `action=status` exige `status` parmi DRAFT/WRITING/REVIEW/APPROVED/PRODUCTION/PUBLISHED. Pour toute modification, fournir `expectedUpdatedAt` de la dernière fiche.

La route exige session, Origin de même site, RBAC OWNER/EDITOR, livre du workspace accessible et non archivé, contrôle optimiste `updatedAt`, transaction PostgreSQL Serializable, `BOOK_PROPERTIES_UPDATED` ou `BOOK_STATUS_CHANGED` dans `AuditEvent` (métadonnées non sensibles seulement). Erreurs : 400 invalid, 401 session, 403 CSRF, 404 tenant/archive, 409 métadonnées obsolètes, 422 transition invalide, 503 transaction. Aucune source ni empreinte du manuscrit dans les réponses d'audit.

## UI et accessibilité

Dans les menus contextuels `BookActionsMenu` des cartes de bibliothèque et de la vue d'ensemble, les éditeurs disposent des formulaires accessibles `BookPropertiesDialog`. Les rôles lecteur ne voient pas ces commandes. Localisation FR/EN ; ToastProvider contextuel et non générique ; responsivité mobile/desktop. Confirmer après sauvegarde et rafraîchir le contexte.

## Limites connues

Ce lot ne traite pas la pagination serveur de bibliothèque, la duplication d'ouvrage, une publication externe ni le scanner antivirus en exploitation. La sécurité documentaire P0 reste ouverte et différée à la demande du propriétaire jusqu'à installation du serveur ClamAV dédié.
