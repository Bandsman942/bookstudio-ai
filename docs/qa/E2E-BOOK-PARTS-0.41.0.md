# Recette propriétaire — v0.41.0-alpha (candidate, non déployée)

## Préconditions

- CI verte **sur le SHA final de la PR**, migration sur PostgreSQL CI uniquement, tests `book-parts:check`, E2E API multi-tenant et typecheck/build verts. La CI ne remplace pas le test visuel manuel.
- Ouvrage avec **au moins 13 chapitres** et trois parties proposées, dont une vide, plusieurs H1/H2/H3 enregistrés et un chapitre sans partie. Conserver un chapitre avec du vrai texte édité et des révisions afin de contrôler leur intégrité.
- Android Chrome réel 320/360/375/390 px, tablette 768/900 px et bureau 1440 px. Tester FR/EN, clair/sombre, portrait/paysage, connexion lente, clavier physique et compte en lecture seule.

## Scénarios fonctionnels

1. Dans **Vue d'ensemble → Parties de l'ouvrage**, créer « Partie I — Fondements », « Partie II — Applications », « Annexes ». Les trois titres apparaissent, sans déplacer les 13 chapitres existants et sans recharger le texte de tous les chapitres.
2. Affecter les chapitres 1–4 à Partie I et 5–8 à Partie II. Le sommaire global doit montrer Partie I → 1–4 et Partie II → 5–8, avec les H1–H3 dépliables. Les autres chapitres restent listés sous « Sans partie » implicite et les étiquettes ne les masquent pas.
3. Tenter d'affecter le chapitre 10 à Partie I (en laissant un trou) : **refus contextualisé**, état inchangé. Déplacer le chapitre 4 derrière le 5 via menu ⋯ : refus si cela coupe Partie I en deux. Un déplacement qui conserve le regroupement est autorisé.
4. Renommer Partie II : le nouveau nom apparaît dans la vue, le sommaire et le Studio après navigation. Supprimer Partie I tant qu'elle a des chapitres : action indisponible/refus API. Détacher chacun, puis supprimer la **partie vide** : tous les chapitres restent accessibles, leurs textes intacts.
5. Ouvrir le Studio par un chapitre du milieu. Sur téléphone, le hamburger permet de voir les titres des parties et de défiler jusqu'au dernier chapitre. Ouvrir/fermer l'intelligence éditoriale reste possible sans réduire le Studio à une colonne tronquée. La navigation hors d'un brouillon non sauvegardé respecte la confirmation existante.
6. Créer une **nouvelle édition** depuis les sauvegardes : les parties et regroupements sont conservés, avec identités indépendantes ; l'ancienne édition reste lisible. Dupliquer le livre : nouvelle copie privée avec les mêmes titres/groupes et aucun import, commentaire, snapshot ou ancienne édition répliqué implicitement.
7. Vérifier propriétaire/éditeur vs réviseur/lecteur : les deux derniers **voient** les parties sans créer/renommer/affecter. Une personne d'un autre workspace ne peut ni consulter ni modifier les parties d'un livre étranger (404). Session absente : 401 ; mauvaise origine : 403.
8. Comparer le contenu du chapitre, le nombre de révisions, les positions et les snapshots **avant/après** organisation : aucun texte ni révision nouvelle, pas de perte ou de déplacement invisible. Restaurer un chapitre retiré : il revient en fin de livre **sans partie**.

## Gates avant main

- [ ] Documentation guide/design/API/exploitation/QA/roadmap, changelog et release dans la PR et `pnpm release:check` validés.
- [ ] CI complète au SHA exact, incluant E2E PostgreSQL et migration Prisma, types/build.
- [ ] Vérifications physiques mobiles et accessibilité consignées.
- [ ] Validation explicite du propriétaire : **`E2E v0.41.0-alpha BON`**.
- [ ] **Après validation seulement** : snapshot Neon production AVANT merge, merge `main`, Vercel prod-only Preview OFF, READY/health/version/logs et journal postproduction.

**Situation actuelle : EN ATTENTE de CI et E2E propriétaire. Aucun déploiement v0.41 autorisé.** ClamAV OFF.
