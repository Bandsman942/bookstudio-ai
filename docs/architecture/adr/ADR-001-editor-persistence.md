# ADR-001 — Persistance V1

**Décision :** édition initiale individuelle, avec révisions append-only et `Chapter.revisionSeq` comme pointeur courant. Toute sauvegarde exige `baseRevision` et une mutation atomique ; HTTP 409 en cas de concurrence. Jamais de remplacement silencieux.

Le texte ProseMirror JSON est la source éditoriale ; le texte brut est une projection pour recherche. Les snapshots et restaurations sont des commandes spécifiques. Le passage éventuel à Yjs exige une ADR et des tests de migration.

**Tests requis** : manuscrit long, crash/reprise navigateur, conflits inter-onglets, fidélité JSON et rollback.
