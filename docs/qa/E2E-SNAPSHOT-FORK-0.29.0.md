# E2E v0.29.0-alpha — snapshot historique vers nouvelle édition (#155)

**Candidate strictement NON PUBLIÉE** jusqu’à CI verte sur SHA final et validation explicite propriétaire `E2E v0.29.0-alpha BON`.

1. Créer un livre de plusieurs chapitres, écrire/sauvegarder le contenu et nommer un snapshot. Noter nom, date, chapitres et **édition source** dans Versions & historique.
2. Modifier le texte après snapshot, retirer un chapitre puis créer une autre édition, éditer un nouveau chapitre et ajouter un chapitre absent du snapshot. Contrôler que le snapshot ancien se télécharge encore en DOCX/PDF/MD.
3. Versions & historique → menu `⋯` → **Restaurer dans une nouvelle édition** sur ce snapshot d’une ancienne édition. Lire attentivement l’avertissement : copie exacte du snapshot enregistré, statut Brouillon, nouveau numéro d’édition, aucune destruction, pas de commentaires/validations/imports copiés. Annuler une première fois : aucun changement.
4. Confirmer. La nouvelle édition devient courante ; seuls les chapitres **du snapshot** réapparaissent, dans l’ordre et avec leurs **textes enregistrés à l’époque**, avec nouveaux UUID et révision initiale 0. Les titres et la langue viennent de l’édition source ; les chapitres plus récents ne sont pas copiés dans cette nouvelle édition.
5. Consulter toutes les éditions antérieures (y compris celle active avant la restauration) en lecture seule et comparer ; confirmer que leurs textes, révisions, commentaires et exports de snapshot n’ont pas changé. Vérifier l’audit sans prose.
6. Faire la même requête depuis un autre onglet avec `expectedUpdatedAt`/`expectedEditionId` périmés : **409**, pas de doublon. Depuis un ancien onglet d’éditeur, tenter une sauvegarde sur le chapitre devenu historique : **404 ou 409**.
7. Contrats API : sans session 401, autre utilisateur hors espace 404, REVIEWER/VIEWER n’ont pas le bouton et mutation interdite, Origin manquante 403, confirmation/UUID/date invalides 400, snapshot étranger 404, intégrité brisée ou révision manquante 409, >500 chapitres ou 20 MiB 422. Une erreur doit être atomique sans édition partielle.
8. FR/EN, clair/sombre, Chrome mobile 320/375/768 px, desktop, clavier, Escape/clic dehors et réseau faible : bouton/confirmation/toasts contextualisés, absence de scroll bloqué et édition listée sans actualisation manuelle.
9. CI : `pnpm release:check`, `pnpm snapshot-fork:check`, `pnpm test`, `pnpm ui:check`, E2E HTTP PostgreSQL, `pnpm typecheck`, `pnpm build`, vérification runtime. Toutes les docs doivent être présentes *dans la PR* avant déploiement.
10. Vérifier **ClamAV non installé / OFF**. La restauration d’un snapshot ne doit jamais considérer une ancienne source comme analysée ou sûreté vérifiée.

**Publication** : attendre CI SUCCESS au SHA final documenté puis accord explicite E2E utilisateur, snapshot Neon **production protégée avant fusion**, fusion `main` uniquement, déploiement Vercel production sans Preview, contrôle des sondes santé/version et journal réel après READY. Aucun déploiement automatique depuis la branche feature.
