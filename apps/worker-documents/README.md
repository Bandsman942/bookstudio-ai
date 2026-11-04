# Worker documentaire BookStudio — prévalidation DOCX hors ligne

Le worker valide un document Office Open XML et en extrait **une prévisualisation** des titres/paragraphes.
Il refuse les archives dépassant les quotas, les liens de traversal, symlinks, doublons, contenu actif,
XML avec entités/DTD, archives corrompues et taux de compression suspects.

**Ceci n'est pas une fonctionnalité d'import DOCX utilisable en production** : aucun endpoint HTTP,
stockage du fichier original, analyse antivirus, queue, approbation éditoriale ou garantie de fidélité.

```sh
python -m unittest discover -s apps/worker-documents/tests -v
python apps/worker-documents/import_processor.py manuscrit.docx > extraction.json
```

Les fichiers PDF sont rejetés de manière explicite. Les tableaux, images, notes et liens externes
exigent une revue humaine et ne sont pas encore transformés fidèlement dans l'éditeur.

Recette : `docs/qa/E2E-DOCX-INSPECTION.md`.

## Adaptateur antivirus hors Vercel — candidat v0.17.0-alpha (BS-010a2)

`source_guard.py` est un **composant hors ligne pour worker isolé**, pas encore un
service branché sur l'application. Il copie un fichier privé local en mode exclusif
`0600`, contrôle les octets et SHA-256 (maximum 20 Mio), exécute **le vrai ClamAV**
en chemin absolu `/usr/bin/clamscan`, puis vérifie que les octets analysés n'ont
pas changé. Un binaire absent, une erreur, un dépassement de temps ou une
altération échouent explicitement ; aucune sortie brute du moteur ni aucun
contenu du manuscrit n'est renvoyé.

ClamAV charge les signatures préparées par `freshclam`. Les options de scan
signalent les archives chiffrées ou dépassant ses plafonds au lieu de les
considérer silencieusement comme sûres. Un fichier positif n'est jamais supprimé
de Supabase par cet adaptateur : il reste soumis au workflow de quarantaine.

Exécution **uniquement dans un environnement isolé et privé** :

```sh
python apps/worker-documents/source_guard.py --source /private/input/manuscrit.docx \
  --expected-size 12345 --expected-sha256 <sha256_64_caracteres>
```

Sorties JSON sans nom ni texte, avec `SCANNED_CLEAN`, `REJECTED` ou
`SCAN_UNAVAILABLE` ; codes processus 0, 2, 3 respectivement. Le verdict de ce
module **ne doit pas encore être écrit dans `source_security_records`** : la
chaîne d'identité/autorisation du worker, l'intégrité de l'objet Supabase, les
attestations signées, la quarantaine physique et la reprise sont à construire.
La configuration production `BOOKSTUDIO_REQUIRE_SCANNED_SOURCES` reste `false`.

Tests du contrat :

```sh
python -m unittest discover -s apps/worker-documents/tests -v
```

Recette **réelle facultative**, après installation supervisée de ClamAV et de
ses signatures dans un bac à sable (jamais Vercel) : voir
`docs/qa/E2E-ISOLATED-SOURCE-GUARD-0.17.0.md`. Ni les mocks ni une CI verte
ne constituent une preuve d'analyse antivirus réelle.

## Prévisualisation Web v0.11.0-alpha (BS-006a)
Une inspection consultative complémentaire peut être effectuée **localement dans le navigateur** depuis des sources DOCX Supabase privées, avec quotas ZIP et avertissements. Cela ne rend pas le worker Python utilisable comme service de production. Les chapitres ne sont pas créés automatiquement ; aucun antivirus/restauration n'est déclaré disponible. Voir `docs/qa/E2E-DOCX-PRIVATE-PREVIEW.md`.

## Vérification de sauvegarde/restauration locale (candidate v0.18.0-alpha)

`source_backup.py` crée des versions append-only de fichiers **déjà matérialisés dans un worker isolé**, conserve un manifeste privé signé HMAC, vérifie la taille et SHA-256 et restaure vers un **nouveau fichier seulement**. Pas de sauvegarde automatique des objets Supabase. Exiger des répertoires privés 0700, fichiers 0600 et `BOOKSTUDIO_BACKUP_HMAC_KEY` de 64 caractères hexadécimaux (32 octets), exclusivement en environnement isolé. Cette clé ne doit jamais être envoyée au navigateur ni au serveur Vercel.

```sh
python apps/worker-documents/source_backup.py create --vault /private/vault --source /private/input/test.bin --book-id UUID --source-id UUID --expected-size BYTES --expected-sha256 HEX
python apps/worker-documents/source_backup.py inventory --vault /private/vault --book-id UUID --source-id UUID
python apps/worker-documents/source_backup.py verify --vault /private/vault --book-id UUID --source-id UUID --backup-id UUID
python apps/worker-documents/source_backup.py restore --vault /private/vault --book-id UUID --source-id UUID --backup-id UUID --destination /private/restore/new.bin --confirm RESTORE_NEW_COPY
```

Réplication indépendante, chiffrement au repos, preuve de restauration et contrôle ACL restent à réaliser avant tout usage sur les manuscrits utilisateurs. Voir `docs/qa/E2E-SOURCE-BACKUP-0.18.0.md`.
