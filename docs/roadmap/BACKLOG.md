# Backlog initial BookStudio AI

| ID | Priorité | Fonction | Validation |
|---|---|---|---|
| BS-001 | P0 | Bootstrap repository, CI | Typecheck et build verts |
| BS-002 | P0 | Neon, Prisma, migrations | Migration développement et rollback |
| BS-003 | P0 | Auth/ACL, protection anti-abus | E2E négatifs et rate limiting |
| BS-004 | P0 | Projets, éditions, chapitres | CRUD sécurisé |
| BS-005 | P0 | Tiptap et autosave | Sauvegarde/rechargement/conflit |
| BS-006 | P0 | Import DOCX | Source immuable, fidélité contrôlée |
| BS-007 | P0 | Import PDF et OCR | Revue humaine pour scans |
| BS-008 | P0 | Snapshots et restauration | Restore non destructif |
| BS-009 | P0 | Exports Word/PDF | Exports depuis snapshot stable |
| BS-010 | P0 | Fichiers, antivirus, backups | Restauration éprouvée |
| BS-011 | P1 | Correction IA | Suggestions non destructives |
| BS-012 | P1 | Analyse profonde et RAG | Provenance et invalidation |
| BS-013 | P1 | Citations, CSL | Références structurées |
| BS-014 | P1 | Bibliographie, collisions | DOI et dédoublonnage |
| BS-015 | P1 | Suggestions ancrées | Accept/reject fiable |
| BS-016 | P1 | Collaboration | ACL et révocation |
| BS-017 | P2 | Design et EPUB | Prévol + EPUB 3 |
| BS-018 | P2 | OIDC via API DTSC | SSO contractuel |
| BS-019 | P2 | Paiements DTSC via API | Webhooks idempotents |
| BS-020 | P2 | IA DTSC via API | Consentement, quotas |

## Situation au 5 novembre 2026 — v0.22.0-alpha déployée

- **Production v0.22.0-alpha** déployée depuis `main` (PR #134, E2E BON, CI #179/#180 SUCCESS, snapshot Neon `snap-orange-lake-bfx01wyp`, Vercel READY). Documentation prépublication intégrée au SHA testé et journal réel ajouté après publication.
- **BS-004 #5 (P0, reste ouvert)** : bibliothèque, CRUD, archivage, retrait/restauration, menus et réorganisation des chapitres réalisés ; poursuivre fiches de propriétés (type d'ouvrage, métadonnées), tableau de bord, pagination/performance et QA complète multi-tenant.
- **Sécurité (#104/#126/#131/#133, P0 toujours ouverte mais exécution différée par le propriétaire)** : code de queue/attestations présent ; **ClamAV non installé**, aucune file active, quarantaine et sauvegarde binaire indépendante non finalisées. Ne pas déclarer de fichiers SCANNED_CLEAN ni fermer ces issues.
- **Prochain lot métier après v0.22** : compléments de gestion des ouvrages (édition des métadonnées et type, listes/tri, tableaux de bord) sur PR distincte, sans déployer sans E2E.
- P1 #73–#75 : tables de publication, styles/notes et collaboration avancée, non clos.
- **Gouvernance ajoutée** : porte documentaire `docs/ops/RELEASE-DOCUMENTATION-GATE.md` à satisfaire pour chaque future version avant toute fusion/déploiement ; preuves CI + E2E propriétaire requises.

## Lot métier v0.23.0-alpha — LIVRÉ le 5 novembre 2026 (issue #136, BS-004)

- **Fonctionnel** : modification du type d'ouvrage et de sa langue de référence, suivi d'étapes éditoriales contrôlées via menu contextuel partagé ; aucun effet sur texte/révision/snapshot/éditions. **Statut déclaré ≠ publication effective.**
- **Sécurité métier** : rôles OWNER/EDITOR, CSRF, conflit optimiste 409, transition interdite 422, livre archivé protégé, journal d'audit.
- **Portée documentaire** : `docs/releases/v0.23.0.md` + `docs/guides/CHAPITRES.md` + `docs/design/BOOK-LIFECYCLE.md` + OpenAPI + ops + QA + changelog, toutes intégrées **avant** déploiement.
- **BS-004 #5 reste ouvert** pour les travaux restants de bibliothèque scalable, filtres/pagination, détails de tableau de bord et autres critères métier. Les chantiers sécurité P0 restent ouverts mais reportés conformément à la demande du propriétaire (ClamAV non installé).

### Prochain lot BS-004c — issue #138

Bibliothèque volumineuse : pagination stable, recherche de titre et filtres de type/statut avec indicateurs complets de bibliothèque. Développer en v0.24.0-alpha candidate sans fusion ni publication avant CI sur documentation complète et E2E propriétaire. Sécurité ClamAV différée, issues toujours ouvertes.

## Lot P0 BS-004c #138 — candidate v0.24.0-alpha

- **Implémenté sur branche** : pagination keyset récente/titre, recherche par titre, filtres type/statut, indicateurs de toute la bibliothèque, UI mobile et RBAC.
- **Sécurisé** : membership dans chaque requête Prisma, pagination scopée aux critères, aucun texte/URL/source dans l'API, réponses 400 contextualisées ; pas de migrations SQL.
- **QA** : curseurs/totaux/tri/recherche et cross-tenant, navigation avec >30 ouvrages, mobile FR/EN, réseau faible. Documentation API, utilisateur, technique, exploitation et recette intégrée dans PR **avant toute mise en production**.
- **À poursuivre après validation** : dashboard éditorial plus complet, sélecteur de destination d'import paginé, analyse d'index de recherche à très grande échelle (GIN trigram si nécessaire), clavier avancé et autres critères restant au P0 #5.
- Sécurité documentaire P0 #104/#126/#131/#133 : différée, ClamAV dédié non installé, conserver flags OFF.

## Livraison confirmée v0.24 et suite

La sous-tranche #138 est livrée dans PR #140 : E2E BON, CI #188/#189 SUCCESS, snapshot Neon `snap-lucky-cloud-bf011zsa`, Vercel READY. Prochain lot : #141, destination d'import parmi tous les ouvrages éditables et suivi éditorial détaillé. La sécurité ClamAV reste différée et ouverte (#104/#126/#131/#133).
