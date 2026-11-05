# E2E v0.21.0-alpha — raccordement worker ClamAV isolé (#131)

## Préparation
Utiliser **un hôte Linux isolé**, non Vercel, des fichiers synthétiques non
confidentiels et une base de recette distincte. Installer et mettre à jour
ClamAV/`freshclam`. Deux secrets M2M hexadécimaux indépendants et un
compte système non privilégié ; ne jamais écrire les secrets dans les logs,
PR ou conversations. API HTTPS et origine Supabase autorisée explicitement.

## Parcours obligatoires
1. Avec flags OFF, POST claim/report sans authentification, mauvais jeton,
   origine browser et attestation invalide : aucun manuscrit, aucune URL
   signée ; réponse refusée. Les manuscrits restent `UNSCANNED`.
2. Sur **environnement de recette isolé**, activer les flags de file et
   worker. Importer un DOCX synthétique et vérifier `QUEUED`, puis
   réservation atomique `LEASED`, statut source `SCANNING`, token de bail
   uniquement en mémoire et URL signée Supabase (90 s).
3. Tester redirection HTTP 3xx, hôte falsifié, taille 0, 20 Mio+,
   téléchargement tronqué et timeout. Le worker doit rejeter les URL
   externes et ne jamais charger les octets via la fonction Vercel.
4. Analyser un document inoffensif et un fichier EICAR de test sur le
   serveur ClamAV **réel**, signatures récentes ; conserver une preuve
   datée du moteur, de ses signatures et du nombre de rejets. Sans
   détection, le statut applicatif est obligatoirement
   `SCAN_PENDING_PROMOTION` (PAS `SCANNED_CLEAN`).
5. Envoyer une attestation HMAC forgée, horodatée >5 min, avec mauvaise
   génération, source différente, livre différent, mauvais bail ou nonce
   rejoué : la transaction doit refuser et ne jamais libérer la source.
6. Interrompre le worker après claim : vérifier expiration/réservation,
   maximum de trois tentatives, report `SCAN_UNAVAILABLE`, reprise
   et absence de double décision.
7. Reconfirmer ou supprimer une source **pendant** la réservation ;
   l'ancien résultat devient définitivement caduc. Vérifier multi-tenant
   et RBAC sans fuite de liens signés.
8. Source `REJECTED` : téléchargement et import DOCX refusés quel que soit
   le flag strict. Vérifier UI FR/EN et messages contextualisés.
9. Vérifier aucun manuscrit, URL signée, token, clé, extrait du texte,
   nom de fichier source privé ou empreinte brute dans les logs et traces.
10. Constater que **la promotion immuable, la quarantaine physique et la
    sauvegarde répliquée ne sont pas encore mises en service** : #126/#104.
    Ne pas activer le flag strict sur des manuscrits historiques.

## Livraison
CI Node/Python/E2E Postgres, `E2E v0.21.0-alpha BON` propriétaire,
snapshot Neon, fusion main uniquement, aucune Preview. Flags
`BOOKSTUDIO_SCAN_WORKER_ENABLED` et `BOOKSTUDIO_SOURCE_SCAN_QUEUE_ENABLED`
restent OFF dans Vercel jusqu'à déploiement testé de l'hôte isolé.
