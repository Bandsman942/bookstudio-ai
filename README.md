# BookStudio AI by DTSC

Application autonome de rédaction, de révision et d'édition intelligente de livres — dépôt `Bandsman942/bookstudio-ai`.

## État de livraison

Lot 0 — fondations et éditeur initial. Code source et cahier des charges présents ; **application non déployée, ni validée E2E en production**. Le dépôt GitHub et le projet Neon sont indépendants de DTSC Platform.

### Inclus
- Monorepo Next.js / TypeScript, Tiptap et Prisma sur Neon PostgreSQL dédié.
- Authentification locale par sessions HTTP-only ; inscription publique désactivée par défaut.
- Bibliothèque privée, manuscrits en chapitres, révisions historisées et contrôles de conflits.
- Prototype de lecture DOCX sans accès réseau, migration initiale, tests métier et CI.
- Ports API pour l'intégration éventuelle à DTSC Platform sans couplage de base de données.

### Non inclus dans le MVP courant
Import Word/PDF complet et sécurisé, OCR, exports finis, IA et bibliographie avancée, SSO, paiements, collaboration temps réel, déploiement production.

## Mise en route

Prérequis : Node.js 22.18+, Corepack/pnpm 10 et base Neon dédiée, jamais les identifiants DTSC.

```bash
corepack enable
pnpm install
cp .env.example apps/web/.env.local
# Renseigner DATABASE_URL et DIRECT_URL dans un fichier local non versionné
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Ne pas appliquer de migration sur la branche production Neon sans revue.

## Vérifications

```bash
pnpm test
pnpm db:generate
pnpm typecheck
pnpm build
```

## Gouvernance
Issue → branche → tests → PR → revue → E2E propriétaire → merge. Voir [cahier des charges](docs/CAHIER_DES_CHARGES_v1.md), [règles](CONTRIBUTING.md) et [backlog](docs/roadmap/BACKLOG.md).
