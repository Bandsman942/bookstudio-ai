# BookStudio AI by DTSC

Application autonome de rédaction, de révision et d'édition intelligente de livres — dépôt `Bandsman942/bookstudio-ai`.

## Version et historique

- Politique de versionnement : [SemVer et déploiements](docs/ops/VERSIONING.md) ; version de production privée **v0.4.0-alpha**.
- Historique des changements : [CHANGELOG.md](CHANGELOG.md) ; fiche de livraison [v0.4.0](docs/releases/v0.4.0.md).
- Après déploiement réel, la fiche reçoit SHA, ID Vercel, URL, date UTC et résultats des recettes. La version courante est exposée par `GET /api/version`.
- **Chaque nouvelle version exige CI verte, E2E validé, sauvegarde Neon, déploiement depuis `main`, contrôle READY, tag Git et fiche post-déploiement.**

## État de livraison

Socle éditorial et exports de base avec versions nommées. **v0.4.0-alpha déployée en production privée le 3 novembre 2026, sous Vercel Authentication.** `/api/health` et `/api/version` répondent HTTP 200 ; les recettes E2E v0.3.0 et v0.4.0 ont été déclarées bonnes par le propriétaire avant publication. Le dépôt GitHub et le projet Neon sont indépendants de DTSC Platform.

### Inclus
- Monorepo Next.js / TypeScript, Tiptap et Prisma sur Neon PostgreSQL dédié.
- Authentification locale par sessions HTTP-only ; inscription publique désactivée par défaut.
- Bibliothèque privée, manuscrits en chapitres, révisions historisées et contrôles de conflits.
- Points de restauration immuables et retour à une ancienne version sans écraser l'historique.
- Export Word DOCX et Markdown depuis une version enregistrée ; préanalyse DOCX locale durcie (sans upload web).
- Migrations de production appliquées et sauvegardées de manière contrôlée sur Neon dédié ; trois migrations actives et tests métier/CI.
- Recherche privée dans les textes actuels, commentaires éditoriaux liés à une révision.
- Renommage, archivage et restauration réversible des ouvrages depuis la bibliothèque.
- Ports API pour l'intégration éventuelle à DTSC Platform sans couplage de base de données.

### Non inclus dans le MVP courant
Import Word/PDF complet et sécurisé sur le web, OCR, export PDF de qualité imprimeur et gabarits d'édition finalisés, IA et bibliographie avancée, sauvegardes/restauration d'exploitation, SSO, paiements, collaboration temps réel et ouverture publique générale.

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
