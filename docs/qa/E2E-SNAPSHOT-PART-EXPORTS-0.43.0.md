# Recette propriétaire v0.43.0-alpha — snapshots de parties et exports

## Porte de validation

**Candidate uniquement**, ne pas mettre en production avant CI verte sur la PR finale ET validation explicite **`E2E v0.43.0-alpha BON`**. Conserver la v0.42.0-alpha en production jusque-là.

## Scénarios métier

1. Créer un ouvrage à quatre chapitres enregistrés et deux parties nommées avec accents ; affecter les deux premiers à Partie A et les deux suivants à Partie B. Vérifier le sommaire global et que le Studio reste utilisable avec trois zones de scroll indépendantes.
2. Enregistrer une **version nommée**. Dans **Versions**, exporter ce snapshot en Markdown, DOCX puis PDF. Vérifier sommaire **Partie A → chapitres 1–2** et **Partie B → chapitres 3–4**. Dans Word, cliquer sur un titre de chapitre depuis la table des matières. Dans PDF, parcourir la table puis les chapitres, accents/symboles et sauts de page. Les pages ne doivent pas être numérotées avec de faux chiffres.
3. Dans l'édition courante, renommer Partie B, déplacer les groupes ou créer une nouvelle édition. **Réexporter l'ancien snapshot** : titres, ordre et textes doivent être identiques à ceux de la capture. Aucun contenu actuel ne doit entrer dans l'export historique.
4. Depuis Versions, choisir **Restaurer comme nouvelle édition** avec confirmation. Vérifier nouvelles identités de parties/chapitres, structure originale restaurée, anciens chapitres/versions/commentaires intacts, statut DRAFT. Une deuxième soumission avec l'ancien prérequis doit être refusée en 409.
5. Choisir une ancienne version **v1** sans parties, exporter et restaurer comme nouvelle édition : parcours sans erreur, sommaire plat, aucune partie artificielle. Contrôler que les textes et hash historiques n'ont pas changé.
6. Vérifier OWNER/EDITOR (création/restauration) et REVIEWER/VIEWER (lecture/export seulement) ; compte étranger 404, utilisateur non connecté 401, mutation sans Origin 403, onglets concurrents 409, archive inaccessible.
7. Sur Android Chrome (320/360/390 px) et desktop/tablette, revenir au Studio : hamburger gauche, panneau Intelligence éditoriale, onglets Sections/Chapitres et scroll **sans espace blanc global** toujours fonctionnels (non-régression v0.42). Tester 125–200 % de zoom et un manuscrit de plus de 20 chapitres.
8. Tester avec des titres de parties contenant `&`, apostrophes, `<` et caractères Unicode ; vérifier les caractères échappés correctement dans Word, PDF et Markdown, sans HTML actif ou fuite de manuscrit.

## Contrôles automatiques requis dans la CI

- `pnpm release:check`, `pnpm snapshot-fork:check`, `pnpm test:export`, `pnpm test`.
- E2E HTTP PostgreSQL réel : snapshot v2, sortie Markdown historique, DOCX/PDF valides, copie de parties sans révisions modifiées, origine/ACL/ancien token.
- `pnpm book-parts:check`, `pnpm studio-navigation:check`, `pnpm typecheck`, `pnpm build`.
- Mettre à jour le journal de production **après** Vercel READY avec les IDs observés. ClamAV reste OFF.
