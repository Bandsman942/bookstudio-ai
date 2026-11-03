# E2E — v0.12.0-alpha : DOCX revu → nouveau chapitre (BS-006b)

## Préconditions
App alpha privée, comptes OWNER, EDITOR, VIEWER et tiers externe ; ouvrage avec chapitre existant. Importer un DOCX de test simple dans Uploaded_books, puis le prévisualiser.

## Scénarios
1. Ouvrir « Prévisualiser DOCX », vérifier la fidélité *non garantie* et les avertissements. Tant que la case de consentement n'est pas cochée, aucune création n'est possible. Modifier le titre du chapitre puis confirmer.
2. Une nouvelle page d'éditeur doit s'ouvrir avec **un nouveau chapitre**, contenant le texte simple de l'aperçu, titres et paragraphes ; l'ancien chapitre/revision est inchangé. Source DOCX conservée dans Supabase.
3. Sur un DOCX avec aperçus tronqués (>200 paragraphes ou >100 000 caractères), impossible de créer un chapitre à partir de l'aperçu incomplet. Les fichiers avec tableaux/images/notes restent soumis à une validation humaine explicite ; les omissions sont visibles.
4. Cliquer deux fois / couper le réseau après le POST confirmé puis réessayer **avec la même clé opération UUID** : un seul chapitre créé. Réutiliser la clé pour un contenu différent : 409 DOCX_OPERATION_CONFLICT.
5. Vérifier qu'une suppression de source déjà importée donne 409 SOURCE_IN_USE (elle doit rester restaurable en lecture).
6. VIEWER/REVIEWER : aperçu autorisé selon ACL mais **aucun bouton de création** ; POST direct interdit. Compte non membre, anonyme et CSRF : 404/401/403. Faux sourceName dans un autre ouvrage : refus.
7. Tester source manquante, MIME non DOCX, contenu invalide, confirmation absente, titre trop court, 201 succès, messages FR/EN, clavier, 320/375/768/1440px, zoom et thèmes clair/sombre.
8. Depuis base de données (environnement de test uniquement), vérifier une seule ligne ManuscriptSourceImport, une DocumentRevision séquence 0, hash, AuditEvent sans texte de manuscrit. Confirmer que les snapshots et exports sont indépendants.
9. Vérifier que le binaire DOCX transite **directement** de Supabase au navigateur ; seul le **texte explicitement validé** est soumis à l'API BookStudio pour le créer en chapitre. Pas d'appel IA.
10. Régression bibliothèque, recherche, archives, commentaires, historique, autosauvegarde en connexion faible, exports DOCX/PDF.

## Publication
Avant de fusionner la PR : CI + migration sur Neon isolée + **E2E v0.12.0-alpha BON**. En production, snapshot Neon et migration additive suivis de READY/health/version. Aucune preview Vercel.
