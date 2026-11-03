# Neon PostgreSQL indépendant

- Projet Neon : `bookstudio-ai-dtsc` (`proud-truth-10774612`).
- PostgreSQL 18 ; base `bookstudio`.
- Région initiale Neon : `aws-us-west-2` — revoir latence et résidence des données.
- Branche principale : `production` (`br-sweet-smoke-bfxp73ok`).
- Branche de développement : `development` (`br-patient-queen-bfqlfv7h`).
- Au démarrage, requête santé effectuée sur développement ; ne pas inférer que des migrations ont été appliquées.

La branche production ne doit recevoir aucune migration sans validation. Secrets de connexion exclusivement dans un coffre ou dans les variables protégées d'environnement. Jamais dans GitHub.
