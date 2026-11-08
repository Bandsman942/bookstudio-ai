# Historique des modifications — BookStudio AI by DTSC

Toutes les évolutions sont consignées selon [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et [Semantic Versioning](https://semver.org/lang/fr/). Le contenu est classé en **Ajouté / Modifié / Corrigé / Sécurité / Supprimé**. Les dates sont en UTC.

## [Non publié]

## [0.29.0] — alpha candidate (NON DÉPLOYÉE)
### BS-008c #155 — restaurer une version historique dans une nouvelle édition
- Nouvelle commande « Restaurer dans une nouvelle édition » depuis Versions & historique : copie exacte des révisions référencées, y compris des chapitres retirés depuis ; nouvelles IDs, numéro d’édition croissant, ancien historique et snapshots intacts.
- API POST privée transactionnelle, contrôle de manifeste/hash stockés, limitation 500 chapitres/20 Mio, RBAC et CSRF, préconditions 409, audit sans manuscrit ; UI FR/EN mobile et toasts contextuels.
- Garde de concurrence sur l’autosauvegarde : impossible d’écrire sur un chapitre qui a basculé dans une édition historique via un onglet ouvert.
- Guide, architecture, OpenAPI, exploitation, QA et roadmap actualisés **avant tout déploiement**. ClamAV toujours désactivé.

## [0.28.0] — alpha privée livrée le 8 novembre 2026 (PR #153, CI #205)
### BS-008b #152 et UI #151 — comparaison non destructive et menus d'ouvrages
- Comparaison de deux éditions d'un livre sur le titre, la position et l'empreinte de la **dernière révision enregistrée** de chaque chapitre actif : nombre de chapitres inchangés, modifiés, renommés, déplacés, ajoutés et absents ; aucun texte manuscrit ni hash brut exposé par cette API.
- Rapprochement conservateur : même position+titre+contenu, empreinte unique puis titre unique. Ne pas inventer de filiation si titre et contenu ont simultanément changé ou si des chapitres sont ambigus. Limite de 350 chapitres actifs par édition.
- Vue d'ensemble > Éditions : sélection de deux éditions, consultation des différences, réponse contextualisée FR/EN, responsive mobile, support réseau faible, lecture seule.
- **Correction de la vidéo utilisateur du 8 novembre** : fenêtres Renommer/Propriétés/Statut/Archiver désormais portalisées dans `document.body` hors des cartes transformées par `transform:translateY` et `overflow:hidden`. Plus de modale écrasée dans la carte ; overlay mobile plein écran, focus et scroll protégés.
- Contrats structurels UI renforcés, tests unitaires du diff et E2E HTTP réels avec permissions multi-tenant, édition identique, contenu modifié, ajout de chapitre, absence de fuite de prose/hash.
- Documentation utilisateur, technique, API, exploitation, QA, release et backlog actualisée **avant** toute livraison. Aucun nouveau schéma SQL, variable ou serveur ClamAV.


## [0.27.0] — alpha privée livrée le 8 novembre 2026 (PR #149, CI #201/#202)
### BS-004f #148 — Éditions distinctes et manuscrit historique consultable
- Catalogue privé des éditions d'un même ouvrage (numéro, langue, chapitres actifs et édition courante), accessible à tout membre autorisé.
- OWNER/EDITOR : création atomique d'une nouvelle édition depuis les **dernières révisions enregistrées** des chapitres actifs. Nouveaux identifiants/versions initiales ; conservation intacte de l'ancienne édition, révisions, commentaires et snapshots historiques. Statut du livre réinitialisé à DRAFT.
- Historique : consultation en **lecture seule** de la structure et du texte des chapitres d'éditions précédentes ; le routage de l'éditeur reste limité à l'édition courante.
- Protection de concurrence `expectedEditionId` + `expectedUpdatedAt`, transaction Serializable, anti-CSRF, RBAC par workspace, audit sans prose, copie bornée à 500 chapitres et 20 MiB pour l'opération synchrone.
- UI responsive FR/EN avec fenêtre de création explicite, historique défilant et toasts contextuels. Tests E2E vérifiant que le texte historique et les snapshots demeurent accessibles après création.
- Aucun schéma SQL ni variable d'environnement nouvelle. Documentation complète dans la PR **avant** déploiement ; ClamAV réel non installé.


## [0.26.0] — alpha privée livrée le 8 novembre 2026 (PR #146, CI #196/#197)
### BS-004e #145 — Progression réelle du manuscrit dans la vue d'ensemble
- Indicateurs par livre, lecture privée : chapitres actifs et retirés, chapitres avec texte / sans texte, proportion de chapitres contenant du texte, révisions enregistrées et versions nommées.
- Dernier chapitre modifié et dernière révision enregistrée, liens directs vers les chapitres et versions. Badges « Texte enregistré » / « Pas encore de texte » sur chaque chapitre.
- Requêtes Prisma et SQL de statut du **dernier contenu enregistré** par chapitre ; aucune prose, chemin source ou URL privée n'est renvoyé. Permissions de workspace vérifiées avant agrégation et endpoint GET sans cache.
- Pour la confidentialité/performance : le serveur n'envoie jamais le texte des chapitres au tableau de bord. Les indicateurs restent indisponibles sans bloquer l'ouverture ou l'édition d'un livre en cas d'incident statistique.
- UI responsive FR/EN, thèmes, accessibilité ; tests unitaires du calcul de proportion et E2E HTTP multi-tenant / sauvegardes / snapshots ; aucune migration SQL ni variable supplémentaire.
- Toute documentation préparée et testée **avant** publication ; ClamAV réel non installé et P0 sécurité ouverts.


## [0.25.0] — alpha privée livrée le 8 novembre 2026 (PR #143, CI #192/#193)
### BS-004d #141 — Import indépendant et pilotage éditorial
- Sélecteur d'import indépendant des 24 premières cartes : recherche de titre, pagination de 20, rôles OWNER/EDITOR exclusivement.
- Paramètre d'API editable=1 avec filtre de permission dans Prisma, compteurs et curseurs liés aux critères.
- Tableau de bord des six étapes éditoriales et archives, indicateurs de tous les livres accessibles, raccourcis de filtre.
- UI responsive et accessible, messages contextualisés FR/EN, tests de permissions, pagination et statistiques.
- Documentation complète obligatoire avant publication ; aucune migration SQL, variable de production ni activation ClamAV.


## [0.24.0] — alpha privée livrée le 5 novembre 2026 (PR #140, CI #188/#189)
### BS-004c #138 — Bibliothèque paginée et filtrée
- Bibliothèque SSR : première page limitée à 24 ouvrages ; total global et compteurs de rédaction/relecture exacts, indépendants des cartes chargées.
- API `GET /api/v1/books` étendue : recherche serveur sur titre (80 caractères), filtres type/statut, tri récent ou alphabétique, pagination keyset et curseur de portée (limite 1–100, compatibilité archives).
- Contrôles membership multi-tenant dans toutes les requêtes, 400 pour curseur obsolète/filtre invalide, pas de contenu manuscrit dans la liste ; index SQL existants conservés.
- UI mobile/desktop : filtres FR/EN accessibles, états vides, messages contextualisés, compteur de résultats et bouton « Afficher davantage », absence de rechargement complet pour filtrer.
- Tests unitaires de parsing et curseur ; E2E API permissions, doublons, total et filtres ; CI release documentaire obligatoire.
- **Aucune migration Prisma, variable Vercel ou activation ClamAV**.


## [0.23.0] — alpha privée livrée le 5 novembre 2026 (PR #137, CI #183/#184, Vercel READY)
### BS-004b #136 — Propriétés des ouvrages et progression éditoriale
- Dans les menus ⋯ des livres : modifier le type d'ouvrage et la langue de référence FR/EN, sans modifier le manuscrit, les révisions, les sources ni les éditions.
- Étapes éditoriales contrôlées DRAFT → WRITING → REVIEW → APPROVED → PRODUCTION → PUBLISHED (avec retours autorisés par les règles métier), statut déclaré manuellement et non publication publique.
- API `PATCH /api/v1/books/[bookId]` actions `properties` et `status` avec RBAC OWNER/EDITOR, CSRF, transaction Serializable, conflit HTTP 409, transition interdite 422 et audit.
- Cartes de bibliothèque et vue d'ensemble actualisées, formulaire contextuel accessible FR/EN, toasts contextualisés.
- Tests HTTP E2E cross-tenant, mauvais type/langue, origine, conflit, transitions interdites et livre archivé. **Aucune nouvelle migration SQL ni variable Vercel.**
- Documentation utilisateur/API/technique/exploitation/QA/changelog/backlog livrée dans la même PR avant toute publication.


## [0.22.0] — alpha privée livrée le 5 novembre 2026 (PR #134, CI #179/#180, Vercel READY)
### BS-004 #5 — Réorganisation non destructive des chapitres
- Monter/descendre un chapitre dans la vue d'ensemble et la navigation gauche de l'éditeur via les menus ⋯, clavier et mobile.
- API `PATCH /api/v1/books/[bookId]/chapters/reorder` RBAC OWNER/EDITOR, CSRF, token optimiste SHA-256 sur identifiants/positions, transaction Serializable avec audit ; 409 sur structure modifiée ailleurs.
- Restauration de chapitre retiré toujours en fin de manuscrit afin d'éviter une collision de position ; aucune modification de texte, révision ou snapshot.
- Tests unitaires et parcours HTTP E2E avec mauvais tenant, CSRF, conflit, récupération, état intact ; pas de migration Neon.


## [0.21.0] — alpha candidate (NON DÉPLOYÉE)
### #131 — travail ClamAV isolé et attesté (#126)
- M2M et le bail de travaux de scan Neon, téléchargement privé Supabase signé, worker hors Vercel, résultat HMAC.
- Statut SCAN_PENDING_PROMOTION après un résultat sans détection ; aucune source déclarée SCANNED_CLEAN avant sa promotion immuable.
- Fichiers rejetés bloqués même sans mode strict, contrôles conservés OFF tant que la chaîne réelle n'est pas validée.


## [0.20.0] — alpha candidate (NON DÉPLOYÉE)
### BS-010a4a — intents antivirus durables (#129, #126)
- Génération UUID renouvelée à chaque confirmation de source, invalidant les anciens jobs.
- File de scan append-only Neon opt-in sous `BOOKSTUDIO_SOURCE_SCAN_QUEUE_ENABLED` désactivé par défaut, taux limité à 30 requêtes par heure/ouvrage.
- Révocation des jobs précédents lors d'une nouvelle confirmation ou suppression source ; aucun verdict `SCANNED_CLEAN` fabriqué.
- Invariants de concordance job/génération testés ; migration SQL additive sans lecture des manuscrits.
- Le worker M2M réel, l'analyse ClamAV attestée, l'isolement et la quarantaine restent non livrés.


## [0.19.0] — alpha candidate (NON DÉPLOYÉE)
### BS-UX — gestion et navigation des chapitres (#127)
- Suppression **réversible** de chapitre, restauration depuis vue d’ensemble, RBAC OWNER/EDITOR, origine CSRF, audit et jetons de concurrence ; historique des révisions et commentaires intact.
- Exclusion de la liste active et de la recherche, snapshots anciens conservés et restauration de versions refuse les chapitres retirés sans rétablissement préalable.
- Menus ⋯ pour chaque chapitre dans les deux navigations et dans la vue d’ensemble, clic droit et Shift+F10 sur les objets éditoriaux, menu rendu hors zones scrollables avec placement dans le viewport.
- Navigation Manuscrit scrollable et subtile, tiroir mobile des chapitres, accès Vue d’ensemble en une touche, actions tactiles et raccourcis clavier avec aide FR/EN.
- Migration Prisma additive `20261104164000_chapter_soft_delete` ; nouvelles API `DELETE chapter`, `POST restore`, `GET trash` ; tests ACL / CSRF / conflit et conservation.


## [0.18.0] — alpha candidate (NON DÉPLOYÉE)
### BS-010a3 — source backups isolés (#124, #104)
- Versions binaires append-only par UUID avec SHA-256, manifeste HMAC signé et restauration vérifiée vers un nouveau chemin privé exclusivement.
- Tests synthétiques : corruption, mauvais ID/clé, symlink, permission, non-écrasement, inventaire, fichiers volumineux.
- Composant hors Vercel, non raccordé aux sources client et sans preuve de réplication distante ; pas encore un backup de production.


## [0.17.0] — 2026-11-04 (production alpha privée)
### BS-010a2 — Adaptateur ClamAV isolé, première tranche de #104 (#120)
- Nouveau worker Python hors Vercel qui réalise une copie privée exclusive du fichier source, calcule son empreinte SHA-256 sur les octets réellement analysés et contrôle taille, symlinks et mutation pendant la copie.
- Invocation du binaire ClamAV local à chemin absolu, sans shell ni sortie brute dans les logs ; identité du moteur, fraîcheur du fichier de signatures quotidien (48 h), délai maximal et traitement explicite des erreurs. Les archives chiffrées ou dépassant les limites d'inspection déclenchent une alerte plutôt qu'un faux succès.
- Le fichier temporaire est supprimé après verdict. Réponses limitées au statut, code, empreinte, taille, version du scanner et date ; aucun texte ou chemin manuscrit.
- Tests contractuels hors ligne et recette E2E opt-in avec moteur ClamAV **réel** et fichier EICAR dans un bac à sable ; CI simulée ne vaut pas attestation de sécurité réelle.
- Correction du parcours HTTP E2E : la version attendue provient désormais du `release.json` de la branche testée, sans constante obsolète après chaque montée de version.
- **Non livré :** worker déployé, accès Supabase, queue Neon, quarantaine physique, preuve de backup/restauration, signature de verdict et activation du mode strict. La production v0.17.0-alpha conserve `BOOKSTUDIO_REQUIRE_SCANNED_SOURCES=false` ; ce code isolé ne modifie pas la sécurité effective des manuscrits.

### Livraison en production
- Propriétaire : **E2E v0.17.0-alpha BON** avant fusion de la PR #121. Commit de `main` : `1f8829a3b0217f76d48ac22eb047a9e36a6e05e9`. CI `test-and-build` SUCCESS sur le SHA `ca7dc3970e5a3c6d587ee94c6155f7f63e36f5f4` (run #154, ID `41799455869`). La CI simule ClamAV ; la validation propriétaire du banc réel ne produit pas d'attestation machine consultable dans ce dépôt.
- Snapshot Neon préalable : `snap-spring-dust-bf779nwi` ; aucune migration SQL ajoutée.
- Déploiement Vercel production `dpl_3N9Nwwz8qNiJmbow4pPAgovSvCVV` **READY le 2026-11-04T08:32:33.841Z**, alias `bookstudio-ai.dtsc-platform.com`. `/api/health` HTTP 200, base `ready`, `/api/version` HTTP 200, version `0.17.0`, commit `1f8829a3b021`. Aucune erreur runtime détectée dans la fenêtre de contrôle.
- Déclenchement Git auto annulé par l'Ignored Build Step ; déploiement Git ciblé `main` uniquement. Verrou `exit 0` restauré, previews Vercel désactivées, SSO conservé. Journal : `docs/deployments/2026-11-04T08-32-33Z_v0.17.0.md`.
- Aucun tag Git annoté `v0.17.0` n'a été créé ni vérifié ; `release.json.gitTag` reste une étiquette applicative.

## [0.16.0] — 2026-11-04 (production alpha privée)
### Correction P0 PDF — 13 chapitres (#115)
- La version 0.15.1 gérait les lettres françaises, mais pas certains symboles présents dans les manuscrits. Le snapshot de 13 chapitres contient notamment U+2192 (flèche droite), absent du test initial.
- Polices Noto Sans Symbols 2 et Noto Sans Symbols classique (licence OFL) embarquées et figées, fallback FontKit et tests couvrant les codes Unicode observés sans enregistrer le texte privé.
- Si un glyphe demeure absent, réponse contrôlée mentionnant uniquement son code Unicode et son numéro de chapitre. Pas de contenu du manuscrit dans les erreurs, ni de PDF tronqué.
### UI/UX — Toasts globaux (#116)
- ToastProvider global clair/sombre, FR/EN, types succès/échec/avertissement/information, déduplication, limite 3, fermeture clavier, aria-live et réduction des animations.
- Messages contextualisés pour export, versions, recherche, livres, chapitres, transferts Supabase, imports DOCX, commentaires, authentification et alertes d’autosauvegarde.
- Aucune notification répétée à chaque frappe ; les erreurs de formulaire et les avertissements importants restent également visibles dans la page.
### Gouvernance
- Tests PDF 13 chapitres et UI globale, CI complète, recette E2E propriétaire v0.16.0-alpha BON avant fusion.
- Aucun changement SQL. Antivirus/quarantaine et restauration binaire sécurisée restent non livrés (#104).

### Livraison en production
- Propriétaire : **E2E v0.16.0-alpha BON** avant la fusion de la PR #117. Commit de `main` : `96ec229b83ffe9b5dc7d3aefaee1a387d72d6871`. CI `test-and-build` SUCCESS pour le SHA de PR `0235f1178d0d6699446ad42303db7c0ecdaffc43` (run `41792553979`).
- Snapshot Neon préalable : `snap-muddy-brook-bfk11jxs` ; aucune nouvelle migration SQL.
- Vercel production READY le **2026-11-04T08:07:06.965Z** : `dpl_8NQ7xaAr9cqgqvaD3tMBb5BvnZcv` sur `bookstudio-ai.dtsc-platform.com`. `/api/health` HTTP 200, base `ready`, `/api/version` HTTP 200, version `0.16.0`, commit `96ec229b83ff`.
- Le déclenchement automatique a d'abord été annulé par l'Ignored Build Step. Un déploiement Git ciblé sur le même SHA `main` a été réalisé, puis le verrou `exit 0` rétabli et les previews maintenues désactivées. Journal : `docs/deployments/2026-11-04T08-07-06Z_v0.16.0.md`.
- Aucun tag Git annoté `v0.16.0` n'est attesté dans cette livraison ; le champ de version ne prouve pas l'existence d'un tag.


## [0.15.1] — 2026-11-04 (production alpha privée)
### P0 — PDF Unicode et export mobile contrôlé (#111)
- Cause racine `EXPORT_UNSUPPORTED_GLYPHS` : les polices PDFKit intégrées Times/Helvetica/Courier limitaient tous les titres et les chapitres au codage WinAnsi ; **un seul caractère hors liste** entraînait l'échec de tout le PDF. La limite n'était pas liée aux 13 chapitres.
- Remplacement du garde-fou WinAnsi par une sélection des glyphes disponibles dans des polices IBM Plex Sans OFL embarquées localement, épinglées `@fontsource/ibm-plex-sans@5.2.8`. Gestion des espaces typographiques et lettres/ponctuation françaises, ainsi que des alphabets complémentaires couverts ; les glyphes absents continuent à être refusés explicitement au lieu d'une substitution silencieuse.
- Régression PDF sur **13 chapitres**, U+202F, accents/ponctuation française, caractères grecs ; tests DOCX/Markdown conservés. Le PDF est généré depuis le snapshot immuable, sans nouvelle limite arbitraire liée au nombre de chapitres.
- Le menu export ne navigue plus vers une URL d'erreur JSON brute : la réponse est vérifiée puis le fichier est téléchargé via blob, avec messages FR/EN contextualisés et conseil d'utiliser DOCX si le caractère rare reste non couvert.
- Aucune transmission à une IA ; polices embarquées hors réseau, jamais transmises via un appel externe. Titre et contenu préservés ; les styles éditoriaux pris en charge restent limités.
- Ne pas fusionner ni déployer avant recette propriétaire E2E v0.15.1-alpha BON.


### Livraison en production
- Propriétaire : **E2E v0.15.1-alpha BON**, PR #112 fusionnée, `main` SHA `d313cbdec63d08025e8b43c01150d710068fd1e5` et CI GitHub `test-and-build` SUCCESS.
- Snapshot Neon `snap-icy-surf-bfl92n3w` créé avant fusion. Aucune migration SQL nouvelle (5 migrations Prisma existantes).
- Vercel production READY le **2026-11-04T01:45:54.641Z** : `dpl_4dLYMczsyhSNeEYMZkTfxH9NQFzv`, `bookstudio-ai.dtsc-platform.com`. Santé et version HTTP 200 : `0.15.1-alpha`, base `ready`.
- Build `prisma migrate deploy → prisma generate → next build` terminé ; ignored-build-step `exit 0` restauré, previews désactivées. Journal : `docs/deployments/2026-11-04T01-45-54Z_v0.15.1.md`.
- Aucun tag Git annoté `v0.15.1` n'a été créé/vérifié. Le champ `gitTag` est une étiquette de version, pas une preuve de tag publié.

## [0.15.0] — 2026-11-04 (production alpha privée)
### BS-010a1 — Traçabilité du contrôle de sécurité des manuscrits (#109)
- Après confirmation réelle du stockage Supabase, chaque source reçoit un **statut de sécurité UNSCANNED** dans Neon. Ce statut signifie **non analysé par antivirus** ; confirmer le transfert ou reconnaître le type MIME n'est jamais une preuve d'absence de malware.
- La base `source_security_records` conserve le livre, la source, les métadonnées et l'auteur de la confirmation, et prévoit des champs d'empreinte et d'identité du scanner **non renseignés sans preuve**. Migration Prisma additive ; les fichiers historiques sans ligne sont considérés UNSCANNED.
- L'UI des fichiers sources affiche le statut réel en FR/EN pour chaque manuscrit ; confirmation de transfert et messages détaillés sont rectifiés.
- Mode strict **opt-in**, `BOOKSTUDIO_REQUIRE_SCANNED_SOURCES=false` par défaut : s'il est activé, refuser signatures de téléchargement et importation DOCX non certifiées avec HTTP 423 ; exige SCANNED_CLEAN **plus** empreinte SHA-256, version de scanner et horodatage valides. Aucune action utilisateur ne peut déclarer un fichier propre.
- La reconfirmation du stockage remet le statut à UNSCANNED et efface les éventuelles preuves devenues obsolètes. La suppression source supprime aussi le statut.
- Tests unitaires des politiques, workflow E2E et recette sur Neon isolée. Aucun téléchargement binaire dans les fonctions Vercel et aucune nouvelle clé côté navigateur.
- **Non livré :** antivirus opérationnel, isolation physique en quarantaine, worker de scan, sauvegarde/restauration démontrées. Ne PAS activer le mode strict en production avant livraison du scanner isolé (#104).


### Livraison en production
- E2E propriétaire v0.15.0-alpha BON ; PR #110 fusionnée, SHA `018a9dbd78deeaf2120d8e3bf55accc9cb10dd69`, CI SUCCESS, snapshot Neon `snap-fancy-king-bfcnyg35`.
- Vercel `dpl_572uAMaGuwvqVzWNrsvSzF7KE8Rr` READY le 2026-11-04T01:17:25.427Z, santé/version HTTP 200. Le moteur antivirus réel demeure non livré.

## [0.14.0] — 2026-11-04 (production alpha privée)
### P0 — Importation DOCX complète, sans limite artificielle de 200 paragraphes (#105)
- **Cause corrigée** : l'ancienne prévisualisation s'arrêtait silencieusement après 200 paragraphes ou 100 000 caractères, bloquant ensuite l'import. Le texte simple du fichier Supabase existant est désormais lu dans son intégralité **à l'intérieur des plafonds de sécurité ZIP/XML**, sans réupload ni découpe silencieuse.
- Fenêtre de lecture paginée (**24 blocs visibles par page**) pour conserver la fluidité mobile ; le nombre de blocs et caractères indique **tout** le texte analysé, pas seulement la page courante.
- Les paragraphes Word de plus de 9 000 caractères sont conservés en segments consécutifs, sans suppression de caractères ; messages de revue humaine explicites.
- Détection des chapitres sur tout le texte simple, y compris documents > 200 paragraphes, > 100 000 caractères et plus de dix titres ; titres éditables et mode « manuscrit continu ».
- Les chapitres volumineux sont présentés en **parties successives** (suite 2, suite 3…) plutôt que tronqués ; tous les blocs sont conservés dans l'ordre. Bouton de création avec consentement explicite.
- Importation progressive avec les endpoints transactionnels déjà sécurisés, **lots indépendants bornés** (jusqu'à 10 chapitres et 124 blocs/65k caractères par lot). Reprise idempotente tant que le dialogue reste ouvert en cas de connexion faible. La transaction couvre **chaque lot**, pas tout un manuscrit volumineux ; le progrès et les créations partielles sont affichés.
- Les sources Supabase restent privées, l'original inchangé, les droits OWNER/EDITOR appliqués et aucun binaire envoyé aux fonctions Vercel.
- Pas de nouvelle migration SQL ; tests de non-perte >200 blocs/>100k caractères, détection 14+ chapitres, pagination et recette E2E longue.
- Limites **de sécurité** maintenues (20 Mio fichier, 24 Mio XML principal, archive 64 Mio décompressés, ZIP suspect refusé) : un document qui les dépasse est refusé explicitement, jamais considéré comme prévisualisé intégralement.
- Restent non pris en charge fidèlement : tableaux, images, notes et certains objets Word, antivirus et restauration des sources, PDF/OCR. Ne pas assimiler « texte principal entier » à une conversion Word totalement fidèle.


### Livraison de production
- **READY le 2026-11-04T00:13:16.049Z** : Vercel `dpl_Y4GVurcNMiz583se2h5WQ8DgAtiQ`, SHA `90e49efdb5eaeb4286519ab0c7e3ca8974d231c8`, PR #106 fusionnée et CI main SUCCESS, E2E propriétaire « v0.14.0-alpha BON ».
- Snapshot Neon `snap-raspy-moon-bfr60kdq`, aucune migration SQL supplémentaire. Build Vercel `prisma migrate deploy → prisma generate → next build`, quatre migrations déjà appliquées.
- `/api/health` et `/api/version` HTTP 200 ; DB ready, version 0.14.0, commit `90e49efdb5ea`. Ignored-build-step `exit 0` restauré, previews désactivées.
- Journal `docs/deployments/2026-11-04T00-13-16Z_v0.14.0.md`. Tag Git annoté `v0.14.0` non créé.

## [0.13.0] — 2026-11-03 (production alpha privée)
### BS-006c — DOCX multi-chapitres sous contrôle humain (#100)
- Dans la prévisualisation privée DOCX, proposition de deux à dix chapitres selon les titres Word et section introductive éventuelle. Tous les blocs conservés dans leur ordre ; relecture et titres modifiables avant confirmation.
- Action explicite « Créer plusieurs chapitres » et avertissements si segmentation approximative, document tronqué ou trop nombreuses parties. Aucun découpage silencieux ni promesse de fidélité Word.
- Nouveau POST `/api/v1/books/:bookId/import/docx/bulk` : validation des droits OWNER/EDITOR, origine, contenu texte-only, présence du fichier Supabase privé, limites globales et consentement.
- Transaction PostgreSQL unique pour tous les nouveaux chapitres, leurs premières révisions et preuves de provenance ; **tout ou rien**. UUID de lot et clés dérivées stables pour retries sans doublons, audit sans texte brut.
- Réutilisation du schéma v0.12, **aucune migration SQL** ; tests découpage, idempotence et API négatifs, UI FR/EN mobile et thèmes.
- Hors périmètre : tableaux/images/notes/styles Word complets, antivirus, sauvegarde-restauration des binaires, PDF/OCR.


### Déploiement
- **READY le 2026-11-03T20:17:33.826Z** : Vercel `dpl_LahJ2LEMPeE1ocm5iLoNr4gLJ6gE` sur SHA `8b5181e215e1f8bcfeb7a3debf25400d5023b048`, GitHub CI `test-and-build` SUCCESS sur `main`, recette propriétaire « E2E v0.13.0-alpha BON ».
- Snapshot Neon `snap-ancient-cell-bf9w7s06`, sans migration SQL supplémentaire ; pipeline Vercel `prisma migrate deploy → prisma generate → next build`, 4 migrations déjà appliquées.
- `/api/health` et `/api/version` HTTP 200 (base ready, v0.13.0, commit `8b5181e215e1`). Ignored-build-step restauré à `exit 0`, previews désactivées.
- Journal `docs/deployments/2026-11-03T20-17-33Z_v0.13.0.md`. Tag Git annoté `v0.13.0` encore à créer.

## [0.12.0] — 2026-11-03 (production alpha privée)
### BS-006b — Reprise contrôlée d'un aperçu DOCX en nouveau chapitre (#96)
- Dans l'aperçu privé DOCX v0.11, l'auteur OWNER/EDITOR peut relire, saisir le titre du chapitre, confirmer explicitement les omissions, puis créer **un nouveau chapitre** à partir des paragraphes/titres simples reconnus.
- L'import d'un aperçu tronqué est bloqué ; jamais de conversion automatique silencieuse. Les fichiers sources restent privés sur Supabase et les chapitres existants ne sont pas modifiés.
- API POST `/api/v1/books/:bookId/import/docx` : CSRF, membership write, validation source DOCX présente dans le bucket privé, limites 200 blocs/100 000 caractères, nœuds Tiptap sans HTML ni lien exécutif.
- Transaction atomique Chapter + DocumentRevision(0) + ManuscriptSourceImport + audit **sans texte brut**, clé d'idempotence UUID par livre et protection contre les retries sur connexion faible.
- Migration Prisma additive `20261103200000_reviewed_docx_source_imports`; les sources déjà utilisées ne sont plus supprimables via l'API ordinaire (409 SOURCE_IN_USE).
- Tests `pnpm reviewed-docx:check`, HTTP E2E négatifs, recette propriétaire FR/EN et thème. **Aucune promesse de fidélité Word, antivirus ou backup prouvé**.
- La structure multi-chapitre avancée, notes, tableaux, images, styles élaborés et OCR restent dans les travaux à venir.


### Déploiement
- **READY le 2026-11-03T19:56:18.166Z** : Vercel `dpl_8iVxeg4TjeQLQKvPZxdbuEJgbb6F`, SHA `d9388f56c8ae8d38c893bf0fc330f5edee54b612`, GitHub CI `test-and-build` SUCCESS sur `main`.
- E2E propriétaire « v0.12.0-alpha BON » ; snapshot Neon `snap-wispy-surf-bfil8uou`, migration additive `20261103200000_reviewed_docx_source_imports` appliquée.
- **Incident de livraison résolu** : premier déploiement READY sans migration ; second déploiement a appliqué la migration mais son build a échoué faute de Prisma Client généré ; pipeline Vercel corrigé en `prisma migrate deploy → prisma generate → next build`. Troisième déploiement READY et fonctionnel.
- `/api/health` et `/api/version` HTTP 200 (base prête, v0.12.0, SHA `d9388f56c8ae`). Verrou `exit 0` rétabli ; previews Vercel désactivées.
- Journal `docs/deployments/2026-11-03T19-56-18Z_v0.12.0.md` ; tag Git annoté `v0.12.0` encore à créer.

## [0.11.0] — 2026-11-03 (production alpha privée)
### BS-006a — Aperçu de structure DOCX privé avant revue humaine (issue #90)
- Bouton « Prévisualiser DOCX » dans les fichiers sources privés, disponible aux membres lecteurs autorisés ; URL signée temporaire, téléchargement direct navigateur → Supabase sans binaire sur Vercel.
- Inspection locale bornée de l'archive OOXML : taille, nombre d'entrées, budget de décompression, Zip Slip, contenu actif, DTD/entités ; extraction sélective XML seulement.
- Aperçu consultatif des titres/paragraphes et avertissements sur tableaux, notes, images, modifications suivies, champs et liens externes.
- Limite 200 paragraphes/100 000 caractères, statut **fidélité non vérifiée**. Aucun chapitre modifié, aucune transmission à un fournisseur IA.
- Tests ZIP et recette E2E. **Pas de conversion Word fidèle, antivirus ou backup de binaires livré.**


### Déploiement
- **READY le 2026-11-03T19:10:55.816Z** : Vercel `dpl_7iSFt4FVpnUDZd9Ud1dxfTYaehCs`, SHA `91ab14726eb06cb0b5f8233e79ca6dc878ad3eff`, CI main SUCCESS, E2E propriétaire « v0.11.0-alpha BON ».
- Snapshot Neon `snap-wild-king-bfqcfagx`; `/api/health` et `/api/version` HTTP 200 (DB ready, v0.11.0, SHA `91ab14726eb0`). Ignored Build Step remis `exit 0`, previews off.
- Journal `docs/deployments/2026-11-03T19-10-55Z_v0.11.0.md`. **Tag Git annoté v0.11.0 encore à créer**.

## [0.10.0] — 2026-11-03 (production alpha privée)
### UI import de manuscrit visible et iconographie cohérente (issue #86)
- Action « Importer un manuscrit » immédiatement visible dans la bibliothèque, avec dialogue ciblant un ouvrage autorisé et un fichier original ; accès rapide également dans les cartes.
- Espace « Fichiers sources » déplacé en tête de la fiche ouvrage, zone d'envoi avec glisser-déposer, bouton visible et messages d'état ; navigation dédiée vers les sources.
- Tous les transferts utilisent les API sécurisées v0.9 : URL Supabase signée, PUT direct du navigateur, confirmation de taille/MIME côté serveur ; aucune conversion en chapitres n'est promise.
- Système unique d'icônes SVG locales professionnelles (navigation Bibliothèque/Recherche/Archives/Modèles, livre, fichiers, chapitres, versions, commentaires, outils contextuels), contrastes clair/sombre, accessibilité clavier, mobile et FR/EN.
- Tests de contrat UI `pnpm manuscript-ui:check` et recette propriétaire dédiée. **Aucune migration, aucune dépendance iconographique externe.**
- Fonctionnalités NON livrées : import DOCX/PDF converti en chapitres, antivirus/validation binaire, OCR, sauvegarde/restauration des binaires.


### Déploiement
- **READY le 2026-11-03T18:45:20.151Z**, Vercel `dpl_8Rdzs7tfoyyQ4rh3dFFY726AQxEE`, commit `01bad488637244cfe60e4b9a3d32fc9c7d93cd06`, GitHub CI `test-and-build` SUCCESS sur `main`.
- E2E propriétaire « v0.10.0-alpha BON » ; snapshot Neon `snap-little-leaf-bfbnz69h`, aucune migration SQL.
- `/api/health` et `/api/version` HTTP 200 (Neon ready, v0.10.0, SHA `01bad4886372`), verrou Vercel restauré `exit 0`, previews désactivées.
- Journal `docs/deployments/2026-11-03T18-45-20Z_v0.10.0.md` ; tag Git annoté `v0.10.0` encore à créer.

## [0.9.0] — 2026-11-03 (production alpha privée)
### Confirmation serveur des sources (#84)
- Après chaque upload direct vers le bucket privé Supabase, vérification côté serveur de la présence de l'objet, de sa taille effectivement stockée et du type MIME déclaré par Storage ; l'interface ne revendique plus une réussite sur la seule base du PUT.
- Messages d'erreur distincts pour objet manquant, taille et type non conformes ; audit de confirmation sans sauvegarder les secrets ni le binaire.
- Limite Storage de 20 Mio appliquée également au bucket privé ; tests de vérification et E2E v0.9.0-alpha propriétaire validés.
- **Non livré** : analyse du contenu binaire/antivirus, backup/restauration, import DOCX/PDF en chapitres, OCR et accès public.


### Déploiement
- **READY le 2026-11-03T18:21:54.023Z**, Vercel `dpl_BWGkPaaB6EywQvfoagU9Ss4wweGT`, SHA `11a565c0789eb796747b2c3fa9acd1eba80b2e30`, GitHub CI `test-and-build` SUCCESS sur `main`.
- E2E propriétaire « v0.9.0-alpha BON » ; snapshot Neon `snap-flat-surf-bfrln7h5`, aucune migration SQL.
- `/api/health` et `/api/version` : HTTP 200, base prête et version `0.9.0`. Vercel reverrouillé (`exit 0`), previews désactivées.
- Journal : `docs/deployments/2026-11-03T18-21-54Z_v0.9.0.md`. Tag Git annoté `v0.9.0` : **à créer**.

## [0.8.0] — 2026-11-03 (production alpha privée)
### Fichiers sources et Supabase Storage (issue #78)
- Intégration des uploads directs navigateur → Supabase Storage privé \`Uploaded_books\`, sans stockage Vercel ni transit du binaire par fonction Next.
- URLs d'upload éphémères émises après contrôle des droits sur l'ouvrage, lecture/téléchargement/suppression avec contrôle serveur, objets cloisonnés par ouvrage.
- Formats DOCX/PDF/TXT/MD/EPUB/ODT/PNG/JPG/WEBP, limite applicative 20 Mo ; refus de noms dangereux, absence de réécriture silencieuse et messages d'erreur bilingues.
- Aucun \`service_role\` / \`sb_secret_\` côté navigateur : clé uniquement en variable serveur. Bucket Supabase existant conservé privé.
- Nouveau panneau « Fichiers sources » dans la vue de l'ouvrage. Ces sources ne sont PAS encore converties en chapitres, et aucun antivirus/backup de binaires n'est annoncé livré.
- Tests dédiés \`pnpm storage:check\` et recette E2E \`docs/qa/E2E-SUPABASE-STORAGE.md\`.


### Déploiement
- **READY le 2026-11-03T17:45:11.721Z**, Vercel `dpl_wxXxiQY7hShvYNswLF3giPdPrEp7`, commit `ebbcfa600289f56e34de8a9f858dc9347af40c87`, région `pdx1` ; CI `test-and-build` SUCCESS sur `main`.
- E2E propriétaire « v0.8.0-alpha BON » ; snapshot Neon `snap-wild-art-bf10s0al`. Environnement Vercel Production : trois variables Supabase présentes (clé secrète non exposée).
- `/api/health` et `/api/version` HTTP 200 ; base `ready` ; version `0.8.0`, commit `ebbcfa600289`. Ignored Build Step restauré (`exit 0`), previews désactivées.
- Journal : `docs/deployments/2026-11-03T17-45-11Z_v0.8.0.md`. Tag Git annoté `v0.8.0` : **à créer**, non revendiqué comme existant.

## [0.7.0] — 2026-11-03 (production alpha privée)
### Éditeur avancé — première tranche
- Ancienne barre de sept boutons remplacée par un ruban **Accueil / Insertion** regroupant styles Normal/Titres 1–3, gras, italique, souligné, barré, code, listes numérotées/à puces, citation, bloc de code, annulation/rétablissement, nettoyage de format, insertion de lien et séparation — #68.
- États actifs accessibles via `useEditorState`, sans re-render de l'éditeur à chaque transaction ; interface défilable sur petit écran et compatible thème clair/sombre et FR/EN.
- Liens volontaires uniquement : `http(s)`/`mailto` contrôlés, prévention des protocoles dangereux. Les nouvelles marques sont validées au serveur et conservées dans les versions.
- Export DOCX/Markdown : soulignement et relations de liens conservés ; PDF : annotations de liens et soulignements dans l'édition de lecture.
### Tests
- Nouveau `pnpm test:export` (sécurité et rendu des liens DOCX/Markdown/PDF) et `pnpm editor:check`, exécutés avec `pnpm test`.
- **Fonctions non encore disponibles** : tableaux, images, typographie avancée, notes, suivi des modifications, pagination fidèle. Évolutions découpées en lots. Aucun changement de données existantes ni de secret.


### Interface et internationalisation
- Thèmes clair, sombre et système, initialisés côté serveur sans flash de mode, et conservés dans des cookies de préférences non sensibles (#66).
- Traductions FR/EN typées pour les principaux parcours (accueil, connexion, bibliothèque, ouvrage, chapitres, éditeur, versions, commentaires, archives et recherche), avec changement accessible depuis les menus « ⋯ » (#67).
- Séparation entre la langue de l'interface et celle du manuscrit. Un livre créé en anglais commence avec un chapitre « Chapter 1 », sans traduire automatiquement les textes des auteurs.
- Tokens communs de surfaces, texte, papier éditorial, boutons et focus pour harmoniser les futurs modules.
### Qualité
- Contrôle automatisé structurel `pnpm prefs:check`, documentation `docs/design/THEMES-I18N.md` et recette `docs/qa/E2E-PREFERENCES-I18N.md`.
- Publication privée après validation E2E propriétaire ; CI sur le commit déployé et contrôles santé/version réussis.


### Interface
- Menus « ⋯ » sans fond, bordure ni ombre au repos, quel que soit leur composant parent. Surbrillance au survol/à l'ouverture ; contour de focus clavier maintenu, y compris à forte magnification — issue #65.


### Déploiement
- **READY le 2026-11-03T17:16:33.853Z**, Vercel `dpl_8Zu1pTByw8592Z8FdUBEkegtfRSp`, commit `434fb699259f973bcb0b085ea94998e473cde3ae`, région `pdx1` ; GitHub CI `41681419960` success.
- E2E propriétaire « v0.7.0-alpha BON », snapshot Neon `snap-falling-pine-bfpe9r23` ; `/api/health` et `/api/version` : HTTP 200, base ready, SemVer/SHA conformes ; zéro log runtime d'erreur dans la fenêtre inspectée.
- Tag Git annoté `v0.7.0` : **à finaliser** (l'outil GitHub connecté n'expose pas la mutation de création de tag). La version et la production sont vérifiées indépendamment de ce tag ; journal `docs/deployments/2026-11-03T17-16-33Z_v0.7.0.md`.

## [0.6.0] — 2026-11-03 (production alpha privée)
### Performance
- Fonction Node.js Vercel localisée par configuration vers `pdx1` (Oregon), proche de Neon `aws-us-west-2` ; gain à confirmer avec mesures depuis Kinshasa et possibilité de revenir à `iad1` si nécessaire — #61.
- Élimination du second chargement profond d'un livre pour calculer le droit d'édition, récupération de l'appartenance dans la requête initiale ; cache d'authentification limité au contexte de rendu React.
- Réduction des requêtes de commentaires : aucun GET après chaque nouvelle révision, état « À revoir » calculé localement ; le panneau éditorial mobile n'est plus chargé en arrière-plan s'il est fermé.
- Autosauvegarde plus robuste en connexion faible : sérialisation/brouillon local regroupés sur 350 ms, suspension hors ligne, reprise à la reconnexion et backoff borné jusqu'à 30 s ; protection du conflit 409 et statut visible.
- Chargement progressif des pages privées avec squelette non confidentiel ; en-têtes `Server-Timing` sur santé et sauvegarde pour faciliter les mesures.
### Assurance qualité
- Ajout du contrôle CI `pnpm perf:check`, du protocole `docs/qa/E2E-PERFORMANCE.md` et du runbook `docs/ops/PERFORMANCE.md`.
- **Aucun gain p50/p95 annoncé sans mesures** ; le changement de région devra être évalué depuis Kinshasa.
### Déploiement
- **READY le 2026-11-03T15:49:26.220Z**, ID Vercel `dpl_GPDiJ4zW9bDyNWrkxaS4PPudv2Qu`, SHA `a6a9ca1954dfc50e62f473939a69ec1f21f5be8a`, tag Git annoté `v0.6.0`.
- CI `41667404333` success, E2E propriétaire déclaré « bon », région `pdx1` vérifiée, santé/version HTTP 200.
- Snapshot Neon avant release `snap-dark-glade-bftfx31a`, aucune migration ; journal : `docs/deployments/2026-11-03T15-49-26Z_v0.6.0.md`.



## [0.5.0] — 2026-11-03 (production alpha privée)
### Modifié
- Menus contextuels « ⋯ » pour les commandes secondaires de la bibliothèque, des livres, chapitres, archives, versions, commentaires, options de l'éditeur et du compte — PR #57, issue #55.
- Hiérarchie d'actions unifiée : une action primaire visible par section et confirmation des opérations importantes ; clavier, tactile et responsive.
- Le panneau de commentaires et conseils est accessible sur tablette et mobile comme tiroir latéral refermable depuis le menu de l’éditeur.
### Ajouté
- Renommage d'un chapitre depuis son menu, sans modifier ses révisions ni son texte ; détection de conflit et audit — PR #57, issue #56.
### Corrigé
- L'éditeur est maintenant non modifiable pour les rôles sans droit d'écriture.
### Sécurité
- Permissions revérifiées côté serveur, protection CSRF et concurrence optimiste sur les métadonnées de chapitre.
### Déploiement
- **READY à 2026-11-03T15:09:55.930Z** sur Vercel, déploiement `dpl_35aB6LZsC2jXV3dnp5KX1su9T3Rt`, commit `be62cb8f5e161090e855986b89bdf0ff121b1623` et tag annoté `v0.5.0`.
- CI GitHub `41660559176` réussie ; E2E propriétaire déclaré bon avant déploiement ; `/api/health` et `/api/version` HTTP 200.
- Snapshot Neon pré-release `snap-raspy-sound-bfd69sod`, aucune migration nécessaire. Verrou Vercel rétabli après READY.
- Registre : `docs/deployments/2026-11-03T15-09-55Z_v0.5.0.md`.

### Observabilité
- Suspicions de latence réseau entre Vercel `iad1` et Neon `us-west-2` ; diagnostic et optimisation planifiés dans la version suivante, sans métriques inventées.

## [0.4.0] — 2026-11-03 (production alpha privée)
### Ajouté
- Gestion des ouvrages : renommage, archivage non destructif et restauration depuis `Bibliothèque → Archives`, avec conservation des chapitres, révisions, commentaires et snapshots (PR #51).
- Messages de concurrence explicites et accès aux archives fondé sur les rôles.

### Sécurité
- Contrôles d'autorisation et d'origine, audit du renommage/archivage/restauration, absence de suppression définitive.
- Tests E2E HTTP contre PostgreSQL pour les permissions, conflits et restaurations.

### Déploiement
- **READY le 2026-11-03T13:44:30.481Z**, commit `227290fdf29baece2db64f7811363fd9168fb3bf`, tag Git annoté `v0.4.0`.
- CI `41646724124` verte sur ce commit, et **E2E v0.4.0-alpha déclaré BON** par le propriétaire avant déploiement.
- Sauvegarde Neon préalable `snap-shy-darkness-bf3ylyn5`; aucune migration SQL nécessaire ; `/api/health` et `/api/version` HTTP 200 en production.
- Journal : `docs/deployments/2026-11-03T13-44-30Z_v0.4.0.md`.

## [0.3.0] — 2026-11-03 (production alpha privée)
### Ajouté
- Recherche privée dans les seules révisions enregistrées courantes, avec navigation au chapitre et isolation des espaces — PR #43.
- Commentaires éditoriaux par chapitre, résolution/réouverture, protection des ancres révisionnelles et signalement « À revoir » — PR #45.

### Sécurité
- Contrôles d'autorisation et d'origine pour la recherche et les commentaires. Textes privés jamais envoyés à l'IA pour ces fonctions.

### Déploiement
- Production Vercel **READY le 2026-11-03T13:18:20.867Z**, commit exact `cb6f4e39d011306d06172c83e160f6771fcb0daf`, tag annoté `v0.3.0` ; CI verte, API de santé/version vérifiées. Fiche : `docs/deployments/2026-11-03T13-18-20Z_v0.3.0.md`.
- Migration additive `20261103132000_editorial_comments` appliquée sur Neon Production après snapshot préalable et répétition de restauration sur branche isolée.
- E2E utilisateur **déclaré bon** avant publication ; recette d'interactions sur la production connectée non revendiquée.
- Stockage privé et import web DOCX/PDF encore bloqués (#46) : exclus de cette version.

### Ajouté
- Commentaires éditoriaux par chapitre, résolution/réouverture, audit, ancrage strict sur révision et indicateur « À revoir » lorsque le texte évolue — issue #44.
### Sécurité
- Contrôles RBAC, validation de l'origine, prévention d'ancres ambiguës et absence de contenu provenant d'autres espaces.

### Ajouté
- Recherche privée sur les passages des **révisions courantes enregistrées** dans les seuls livres autorisés ; navigation vers les chapitres, résultats bornés et états UX accessibles — issue #42.
### Sécurité
- Requêtes paramétrées, caractères SQL LIKE littéralement échappés, isolation par espace et aucune fuite de contenu historique ni de requête vers un fournisseur IA.
### Exploitation
- Révocation du code de première activation après création du propriétaire ; suppression définitive des deux anciennes entrées Vercel restant à faire dans l'interface du fournisseur, sans modifier les variables de base de données.


## [0.2.0] — 2026-11-03 (production alpha privée)
### Corrigé
- Deux domaines HTTPS vérifiés sont acceptés pour les opérations protégées, exclusivement via la liste d'origines explicites; domaine canonique DTSC — issue #35.

### Déploiement
- Production privée READY sur Vercel le **2026-11-03 à 12:23:04 UTC**, commit `8fe15f5e152eec64abd90770b53335ab5986ff1d`. Recette API et connexion Neon confirmées ; première activation propriétaire et E2E humains restent à effectuer. Voir `docs/deployments/2026-11-03T12-23-04Z_v0.2.0.md`.

### Ajouté
- Export PDF de lecture A4 depuis un snapshot vérifié, contrôles d'accès et intégrité, traitement explicite des caractères non pris en charge — PR à venir (#29).

### Sécurité
- Activation initiale du propriétaire par code à usage unique, expiration courte et création atomique ; choix personnel du mot de passe sur HTTPS — #31.

### Sécurité
- Analyse DOCX hors ligne renforcée : archives ZIP piégées, chemins traversants, macros, XML dangereux, contenus suspects et rapports exigeant une revue humaine — PR #27.

### En cours
- Import DOCX/PDF utilisable sur le web, PDF de lecture, stockage objet et sauvegardes exploitables restent au programme : **ne pas les annoncer comme livrés**.

## [0.1.0] — livraison planifiée, non déployée
### Ajouté
- Première bibliothèque et création d'ouvrages privés, chapitres et éditeur Tiptap — PR #2.
- Historisation des révisions et détection des conflits — PR #2.
- Versions nommées et restauration conservant les anciennes révisions — PR #23.
- Export DOCX/Markdown basé sur un snapshot immuable — PR #24.
- Version applicative, endpoint de version et contrat de changelog — issue #25.

### Sécurité
- Réduction des tentatives abusives de connexion et renforcement des sessions — PR #22.
- Vérifications d'autorisations lors de la lecture, de la restauration et de l'exportation des manuscrits — PR #22–#24.

### Limites
- **Aucun déploiement en production à cette date** ; import Word/PDF complet, export PDF, antivirus, sauvegardes d'exploitation et IA non livrés.
- Nécessite une migration PostgreSQL contrôlée et la recette E2E sur la véritable URL protégée avant ouverture publique.

### Liens
- Fiche de publication prévue : `docs/releases/v0.1.0.md`
- Code source : `Bandsman942/bookstudio-ai`
