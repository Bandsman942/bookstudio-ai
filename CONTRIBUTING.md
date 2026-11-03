# Contribuer à BookStudio AI

1. Lire `AGENTS.md`, le cahier des charges et les ADR concernés.
2. Lier chaque changement à une Issue GitHub, définir les critères d'acceptation avant de coder.
3. Partir du `main` courant, créer une branche `feat/<num>-description` ou `fix/<num>-description`.
4. Une PR = objectif, périmètre/hors périmètre, tests, risques, sécurité, migration, documentation et rollback.
5. Aucune connexion directe aux tables de DTSC Platform, jamais de copie des sessions ou cookies DTSC.
6. Toute mutation d'un chapitre exige la révision de base et refuse les écrasements silencieux.
7. Vérifier ACL, conservation des manuscrits et scénario E2E propriétaire avant merge.
8. Ne pas déployer sur Vercel avant validation du propriétaire et de la sécurité de l'authentification.
9. Migrations Prisma revues et testées sur branche Neon de développement isolée.
10. Toute intégration IA doit journaliser provenance, consentement et coût, sans modification silencieuse.
