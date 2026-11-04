# BookStudio AI — E2E v0.18.0-alpha: sauvegarde et restauration privées (BS-010a3)

**Version candidate uniquement.** Utiliser un serveur/volume isolé hors Vercel et uniquement des données synthétiques ; ne jamais prélever de manuscrits clients avant la mise en place des ACL et du worker de stockage.

## Conditions de sécurité

- Dossier source, répertoire de restauration et coffre `vault` : chemins absolus, propriétaire unique, droits 0700 ; fichiers 0600. Refuser les symlinks, les chemins externes et les fichiers >20 Mio.
- Utiliser un coffre **privé par source** (l’inventaire exige un seul couple livre/source), distinct des dossiers source/restauration. Stockage du coffre **chiffré au repos**, sur un volume indépendant, avec réplication hors machine et rétention immuable au niveau du fournisseur. Le programme local seul ne fournit **ni chiffrement ni sauvegarde hors site**.
- Variable secrète `BOOKSTUDIO_BACKUP_HMAC_KEY` : 32 octets aléatoires hexadécimaux, configurée uniquement sur le worker isolé, dans un coffre de secrets, jamais dans Vercel, GitHub, les logs ou le navigateur.
- Le livre est identifié par son UUID ; l'ID de source est l'UUID généré devant le nom de stockage. Ne jamais passer le nom ni le contenu dans les manifestes de sauvegarde.

## Parcours

1. Créer un jeu d'octets **synthétiques**, calculer sa taille réelle et son SHA-256 sur un hôte isolé. Exécuter `create` avec `--vault`, `--source`, `--book-id`, `--source-id`, `--expected-size`, `--expected-sha256`.
2. Vérifier le statut `BACKUP_CREATED` et inventorier deux versions via `inventory`. Les versions doivent rester distinctes ; les manifestes contiennent identifiants, date, taille, hash et HMAC, pas les chemins privés.
3. Exécuter `verify` avec l'identifiant du livre, de la source et du backup ; attendre `BACKUP_VERIFIED`.
4. Exécuter `restore` avec `--destination` (nouveau chemin) et `--confirm RESTORE_NEW_COPY`. Comparer les octets et le SHA-256 sur un système indépendant. Le fichier original ne doit jamais être écrasé.
5. Corrompre les octets d'une copie ou le manifeste, changer l'ID du livre/source, fournir une mauvaise clé, des droits trop larges, un symlink et un fichier trop grand : **aucune restauration autorisée**.
6. Tester échec disque, interruption/copie partielle et reprise manuelle. Un `.pending-*` résiduel bloque l'inventaire : le traiter explicitement hors pipeline après investigation ; ne jamais le qualifier de sauvegarde fiable.
7. Vérifier que le JSON et les logs ne divulguent ni chemins ni texte d'un manuscrit.

## Critères avant mise en service

- Tests Python et CI réussis, et E2E utilisateur `v0.18.0-alpha BON` avant toute fusion.
- Un vrai essai sur stockage externe/replicat avec politique de rétention et preuves datées de récupération, vérification ACL et séparation des rôles est encore requis.
- Aucune intégration directe Supabase/Neon, aucune tâche planifiée ni restauration de manuscrit réel à cette version. Le statut ClamAV strict reste OFF ; l'issue #104 demeure ouverte.
