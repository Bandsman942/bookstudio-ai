# Historique des modifications — BookStudio AI by DTSC

Toutes les évolutions sont consignées selon [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et [Semantic Versioning](https://semver.org/lang/fr/). Le contenu est classé en **Ajouté / Modifié / Corrigé / Sécurité / Supprimé**. Les dates sont en UTC.

## [Non publié]
### Interface (à publier)
- Menus « ⋯ » sans fond, bordure ni ombre au repos, quel que soit leur composant parent. Surbrillance au survol/à l'ouverture ; contour de focus clavier maintenu, y compris à forte magnification — issue #65.


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
