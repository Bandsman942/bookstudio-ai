# E2E v0.27.0-alpha — éditions multiples et préservation des manuscrits (#148)

**Candidat non fusionné / non publié.**

1. Ouvrir un ouvrage possédant plusieurs chapitres enregistrés (y compris un chapitre vide et un chapitre retiré). Dans **Éditions de l’ouvrage**, confirmer qu'une seule édition n°1 existe au départ, avec la bonne langue et le bon nombre de **chapitres actifs**.
2. Ouvrir **Créer une nouvelle édition** avec un compte OWNER/EDITOR après sauvegarde. Lire l'avertissement : copie des dernières sauvegardes, non copie des commentaires/imports, statut DRAFT. Confirmer : l'édition n°2 devient courante, les chapitres actifs apparaissent avec de **nouveaux IDs** et révision initiale 0, le texte doit être identique au dernier état sauvegardé.
3. Consulter **Édition 1 → Chapitre 1** en lecture seule ; texte historique intact, ancienne révision, aucune possibilité d'édition. Les commentaires et snapshots de la première édition ne doivent pas être détruits ; vérifier l'export Word/PDF/MD des anciens snapshots avant/après création.
4. Créer une version nommée dans la nouvelle édition ; vérifier que ses chapitres ne remplacent pas les anciens. Les versions existantes doivent rester listées.
5. Tenter la création depuis un ancien onglet avec `expectedEditionId` ou `expectedUpdatedAt` périmé : HTTP 409, aucun numéro en double. Requête avec confirmation erronée : 400 ; sans Origin : 403 ; autre workspace : 404 ; sans session : 401.
6. En VIEWER/REVIEWER, consulter l'historique mais ne pas voir le bouton création. Vérifier le refus de la mutation API. Un livre archivé n'est pas accessible sans restauration.
7. Vérifier que les chapitres retirés ne sont pas dupliqués. Ne pas recopier automatiquement commentaires ancrés, sources originales et verdicts antivirus. L'historique doit rester accessible après renommage d'un chapitre dans la nouvelle édition.
8. Mobile 320/375/768 px, desktop, clair/sombre, FR/EN : liste des éditions, modal, lecture longue avec scroll, focus clavier et Escape, messages contextualisés, réseau faible.
9. Les très grosses copies (plus de 500 chapitres ou 20 MiB de données texte/JSON) doivent être refusées 422 **sans perte**, et signalées comme nécessitant un pipeline asynchrone (non disponible dans ce lot).
10. CI : tests unitaires/HTTP E2E PostgreSQL, `pnpm typecheck`, `pnpm build`, `pnpm release:check` vérifiant la documentation complète **avant** toute publication. ClamAV dédié non installé et scanner OFF.

**Publication interdite** sans validation propriétaire `E2E v0.27.0-alpha BON`, CI SUCCESS au dernier SHA documenté, snapshot Neon, fusion `main`, Vercel production-only Preview OFF, health/version et journal réel.
