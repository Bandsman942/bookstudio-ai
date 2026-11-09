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

## BS-004d #141 — version candidate v0.25.0-alpha

Sélecteur de destination indépendant de la page de bibliothèque, recherche serveur et accès OWNER/EDITOR. Tableau de bord à six statuts et archives sur tous les ouvrages autorisés. CI et documentation obligatoires avant E2E et publication. ClamAV non installé et différé.

## v0.25.0-alpha — livraison vérifiée le 8 novembre 2026

Import indépendant et tableau éditorial à six étapes (issue #141) livrés via PR #143. CI #192/#193 SUCCESS, E2E BON, snapshot Neon `snap-plain-lake-bfb2k071`, Vercel READY `dpl_C35ji6tLKDyprZNa2qc37xNVmn7g`. Prochaine tranche BS-004 : suivi détaillé de la progression d'un livre (mots, chapitres, historique) sans modifier le contenu ni fermer prématurément le parent #5. ClamAV serveur isolé non installé ; issues sécurité P0 ouvertes.

## P0 BS-004e #145 — progression par ouvrage, candidate v0.26.0-alpha

- Vue d'ensemble : chapitres avec/sans texte **selon leur dernière révision**, proportion informative et non taux d'achèvement, chapitres retirés, versions, enregistrements de révision, dernière activité et liens.
- API privée avec contrôle de workspace, dernière révision de l'édition active, réponse sans prose/source, secours UI non bloquant ; tests unitaires et HTTP E2E multi-tenant.
- Documentation utilisateur, OpenAPI, architecture, exploitation, E2E et note de release complétée **avant** déploiement et vérifiée par `pnpm release:check`.
- Parent #5 reste **ouvert** pour la gestion multi-éditions et les fonctionnalités métier non livrées. Les issues ClamAV #104/#126/#131/#133 restent différées sans fermeture ni activation.

## v0.26.0-alpha — livraison vérifiée le 8 novembre 2026

Progression par livre (issue #145) livrée via PR #146 : propriétaire E2E BON, CI #196/#197 SUCCESS, Neon snapshot snap-flat-brook-bfyi7mlm, Vercel READY dpl_3jLVENms5oSxET1WSP8YrKUpMXAo. Prochain jalon BS-004 : multi-éditions avec conservation de l’historique. ClamAV différé.

## v0.27.0-alpha — P0 BS-004f #148, éditions multiples

- **Nouvelle tranche candidate** : inventaire des éditions, duplication **non destructive** de la dernière sauvegarde vers une nouvelle édition, lecture historique privée, ID de chapitre indépendants, conservation des commentaires/révisions/snapshots précédents et retour du statut du livre à DRAFT.
- Transactions Serializable et double précondition (`expectedEditionId`, `expectedUpdatedAt`) ; refus de copie directe au-delà de 500 chapitres/20 MiB, sans modification des contenus existants. Contrôle serveur RBAC, Origin, audit.
- Non inclus : fusion de deux éditions, modification d'une édition historique, migration des ancres/commentaires, duplication de la provenance Supabase, publication externe, impression, conversion lourde en tâche de fond. À traiter dans les issues complémentaires, et garder #5 ouvert jusqu'aux critères complets.
- Documentation utilisateur/API/technique/QA/exploitation et release dans la PR **avant déploiement**, E2E propriétaire BON et CI sur SHA final obligatoires.
- ClamAV serveur dédié non installé, #104/#126/#131/#133 toujours ouverts et flags OFF.

## Livraison confirmée v0.27.0-alpha — 8 novembre 2026

Sous-issue #148 : éditions multiples, copie non destructive et consultation historique livrées dans PR #149 ; E2E propriétaire BON ; CI #201/#202 SUCCESS, snapshot Neon `snap-rough-cake-bfs1ehep`, Vercel READY `dpl_E4x9gofu5oepnAW1y8C254fLzSRP`. La documentation prépublication était intégrée à la PR #149 ; preuves postproduction dans le journal `docs/deployments/2026-11-08-v0.27.0.md`. P0 parent #5 toujours ouvert pour comparaison des éditions et autres critères restants. Correction UI menu bibliothèque : signalement vidéo du 8 novembre 2026, modale initialement prisonnière d'une carte avec transform/overflow ; lot suivant à corriger.

## Candidate v0.28.0-alpha — issues #151 et #152

- **#151 (UI)** : anomalie filmée, modales contextuelles des livres tronquées par `transform` + `overflow:hidden` sur la carte ; correctif portail `document.body`, overlay sécurisé viewport et recette mobile/clavier. Aucun changement des règles métier/RBAC.
- **#152 (BS-008b / BS-004g)** : comparaison privée de deux éditions (titres/positions/empreintes dernière révision), résultats inchangé/modifié/ajouté/absent, correspondances prudentes, aucune prose ou hash transmise dans le résumé. Limite 350 chapitres actifs/édition ; pas de prétention de diff mot à mot.
- Tests unitaires, contrôle UI structurel, HTTP E2E multi-tenant et sauvegardes, documentation complète **dans la PR avant CI finale et publication**.
- Non inclus : alignement certain d'anciens chapitres renommés et entièrement réécrits, diff riche caractère par caractère, copies asynchrones >350 chapitres, publication externe. À suivre via #9 et le reste du cahier des charges.
- Sécurité ClamAV hôte dédié non installé ; #104/#126/#131/#133 restent ouvertes et flags OFF.

## P0 BS-008c #155 — restauration historique conservatrice (candidate v0.29.0-alpha)

- Snapshot v1 d’une ancienne édition → création d’une édition indépendante à partir des révisions réellement mémorisées, même si certains chapitres sources ont été retirés ; pas de modification des anciens manuscrits.
- Édition courante et mise à jour du livre protégées par préconditions et transaction sérialisable ; garde additionnel sur PATCH chapitre pour refuser l’écriture depuis un onglet d’une édition historique.
- UI FR/EN, confirmation forte, provenance d’édition de la version, toasts 409/422, E2E négatifs, documentation *avant publication*.
- **Non inclus** : merge bidirectionnel, diff mot à mot, >500 chapitres/20MiB, remise en place automatique des commentaires/ancres, restauration de source externe ni sécurité antivirus. Parent #9 reste ouvert, ClamAV différé.

## Livraison confirmée v0.29.0-alpha — 8 novembre 2026

BS-008c #155 livré via PR #156 : E2E propriétaire BON, CI #210 SUCCESS, snapshot Neon production `snap-twilight-morning-bfpcenut` créé avant fusion, SHA main `696a3b874a50`, déploiement Vercel `dpl_H4zQpRJJvMmR6mvNCqSm4PrV5Vpv` READY, `/api/health` DB ready et `/api/version` alpha 0.29.0 HTTP 200. Voir journal `docs/deployments/2026-11-08-v0.29.0-alpha.md`. Les P0 parents BS-004 #5 et BS-008 #9 demeurent ouverts pour autres critères ; sécurité ClamAV toujours différée.

## P0 BS-008d #158 — historique chapitre (candidate v0.30.0-alpha)

- Pagination par séquence de **toutes** les révisions du chapitre de l'édition courante, auteur et date ; aucun texte dans la liste.
- Aperçu historique privé en texte brut à la demande ; restauration d'un numéro ancien créant une **nouvelle** révision et revenant au statut DRAFT, avec validation d'accès et résolution des conflits inter-onglets.
- UI intégrée au Studio FR/EN, accessible mobile/clavier, sans restauration des brouillons locaux non sauvegardés ; audit sans prose, E2E PostgreSQL, documentation complète avant publication.
- Non inclus : diff prose mot à mot, revue visuelle ProseMirror, suivi des modifications Word avancé, merge de plusieurs révisions, restauration au-delà de l'édition courante (traitée séparément par v0.29). Les parents P0 #9/#6 restent ouverts sur leurs autres exigences, sécurité ClamAV différée.

## Livraison vérifiée v0.30.0-alpha — 8 novembre 2026

Sous-issue #158 livrée en PR #159 : E2E propriétaire BON, CI #216 SUCCESS, snapshot de protection Neon `snap-hidden-mud-bfw2ewji` **avant** fusion, SHA `main` `b46c21976c247ea450a2edbafee02e13e8afbeea`, Vercel `dpl_8n81aoY1d8QwQd88YgjDqLaY1wQ1` READY, sondes privées `/api/health` 200 DB ready et `/api/version` 200 0.30.0-alpha. Journal `docs/deployments/2026-11-08-v0.30.0-alpha.md`. P0 parents #9/#6 restent ouverts pour le cahier des charges restant ; ClamAV hors service.

## P0 BS-008e #161 — comparaison mot à mot des révisions (candidate v0.31.0-alpha)

Comparaison lecture seule de deux révisions enregistrées **d'un chapitre de l'édition courante**, en segments de texte ajoutés, supprimés, inchangés, avec auteurs/dates et compteurs. API privée et RBAC, sélection FR/EN dans Historique, rendu texte échappé, budget temps/mémoire/longueur et refus 422 sans troncature ni altération. Tests unitaires sur fidélité des deux textes et E2E réels sur accès multitenant/anciens chapitres. **Non inclus** : diff JSON ProseMirror riche, formatage Word, comparaison inter-éditeurs asynchrones, fusion de branches, OCR ni antivirus ClamAV. Parents #9/#6 restent ouverts.

## Livraison confirmée v0.31.0-alpha — 8 novembre 2026

BS-008e issue #161 / PR #162 livrée après E2E propriétaire BON et CI #221 SUCCESS au dernier SHA, snapshot Neon protégé `snap-patient-resonance-bf5rw81g` avant fusion, main `6a4814e6c1ca3056c382294c6e27cf8804835225` ; Vercel production `dpl_8zRQx6evd9nZc51cFsXD5kRpCJQf` READY, santé/version HTTP 200 et DB ready. Voir `docs/deployments/2026-11-08-v0.31.0-alpha.md`. Parent #9 ouvert pour fonctionnalités restantes. ClamAV OFF.

## Candidate P0 BS-004f #164 — duplication d'un ouvrage (v0.32.0-alpha)

Créer un livre DRAFT indépendant à partir des chapitres actifs de l'édition courante et de leur dernière révision **sauvegardée**. Duplication via menu ⋯ FR/EN et API privée transactionnelle, idempotente, bornée, multi-tenant, sans modifier l'original. Ne **pas** copier les sources/objets Supabase, historique des imports, antivirus et jobs de scan, commentaires, snapshots, anciennes éditions, autorisations ou publication. UI mobile, toasts contextualisés et parcours E2E. P0 principal #5 encore ouvert après cette tranche, autres critères de gestion des livres à poursuivre ; sécurité ClamAV reportée.

## Livraison vérifiée v0.32.0-alpha — 8 novembre 2026

Issue BS-004f #164 livrée en PR #165 : propriétaire E2E BON, CI #229 SUCCESS dernier SHA, snapshot Neon protégé `snap-withered-cherry-bf4adqt3` créé **avant** fusion, main `1407b6b0912573466da6957342a1a1636080a994`, Vercel `dpl_AqPhxQQFwMDdVSY1tj1RR1q3d7ix` READY, sondes `/api/health` HTTP 200 DB ready et `/api/version` HTTP 200 0.32.0-alpha. Voir journal `docs/deployments/2026-11-08-v0.32.0-alpha.md`. Le parent #5 reste ouvert ; ClamAV OFF.

## Candidate BS-004g P0 #167 — duplication du chapitre (v0.33.0-alpha)

Copie interne à l'édition active d'un chapitre depuis le sommaire/éditeur avec titre personnalisé : **dernière révision enregistrée**, nouvel UUID, séquence 0, en fin de manuscrit, original intact, statut DRAFT. API sous contrôle RBAC/Origin, lock livre + Serializable, idempotence `operationId`, 409 conflicts, 422 limites, audit sans prose, HTTP E2E réel. Pas de transfert de commentaires, imports, fichiers Supabase, snapshots, attestations de sécurité ou permissions. Documents complets avant publication. Suivant BS-004 #5 : copie ciblée entre ouvrages, contrôles d'organisation et ergonomie longue liste ; ClamAV toujours reporté.

## Livraison vérifiée v0.33.0-alpha — 8 novembre 2026

Issue BS-004g #167 livrée en PR #168 : E2E propriétaire BON, CI #235 SUCCESS dernier SHA, snapshot Neon `snap-shiny-salad-bfqogn47` créé **avant** fusion, main `ab236434d7c573408339ea9c12c15dc7d99534a9`, Vercel `dpl_8y53P6qxQafPLDPDFrToD3v4K6Ze` READY, sondes `/api/health` HTTP 200 DB ready et `/api/version` HTTP 200 v0.33.0-alpha. Journal `docs/deployments/2026-11-08-v0.33.0-alpha.md`. Le parent #5 reste ouvert ; ClamAV OFF.

## Candidate P0 BS-004h #170 — copier un chapitre entre livres (v0.34.0-alpha)

Action menu ⋯ **Copier dans un autre livre…** : sélecteur limité aux livres modifiables du même workspace, recherche insensible à la casse, max 50 résultats avec `hasMore`. Nouvel ID de chapitre à révision 0 ajouté en fin de l'édition courante de destination, texte/JSON du dernier enregistrement de source, original inchangé et cible DRAFT. Transaction verrouillant les deux livres dans l'ordre ID, membership OWNER/EDITOR sur les deux, contrôle concurrent des éditions, idempotence et audit sans prose. Aucune copie d'import, objet Supabase, commentaire, snapshot, preuve antivirus ni permission ; tests E2E anti-cross-tenant. ClamAV reporté, parent BS-004 #5 toujours ouvert pour critères restants ; publication seulement après gate documentaire + CI + E2E propriétaire.

## Livraison confirmée v0.34.0-alpha — 8 novembre 2026

Issue BS-004h #170 livrée via PR #171 : E2E propriétaire BON, CI #243 SUCCESS au SHA exact, snapshot Neon protégé `snap-orange-fog-bfyx3lrt` créé **avant fusion**, main `1ccf23b60013ef72131da7c816746b1bee743ac2`, Vercel `dpl_7XACxK6xAZyRtajgh6q4mPCFgdmE` READY, `/api/health` HTTP 200 DB ready et `/api/version` HTTP 200 v0.34.0-alpha. Journal `docs/deployments/2026-11-08-v0.34.0-alpha.md`. Parent #5 ouvert, ClamAV OFF.

## Candidate P0 BS-004i #173 — fusion non destructive de chapitres (v0.35.0-alpha)

Depuis le menu contextuel d'un chapitre source, choisir un deuxième chapitre actif, ordre explicite premier puis second, et créer un **nouveau chapitre indépendant** en dernière position du même livre, à révision 0, avec blocs riches sauvegardés concaténés sans perte. Les deux originaux, historiques, commentaires, snapshots, sources/imports Supabase, autorisations et attestations ClamAV sont intacts. Transaction Serializable, verrou livre, préconditions des deux sources, audit ID/hash seul et opération UUID idempotente ; max 500 chapitres actifs et 2 MiB du JSON réuni, 409/422 sans effet partiel. UI FR/EN/mobile et QA PostgreSQL. Gate documentaire complet avant production ; parent #5 ouvert pour gestion des ouvrages, parent #6 ouvert pour fonctionnalités riches de l'éditeur. ClamAV reporté/OFF.

## Livraison vérifiée v0.35.0-alpha — 8 novembre 2026

Issue BS-004i #173 livrée via PR #174 : E2E propriétaire BON, CI #248 SUCCESS au SHA exact, snapshot Neon protégé `snap-muddy-haze-bf1e6ks6` créé **avant fusion**, main `2a04c0cc7c07efd0ee04b1f9938a8a4d3101a99a`, Vercel `dpl_7uERoax7eGTJaDfK7KcDNKR8DfJt` READY, `/api/health` HTTP 200 DB ready et `/api/version` HTTP 200 v0.35.0-alpha. Journal `docs/deployments/2026-11-08-v0.35.0-alpha.md`. Parents #5/#6 ouverts, ClamAV OFF.

## Candidate P0 BS-005a #176 — recherche/remplacement dans le chapitre ouvert (v0.36.0-alpha)

Studio Tiptap : bouton ⌕, Ctrl/Cmd+F/H, recherche littérale locale dans les nœuds texte avec sélection/navigation FR/EN et option casse, remplacement unique ou global **après prévisualisation et confirmation**. Préservation des marques (ne traverse pas les frontières entre deux nœuds de texte, limite de cette tranche), un seul Undo, réutilisation de la sauvegarde locale/autosave. Opération candidate validée intégralement contre le schéma/2 MiB, blocage >500 occurrences ou 1000 caractères/remplacement, conflits/offline. Aucun endpoint, base, migration, AI, variable ou logs de prose. Tests unitaires et CI/documentation avant publication, E2E propriétaire puis snapshot Neon et main prod-only. Suite BS-005 #6 : recherche plein texte de livre, correspondances traversant les frontières stylistiques avec préservation avancée des marques, recherche/remplacement multi-chapitres sous approbation humaine. ClamAV reporté.

## Livraison vérifiée v0.36.0-alpha — 8 novembre 2026

Issue BS-005a #176 livrée via PR #177 : E2E propriétaire BON, CI #254 SUCCESS au SHA exact, snapshot Neon protégé `snap-patient-silence-bfinzivk` créé **avant fusion**, main `f5b8b592ddfd4dd0cfd9315ce3ee2031ea0f5774`, Vercel `dpl_4nRiqicmNNRtaLy2gmhuLuFirzRe` READY, `/api/health` HTTP 200 DB ready et `/api/version` HTTP 200 v0.36.0-alpha. Journal `docs/deployments/2026-11-08-v0.36.0-alpha.md`. Parents #5/#6 ouverts, ClamAV OFF.

## Candidate P0 BS-005b #179 + UX mobile #180 — v0.37.0-alpha

- **Recherche livre** : GET privé `/api/v1/search?q=...&bookId=...&offset=...`, page 30 avec hasMore/nextOffset, 35 chapitres E2E, snippets courts, tri déterministe, wildcards SQL échappés, livre même workspace/non archivé, révisions courantes uniquement. UI `/search?bookId=...` + liens directs ouvrage/Studio, bouton Charger suite, FR/EN. Recherche globale compatible. Hors de cette tranche : remplacement tous chapitres, recherche dans annotations/sources.
- **Mobile hamburger central** : le menu gauche caché à ≤900px est désormais révélable en haut à gauche (44px) sur Bibliothèque, fiche ouvrage, Archives, Recherche via `WorkspaceShell`. Même liens et menus ⋯ que desktop, drawer scrollable et accessible (focus, Escape, backdrop, fermeture lien), safe-area, thèmes. Hamburger Studio renforcé à 320px et en mode concentration avec protection brouillons et sommaire long. Critères E2E manuels mobiles 320/375/768px et z-index/context menus.
- **Release gate** : CI dernier SHA, version 0.37 candidate non déployée, docs guide/API/design/ops/QA/release/roadmap mises à jour **avant** publication, attente `E2E v0.37.0-alpha BON`, snapshot Neon production avant main et Vercel production-only Preview OFF. ClamAV non installé/OFF, parents P0 #5/#6 ouverts.

## Livraison vérifiée v0.37.0-alpha — 9 novembre 2026

Issues BS-005b #179 et mobile #180 livrées via PR #181 : E2E propriétaire BON, CI #261 SUCCESS sur SHA final `5900c1ca35683747b645ca5701a1357e1735b27b`, snapshot Neon `snap-holy-wind-bfkfifhh` du 9 novembre 2026 **10:44:29 UTC AVANT fusion**, main `aed4c3bed82365e228a210bb08cb59adbc37cf9a`, Vercel `dpl_52bxUjmiVBUB4gKejNFSoyVULSBi` READY, health/version 200 DB ready sur alias réel, absence de clusters/logs error/fatal dans la fenêtre de 20 minutes observée. Journal `docs/deployments/2026-11-09-v0.37.0-alpha.md`. Parents #5/#6 ouverts, ClamAV OFF.

## Candidate P0 BS-005c #183 — sommaire dynamique des sections du Studio (v0.38.0-alpha)

Selon le cahier des charges §5.1, deux onglets **Chapitres / Sections** dans la même sidebar du Studio, accessible via hamburger sur mobile/tablette ≤900px. L'onglet Sections extrait **en mémoire** les titres H1–H3 du chapitre actuellement ouvert, avec indentation, filtre, compteur réel et avertissement explicite >300, et un clic déplace uniquement la sélection/viewport après vérification de l'ancre. Aucun texte, état de sauvegarde, commentaires, révision, snapshot ou objet externe modifié. Mode lecteur, FR/EN, dark/light et concentration ; menus ⋯ de chapitres préservés dans Chapitres. Aucun endpoint, migration, secret, IA ou ClamAV supplémentaire. Tests unitaires ProseMirror et documentation complète avant publication. **À venir** : tables des matières inter-chapitres, hiérarchie persistée de parties, insertion dans PDF/DOCX (non inclus ici). Attendre CI dernier SHA et `E2E v0.38.0-alpha BON`, snapshot Neon avant fusion main, Vercel main-only Preview OFF.

## Validation v0.38.0-alpha et état de publication — 9 novembre 2026

E2E propriétaire **BON** ; CI GitHub #265 SUCCESS sur la tête de PR #184 `71ccf004d68426419b609b428ac82d8ba6a204be`, snapshot Neon production `snap-curly-recipe-bfml77am` pris avant fusion, puis squash sur `main` `393ac0c76d13f71e4efae524daafa0d2adaa9b08`. Le déclenchement Vercel initial `dpl_FeMU4pUgnJpazDmc4KbvPodMj98t` a été **CANCELED** par le verrou ; publication contrôlée depuis ce même SHA `main` : `dpl_DNXRdpPCD6z1yHiWoBfknm3g6r3F` **READY**, `/api/health` et `/api/version` HTTP 200 (DB ready, v0.38). Verrou rétabli, Preview OFF, ClamAV OFF. Journal `docs/deployments/2026-11-09-v0.38.0-alpha.md` (PR #187).

## Candidate P0 BS-005d #185 — Studio mobile et repères éditoriaux locaux (v0.39.0-alpha)

Le propriétaire signale une régression Android Chrome : sous 760px, la sidebar Manuscrit de 248px est affichée malgré le hamburger, laissant le Studio quasiment invisible. CSS de v0.19 réintroduisant `display:flex` après un ancien media query. La v0.39 force son masquage hors tiroir jusqu'à 900px, restaure le centre pleine largeur et l'éditeur scrollable sans débordement global, avec navigation flottante accessible (focus/Escape/voile). Un bouton étincelles directement visible ouvre **Intelligence éditoriale** en tiroir droit exclusif ; commentaires et **indicateurs locaux de structure** (mots, paragraphes, H1–H3, longs paragraphes) sans IA ni appel externe. Aucune migration, route, permission, fichier source ou manuscrit modifié. Tests régression, documentation complète, E2E **sur vrai mobile**, CI au SHA final ; **ne pas fusionner avant `E2E v0.39.0-alpha BON`**. Préserver les parents #5/#6, P1 IA #11–#15 ouverts, ClamAV non installé/OFF.

## Livraison vérifiée v0.39.0-alpha — 9 novembre 2026

Issue BS-005d #185 / PR #186 : validation propriétaire `E2E v0.39.0-alpha BON`, CI #270 SUCCESS au dernier SHA `9f2a39d7838512a248c57ea8b262ca4a57fcb1ea`, snapshot Neon `snap-calm-truth-bfjb7ftc` avant fusion, main `626a718ad2f0d080b7f7da828a254ffdc756ac07`, déploiement Vercel `dpl_F21fTNTpn77U9FoHSBTNPJfeGkmg` READY, santé/version 200, DB ready, verrou de build et Preview OFF rétablis. Voir journal `docs/deployments/2026-11-09-v0.39.0-alpha.md`. Studio Android et panneau éditorial accessibles ; indicateurs locaux non assimilables à une IA générative. P0 #5/#6 et P1 #11–#15 restent ouverts, ClamAV reporté/OFF.

## Candidate P0 BS-005e #189 — Sommaire global des sections (v0.40.0-alpha)

Poursuite du cahier §5.1 : **table des matières globale en lecture seule**, tous les chapitres actifs de l'édition courante, expansion progressive de titres H1–H3 sauvegardés (60/page), filtre et comptage complet sans masquage. GET privé membre workspace `/books/{bookId}/chapters/{chapterId}/outline` ne divulgue **que les titres**, pas le JSON/paragraphes du manuscrit. Un lien vers le Studio encode ordinal absolu et séquence exacte ; après modification ou en présence d'un brouillon local à restaurer, la navigation automatique est suspendue. FR/EN, mobile, clavier, thèmes. Aucune mutation, nouvelle migration, variable, IA ou activation ClamAV. Tests unitaires et HTTP ACL/dernier état/archives dans CI ; documentation et recette **avant** publication, E2E propriétaire au SHA final, snapshot Neon avant fusion main, Vercel prod-only Preview OFF.

**Jalons suivants** : hiérarchie **Partie → Chapitre** persistante avec déplacement/renumérotation atomiques ; table des matières générée dans les exports DOCX/PDF ; recherche/remplacement multi-chapitres avec revue humaine ; analyse éditoriale IA sous consentement et provenance. Ils ne sont pas présentés comme livrés en v0.40. Parents #5/#6 et P1 IA #11–#15 restent ouverts.

## Livraison vérifiée v0.40.0-alpha — 9 novembre 2026

Issue #189 / PR #190 : propriétaire **E2E BON**, CI #274 SUCCESS au SHA final `bfb7e5900abb7c40dd96a417e0ecafa99c1e8e0a`, snapshot Neon production `snap-cool-leaf-bfuba2fm` **avant fusion**, main `3ecb8c9b9295f86605bddcf9ea613f831ddbe8dc`, Vercel `dpl_4vK7iFvxaZTqAcijyAwY1LV3HUdL` READY, santé/version 200 et DB ready, verrou `exit 0`/Preview OFF rétabli. Journal `docs/deployments/2026-11-09-v0.40.0-alpha.md`. Aucun déploiement de branche feature, aucun nouvel outil IA/scan. Poursuite P0 #6 : parties persistantes et renumérotation.

## Candidate P0 BS-005f #192 — parties persistantes et sommaire hiérarchique (v0.41.0-alpha)

- Nouveau registre `manuscript_parts` par édition + `chapters.part_id` nullable, FK composée pour empêcher un rattachement à une autre édition ; migration additive, aucun changement des révisions historiques ni de la position actuelle.
- API privées : création, renommage, suppression explicite des **parties vides**, affectation/détachement de chapitre ; chaque partie doit représenter une plage de chapitres **contigus**. Reorder bloqué si séparation ; RBAC/Origin/édition/conflits/audit transactionnels. Copie des parties en clonage d'édition ou d'ouvrage ; nouveaux UUID.
- UI FR/EN/mobiles : panneaux de parties sur fiche d'ouvrage, sous-titres hiérarchiques dans le sommaire global et le drawer de chapitres Studio ; aucun masquage des chapitres sans partie, aucune perte de texte. Tests E2E PostgreSQL multi-tenant et scénarios Android.
- **Gate** : documentation guide/design/API/ops/QA/roadmap, CI SHA final, E2E manuel propriétaire `v0.41.0-alpha BON` nécessaires avant snapshot Neon protégé et merge main. Preview OFF, aucun déploiement feature. **ClamAV installé : non ; activation : OFF.**
- **Tranches suivantes toujours ouvertes** : réordonner des parties entières/renuméroter le livre de façon atomique ; intégrer tables des matières dans les exports DOCX/PDF ; stocker des métadonnées de parties dans les snapshots futurs ; sous-parties, front-matter, styles d'édition ; correction et analyse IA, RAG/citations sous consentement. Ne pas fermer prématurément BS-004 #5, BS-005 #6 ni P1 IA.

## Livraison vérifiée v0.41.0-alpha — 9 novembre 2026

Issue #192 / PR #193 : E2E propriétaire **BON**, CI #280 SUCCESS au dernier SHA `09b97c6108136a8678ea2e9d51cc08cf6a223e9f`, snapshot Neon production `snap-lively-pond-bf59cpah` **avant fusion**, `main` `205522a421aac2554f807b4b49b56cd6c23461fa`, Vercel `dpl_CPQGJe6P3FNvit3RiQYpqohEUxvJ` READY, health/version 200 et DB ready ; verrou `exit 0`/Preview OFF restauré. [Journal](../deployments/2026-11-09-v0.41.0-alpha.md). ClamAV OFF. Prochaine tranche : déplacement atomique des groupes de chapitres d'une partie, sans toucher aux révisions ni à la prose.

## Candidate v0.42.0-alpha — BS-005g #195 et BS-005h #196

- **BS-005g** : déplace une partie entière d'un cran à la fois, avec tous ses chapitres, à travers les parties voisines ou une plage sans partie. Restent immuables : texte, DocumentRevision, provenance, commentaires, sources, snapshots ; seuls slots de position des chapitres affectés changent. Route privée PATCH avec contrôle de la version de l'ordre + édition, ACL, Origin, transaction SQL en deux phases anti-`UNIQUE` et audit sans prose. UI mobile FR/EN, toasts et boutons conditionnels. Tests unitaires et PostgreSQL E2E aller-retour/multi-tenant/conflits.
- **BS-005h** : corrige le signalement image du 9 novembre : scroll global parasite avec vide en bas du Studio, navigation latérale très comprimée/incomplète et panneau Sections ambigu lorsque le chapitre est écrit au style « Normal ». Studio fixé au viewport, 3 zones de défilement indépendantes et tiroirs mobiles, header latéral compact scrollable, explication des vrais titres H1–H3 avec lien global protégé. Tests CSS/JSX et recette réelle desktop/Android zoom requis.
- Gate prépublication : release, guide, design, OpenAPI, exploitation, QA, README, changelog et roadmap ; CI au dernier SHA et **E2E propriétaire `v0.42.0-alpha BON`** avant snapshot Neon/fusion. **Candidate NON DÉPLOYÉE**. Après : table des matières DOCX/PDF, snapshots de parties versionnés, sous-parties, styles avancés, IA éditoriale avec provenance/consentement. ClamAV OFF et incidents P0 sécurité toujours ouverts.

## Livraison confirmée v0.42.0-alpha — 9 novembre 2026

BS-005g #195 et BS-005h #196 ont été livrés via PR #197 : E2E propriétaire BON, CI #284 SUCCESS SHA final `60bfa188`, sauvegarde Neon `snap-tiny-forest-bfnyly58` **avant fusion**, `main` `dee257b8`, Vercel `dpl_Cwyymd2gHXLeVt8vP1HvV7Tssaep` READY, sondes HTTP 200 base ready, verrou Vercel restauré, Preview OFF. [Journal](../deployments/2026-11-09-v0.42.0-alpha.md). Les corrections du scroll Studio desktop/mobile sont intégrées aux tests de régression. ClamAV toujours OFF.

## Candidate v0.43.0-alpha — BS-008f/BS-009c #199

- Les nouveaux snapshots deviennent **v2** : titres de parties, affectations des chapitres et ordre historiques figés dans le manifeste SHA-256. Anciens v1 rétrocompatibles et jamais réécrits.
- « Restaurer comme nouvelle édition » conserve les parties d'un snapshot v2 avec de nouveaux UUID ; les v1 demeurent plats. La restauration des textes sur l'édition actuelle reste strictement textuelle.
- Exports DOCX/PDF/Markdown : table des matières parties/chapitres basée sur le snapshot signé, non sur les changements ultérieurs du livre. Liens internes Word, sommaire PDF visible sans faux numéros de page.
- Tests de hash et corruption, E2E PostgreSQL / ACL / CSRF / historique, Word/PDF, compatibilité, 13 chapitres et non-régression navigation. Documentation complète dans PR avant CI.
- **Candidate NON DÉPLOYÉE** : attendre CI dernier SHA et **E2E v0.43.0-alpha BON** propriétaire avant snapshot Neon/fusion main/Vercel. Limites encore ouvertes : sections H1–H3 dans sommaire exporté, vrais numéros de page PDF, sous-parties, IA éditoriale avec consentement, sécurité P0 ClamAV serveur dédié.
