# E2E manuel v0.33.0-alpha — Dupliquer un chapitre (#167)

**CANDIDATE NON DÉPLOYÉE**. Ne pas fusionner ou déployer avant CI SUCCESS sur le SHA final et validation propriétaire `E2E v0.33.0-alpha BON`.

1. Ouvrir un livre de plusieurs chapitres, sauvegarder deux révisions distinctes d'un chapitre, ajouter un commentaire lié à sa dernière révision et créer un snapshot nommé du livre.
2. Dans le sommaire puis depuis l'éditeur, ouvrir le menu ⋯ d'un chapitre : l'action **Dupliquer ce chapitre…** doit apparaître pour OWNER/EDITOR ; pas pour les lecteurs. La fenêtre doit rester visible même si une carte ou un composant a un overflow CSS.
3. Vérifier l'avertissement : seul le texte **enregistré**, pas le brouillon local, sera copié. Dans l'éditeur, tenter la copie avec modifications non enregistrées : l'alerte anti-perte doit s'afficher ; sauvegarder d'abord.
4. Confirmer un nouveau titre. Le nouveau chapitre s'ouvre et apparaît **en dernière position** du sommaire, sans déplacer les autres chapitres. Son ID diffère du chapitre source ; sa **révision est 0** et son document JSON, ses retours à la ligne et le texte correspondent à la dernière révision enregistrée du chapitre source, pas à la version plus ancienne.
5. Vérifier le chapitre d'origine : identifiant, titre, révisions, commentaires et snapshots inchangés. Le nouveau chapitre n'a aucun commentaire ancien ni historique d'import/attestation de scan ; les snapshots ne sont pas modifiés. Le statut éditorial du livre revient à **Brouillon**.
6. Couper le réseau pendant la confirmation ; envoyer de nouveau **la même opération UUID** : HTTP 200 `replayed:true` avec l'ID original de la copie, sans deuxième chapitre. Un double clic rapide ne crée pas deux copies.
7. Tester l'API : sans cookie = 401, Origin supprimé = 403, autre workspace = 404, mauvais ID/titre/champs/confirmation = 400, séquence ou horodatage ou édition obsolète = 409, nombre de chapitres au-delà de 500 / taille hors limite = 422, corps >4KiB = 413. Aucun état partiel n'est laissé.
8. Après création d'une nouvelle édition, l'ancien chapitre ne peut plus être copié par la même route (404) ; les versions des éditions anciennes restent en lecture seule.
9. Vérifier la modale, les toasts, le parcours clavier (Tab/Shift+Tab/Escape), le mode FR/EN et clair/sombre, Chrome mobile 320/375/768px, réseau faible et navigation vers le nouveau chapitre.
10. CI finale obligatoire : `pnpm release:check`, `pnpm chapter-copy:check`, `pnpm test`, HTTP E2E PostgreSQL privé, `pnpm typecheck`, `pnpm build`. Toutes les pièces guide, conception, API, ops, QA, release, changelog et roadmap sont présentes dans **la PR avant mise en production** ; ClamAV isolé reste OFF.

**Après E2E propriétaire BON seulement** : snapshot Neon production avant fusion main, Vercel production main-only Preview OFF, tests health/version et journal de déploiement réel.
