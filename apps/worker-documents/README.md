# Worker documentaire — prototype hors ligne V0
Ce prototype traite des fichiers locaux DOCX sans uploads réseau. Il valide le type, limite les archives et extrait la structure principale sans exécuter de macros.

Ne pas confondre avec le service d'importation de production : stockage original, antimalware, OCR, extraction fidèle et comparaison sont à développer.

```bash
python -m unittest discover -s tests -v
python import_processor.py manuscrit.docx > extraction.json
```
L'import PDF n'est pas encore implémenté, il est rejeté explicitement.
