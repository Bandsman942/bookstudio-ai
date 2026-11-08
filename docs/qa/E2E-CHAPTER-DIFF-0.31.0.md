# E2E propriétaire v0.31.0-alpha — comparaison des révisions (#161)

**CANDIDATE NON PUBLIÉE**. Aucune fusion ni Vercel production avant CI SUCCESS au SHA final et validation `E2E v0.31.0-alpha BON`.

1. Ouvrir un chapitre, enregistrer une première rédaction et une deuxième avec mots ajoutés, supprimés et ponctuation changée. Laisser le chapitre **Enregistré**.
2. Dans **Historique**, trouver les sélecteurs **Révision de départ** et **Révision d'arrivée**. Choisir les deux sauvegardes ; cliquer **Comparer**. Vérifier titres, auteurs/dates et les segments en vert souligné (ajouts), rouge barré (suppression), ordinaire (invariants).
3. Comparer dans le sens inverse : les ajouts et suppressions s'inversent sans que l'un des textes ait été modifié. Tester l'identité de deux révisions contenant exactement le même texte (avant/après restauration), compteurs ajouts/suppressions 0. Les retours à la ligne et espaces sont fidèles.
4. Sélectionner deux numéros identiques : bouton désactivé, et GET manuel répond 400 ; essayer valeurs non entières, paramètres dupliqués/inconnus : 400. Numéro absent ou futur : 404.
5. Depuis un autre workspace, GET doit répondre 404 ; sans session 401. Un ancien chapitre devenu historique après nouvelle édition doit répondre 404. `Cache-Control: private,no-store`; pas de `contentHash` ni d'URL signée dans la réponse, pas d'appel IA.
6. Parcourir plus de 20 révisions avec **Charger les révisions précédentes** ; comparer deux versions anciennes chargées et l'actuelle. Aucune suppression ni duplication de lignes.
7. Charger un exemple de très grosse réécriture en dehors de la borne de calcul : 422 clair, **aucune troncature**. L'aperçu individuel et les exports du chapitre restent disponibles. L'opération est en lecture seule.
8. Texte avec accents, emoji, ponctuation et saut de ligne : couleurs et contraste lisibles, segment inséré/supprimé accessible au clavier et au lecteur d'écran ; aucun HTML exécuté. FR/EN, clair/sombre, Chrome mobile 320/375/768px, desktop, réseau faible et Escape/clic dehors.
9. Refaire une sauvegarde puis rouvrir le chapitre : l'éditeur, les versions et les snapshots précédents sont inchangés par la comparaison ; les commentaires restent associés à leurs révisions.
10. CI : `pnpm release:check`, `pnpm chapter-diff:check`, tests `pnpm test`, HTTP E2E PostgreSQL, `pnpm typecheck`, `pnpm build` et documentation user/design/OpenAPI/ops/QA/release/backlog **dans la PR**. ClamAV non installé, OFF.

**Livraison ensuite seulement** : snapshot Neon production protégée avant fusion `main`, déploiement Vercel production-only Preview OFF, sondes health/version, erreurs runtime et journal après READY.
