# Historique des modifications — BookStudio AI by DTSC

Toutes les évolutions sont consignées selon [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et [Semantic Versioning](https://semver.org/lang/fr/). Le contenu est classé en **Ajouté / Modifié / Corrigé / Sécurité / Supprimé**. Les dates sont en UTC.

## [Non publié]

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
