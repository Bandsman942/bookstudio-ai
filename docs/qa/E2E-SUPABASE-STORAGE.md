# E2E — v0.8.0-alpha : stockage privé Supabase

Issue #78. Environnement cible : Bookstudio AI by DTSC, bucket privé existant `Uploaded_books`, projet Supabase `nyzvarcnjvfmalfvkelc`.

## Préconditions
- Environnement privé seulement, stockage configuré par `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_STORAGE_BUCKET`. Ne jamais exposer la clé secrète.
- Vercel ne reçoit jamais d'octets du fichier source : seule l'autorisation est signée par l'API Next.
- `Uploaded_books` doit rester PRIVÉ ; aucun accès public au bucket. Supabase Storage stocke les fichiers, Neon conserve les ouvrages et ACL.
- Le compte OWNER/EDITOR et un second compte VIEWER avec accès au même livre.

## Recette propriétaire
1. Ouvrir un livre, vérifier « Fichiers sources » en clair/sombre et FR/EN, mobile (320px) / desktop.
2. Importer un DOCX puis PDF (< 20 Mo). Après envoi, confirmer un objet dans Supabase Storage : `Uploaded_books/books/<bookId>/<uuid>-nom.ext`.
3. Vérifier le téléchargement du PDF via URL signée privée, sans URL publique permanente.
4. Confirmer que la bibliothèque/chapitres existants et autosauvegarde sont intacts. L'import est un stockage de source, pas encore une conversion de chapitre.
5. Supprimer un objet après confirmation; il disparaît de la liste et du bucket.
6. Essayer .exe, nom malicieux, taille >20 Mo et MIME incohérent : rejet explicite.
7. Viewer peut lister/télécharger, mais ne voit pas le bouton d'envoi ou de suppression ; requêtes directes POST sign / DELETE renvoient un refus.
8. Un autre compte sans adhésion ne peut ni lister, ni signer, ni supprimer ; tester même en connaissant `bookId` et le nom du fichier.
9. Couper la connexion lors de l'envoi : message d'erreur, aucun faux succès. Rétablir, réessayer.
10. Supprimer volontairement une variable dans un environnement de test : message « Storage non configuré » sans divulgation d'API key.
11. Contrôler la console réseau : fichier envoyé directement vers `*.supabase.co/storage/v1/object/upload/sign/`, pas vers `*.vercel.app/api`.
12. Valider l'absence de logs contenant les URLs signées ou secrets ; le bucket demeure privé.

## Hors périmètre
Antivirus/DLP, OCR, import DOCX/PDF converti en chapitres, TUS pour fichiers volumineux, quotas multi-compte et sauvegarde/restauration des binaires : **non livrés**. Ne pas importer de manuscrits sensibles réels sans validation de la chaîne de contrôle antivirus et sauvegarde.
