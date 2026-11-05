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

## Situation au 5 novembre 2026 — version candidate v0.22

- **Production v0.21.0-alpha** livrée depuis `main` ; v0.22 en PR #134, E2E propriétaire BON, CI finale et snapshot avant livraison.
- **BS-004 #5 (P0, reste ouvert)** : bibliothèque, CRUD, archivage, retrait/restauration, menus et réorganisation des chapitres réalisés ; poursuivre fiches de propriétés (type d'ouvrage, métadonnées), tableau de bord, pagination/performance et QA complète multi-tenant.
- **Sécurité (#104/#126/#131/#133, P0 toujours ouverte mais exécution différée par le propriétaire)** : code de queue/attestations présent ; **ClamAV non installé**, aucune file active, quarantaine et sauvegarde binaire indépendante non finalisées. Ne pas déclarer de fichiers SCANNED_CLEAN ni fermer ces issues.
- **Prochain lot métier après v0.22** : compléments de gestion des ouvrages (édition des métadonnées et type, listes/tri, tableaux de bord) sur PR distincte, sans déployer sans E2E.
- P1 #73–#75 : tables de publication, styles/notes et collaboration avancée, non clos.
- **Gouvernance ajoutée** : porte documentaire `docs/ops/RELEASE-DOCUMENTATION-GATE.md` à satisfaire pour chaque future version avant toute fusion/déploiement ; preuves CI + E2E propriétaire requises.
