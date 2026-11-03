# Contrat d'agents — BookStudio AI

- Produit autonome. Ne pas modifier `Bandsman942/dtsc-platform` depuis ce projet.
- Jamais de secrets dans le dépôt, les tests, les issues, les captures ou les logs.
- Source de vérité initiale : `DocumentRevision` immutable + pointeur `Chapter.revisionSeq` ; aucun CRDT concurrent implicite.
- Manuscrits privés par défaut ; vérifier les accès systématiquement côté serveur.
- Chaque changement lié à une Issue avec revue, tests et migration le cas échéant.
- Interdire la publication production tant que import/export E2E et restauration ne sont pas validés.
