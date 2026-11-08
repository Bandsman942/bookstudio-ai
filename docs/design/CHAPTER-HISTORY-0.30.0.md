# BS-008d — Historique et restauration ciblée du chapitre (v0.30.0-alpha)

## Problème et portée

Après les snapshots globaux, la duplication des éditions et la restauration historique v0.29, l'auteur n'avait pas de vue chronologique des **révisions successives d'un seul chapitre**. La nouvelle interface **Historique** du Studio peut lister/ouvrir chaque révision et, avec les droits OWNER/EDITOR, recréer son contenu dans une *nouvelle* révision du chapitre courant. Les anciennes éditions sont strictement hors du périmètre de cette route (leurs chapitres restent consultables ailleurs).

## Contrats

- `GET /books/{bookId}/chapters/{chapterId}/revisions?limit=20&before=N` : liste keyset (séquence desc.), `limit` 1–50, `before` entier sûr et strictement inférieur à la prochaine séquence ; pas d'OFFSET ni de chargement du contenu. Retourne séquence, auteur (nom affiché), date, curseur, révision courante. Validation des IDs, espace privé et édition courante; 404 si livre archivé/chapitre retiré/historique.
- `GET .../revisions/{sequence}` : texte brut d'une révision choisie, prénom/nom public du compte auteur, timestamp, flag `isCurrent` ; aucun HTML ou JSON éditable exposé par l'aperçu. Rendu React dans `<pre>` avec échappement automatique.
- `POST .../revisions/{sequence}` : confirmation `RESTORE_CHAPTER_REVISION` + `expectedRevision`, anti-CSRF Origin, RBAC OWNER/EDITOR. `FOR UPDATE` sur le livre en transaction `Serializable`, revalidation membership, édition actuellement la plus récente et séquence cible < séquence courante. Copie du JSON ProseMirror validé (via `assertValidDocument`), texte et empreinte du **record historique ciblé** dans la révision `expectedRevision+1`. Aucun UPDATE/DELETE de l'enregistrement historique. Retour 200 avec nouveau numéro ; statut livre devient `DRAFT`.
- Erreurs : 400 requête invalide, 401 non authentifié, 403 CSRF, 404 hors périmètre, 409 concurrence ou source manquante, 413 JSON > 2 KiB, 422 cible courante. Journal `CHAPTER_REVISION_RESTORED` avec acteur, date automatique, bookId, ancienne/nouvelle séquence ; **aucune prose**.
- L'historique complet peut comprendre de très nombreuses révisions : liste paginée sans plafond fixe au nombre de révisions ; la lecture d'un texte entier n'est déclenchée qu'à l'ouverture explicite. La taille d'un aperçu individuel dépend de la taille de la révision, sans troncature silencieuse.

## UI et robustesse

- Bouton **Historique** dans la barre du Studio, modale portalisée vers `document.body` (ne pas clipper sous CSS transform/overflow), accès clavier, Escape, clic hors modale, responsive jusqu'à 320px, modes clair/sombre et FR/EN.
- OWNER/EDITOR restaurent après seconde confirmation ; aucun bouton de restauration pour VIEWER/REVIEWER. L'UI bloque la commande si le Studio a des modifications en cours, du brouillon récupérable, un conflit ou une sauvegarde active. En cas de version devenue périmée côté serveur, la transaction renvoie 409.
- Après succès, le router Next actualise le Server Component qui transmet la révision comme partie de la clé `StudioEditor`, provoquant une réinitialisation cohérente de l'éditeur avec le contenu réellement sauvegardé. Les toasts contextualisés confirment succès/erreurs.
- Aucune transmission IA, aucun rôle ou secret DTSC partagé. Pas de migration, worker ni variable. ClamAV reste désactivé.
## Rollback

Le rollback applicatif est sans purge : les lignes de révision ajoutées sont des révisions ordinaires compatibles avec v0.29. Vérifier les sauvegardes Neon avant déploiement ; éviter la suppression de révisions manuelles pendant les tests. Priorité aux tests de conflits du passage à une nouvelle édition et de restauration concurrente.
