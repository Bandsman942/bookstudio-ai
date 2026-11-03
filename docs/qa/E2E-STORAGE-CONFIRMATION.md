# E2E — v0.9.0-alpha : confirmation serveur de source Supabase

Issue #84. Bucket `Uploaded_books` privé ; production v0.8.0 à préserver jusqu'à validation.

1. OWNER : téléverser un DOCX et un PDF <20 Mio ; le panneau n'affiche « Fichier confirmé par le serveur » qu'après POST `action=confirm` HTTP 200. Vérifier dans les DevTools que l'upload binaire est un PUT vers Supabase, jamais vers Vercel.
2. Sur un nouveau fichier de test, interrompre le réseau entre PUT et confirmation : l'interface doit indiquer « non confirmé » et pouvoir être actualisée sans modifier le livre.
3. En test sécurisé, demander la confirmation d'un nom inexistant dans le préfixe de l'ouvrage : HTTP 404 SOURCE_NOT_FOUND ; mauvaise taille : HTTP 409 SOURCE_SIZE_MISMATCH ; type MIME Storage incohérent : HTTP 409 SOURCE_TYPE_MISMATCH.
4. Un VIEWER / REVIEWER, un compte externe, un utilisateur déconnecté et un autre livre ne doivent jamais pouvoir confirmer un upload. Les contrôles d'origine doivent rejeter une requête intersite.
5. Envoyer un fichier de plus de 20 Mio : refus côté UI/API et côté bucket Supabase, pas seulement au navigateur. Vérifier que le bucket demeure privé.
6. Vérifier la liste, téléchargement signé, suppression avec confirmation, thème clair/sombre, FR/EN et mobile 320px ; valider le maintien de l'autosauvegarde du manuscrit, des révisions et des exports.
7. Vérifier les journaux : aucun contenu, URL signée, clé ni texte de manuscrit ; événement `BOOK_SOURCE_UPLOAD_CONFIRMED` après contrôle réussi seulement.

**Hors périmètre :** scanner antivirus, vérifier les octets du fichier, OCR, convertir les fichiers sources en chapitres, backups et restauration. Les manuscrits sensibles réels ne sont pas concernés par cette recette.
