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

## Prévisualisation Web v0.11.0-alpha (BS-006a)
Une inspection consultative complémentaire peut être effectuée **localement dans le navigateur** depuis des sources DOCX Supabase privées, avec quotas ZIP et avertissements. Cela ne rend pas le worker Python utilisable comme service de production. Les chapitres ne sont pas créés automatiquement ; aucun antivirus/restauration n'est déclaré disponible. Voir `docs/qa/E2E-DOCX-PRIVATE-PREVIEW.md`.
