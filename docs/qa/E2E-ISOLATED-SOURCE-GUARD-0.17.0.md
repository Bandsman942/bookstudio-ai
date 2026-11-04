# E2E v0.17.0-alpha — moteur ClamAV isolé, BS-010a2 (#120)

**Environnement dédié obligatoire :** machine ou conteneur sans exposition
publique, utilisateur non privilégié, filesystem de travail privé, quotas CPU/RAM,
sorties réseau limitées aux mises à jour ClamAV. Aucun secret Neon, Supabase ou
manuscrit client nécessaire pour cette première tranche. Ne pas exécuter sur Vercel.

## Préparation

1. Installer un ClamAV officiel compatible, vérifier que `/usr/bin/clamscan`
   existe et est un binaire exécutable non-symlink, et mettre à jour les signatures
   via `freshclam` dans l'environnement isolé.
2. Vérifier `clamscan --version`, l'âge de la base de signatures et les
   ressources hôte. Désactiver le service si les signatures sont manquantes,
   obsolètes (plus de 48 h pour `daily.cvd`/`daily.cld` sous `/var/lib/clamav`)
   ou si le processus est non supervisé. Utiliser un répertoire de signatures
   approuvé, non modifiable par l'utilisateur du worker.
3. Fournir un **fichier EICAR officiel de test**, dans un dossier d'essai privé.
   Il ne s'agit pas d'un vrai virus ; ne jamais le mélanger aux données client.
   Définir localement `BOOKSTUDIO_EICAR_TEST_FILE` avec son chemin et
   `BOOKSTUDIO_E2E_REAL_CLAMAV=1`.
4. Lancer `python -m unittest discover -s apps/worker-documents/tests -v`.
   Les tests unitaires et le test réel clean/EICAR doivent être verts ; le test
   réel ne doit **pas** être marqué `skipped`.

## Scénarios de refus obligatoires

- Scanner supprimé/indisponible, sorties moteur 2, arrêt forcé, expiration du
  délai : `SCAN_UNAVAILABLE`, jamais `SCANNED_CLEAN`.
- Fichier plus grand que 20 Mio, symlink, SHA attendu incorrect, taille fausse :
  refus avant le scanner.
- Fichier chiffré ou dépassant les limites du moteur : alerte, jamais succès
  silencieux. Contrôler les options `--alert-exceeds-max=yes` et
  `--alert-encrypted=yes` dans la commande réellement exécutée.
- Source modifiée pendant la copie ou le fichier de scan modifié : aucun verdict
  propre accepté.
- Aucun chemin privé, nom de fichier ou extrait binaire dans les JSON/logs.

## Hors périmètre et prochaine tranche de #104

Cette recette ne prouve pas encore la sécurité bout-en-bout : le téléchargement
privé Supabase par worker privilégié, la file de jobs, l'attestation vérifiée,
les états `QUEUED/SCANNING`, la séparation réelle des buckets quarantaine/validés,
la révocation des accès, la sauvegarde/restauration binaire avec checksum et le
contrôle des ACL restent à livrer. **Ne pas activer le mode strict en production.**

Références : documentation officielle
`https://docs.clamav.net/manual/Usage/Scanning.html`,
`https://docs.clamav.net/manual/Usage/SignatureManagement.html`,
`https://supabase.com/docs/guides/storage/buckets/fundamentals`.
