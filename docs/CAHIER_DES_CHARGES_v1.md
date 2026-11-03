# BOOKSTUDIO AI **by DTSC**

## Cahier des charges fonctionnel, technique et UX/UI

**Version :** 1.0 — cadrage initial  
**Date :** 3 novembre 2026  
**Statut :** proposition structurante, à valider avant implémentation  
**Nature :** nouveau produit autonome ; dépôt GitHub et base de données dédiés  
**Commanditaire :** DTSC  
**Confidentialité :** document de conception — diffusion contrôlée

> **Vision produit.** BookStudio AI est un atelier éditorial intelligent qui accompagne un ouvrage depuis l'idée ou l'import d'un manuscrit jusqu'à la révision, la validation documentaire, la mise en page et l'export. L'IA conseille ; l'auteur demeure le décideur et le propriétaire de son travail.

## Synthèse décisionnelle

BookStudio AI ne sera **ni un module ERP de DTSC Platform, ni un simple chatbot de rédaction**. Il s'agira d'une application web indépendante, disposant de son propre dépôt, de son cycle CI/CD, de son instance logique de données **Neon PostgreSQL** et de sa sécurité. Certains services transversaux de DTSC Platform pourront être réutilisés **exclusivement par API versionnées** après audit et contractualisation : identité/SSO, abonnements et paiements, notifications, éventuellement passerelle IA et support.

**Décisions recommandées dès le cadrage :**

1. Dépôt séparé proposé : `Bandsman942/bookstudio-ai` (nom à confirmer ; **non créé** à la date du document).
2. Neon : **projet Neon dédié à BookStudio AI**, avec branches et identifiants propres. Aucune lecture directe des tables DTSC Platform.
3. Modèle documentaire structuré autour du livre, de l'édition, du chapitre et de blocs stables ; Tiptap/ProseMirror pour l'édition. Les données collaboratives Yjs, si utilisées, constituent la vérité des révisions de texte et sont projetées dans un format de lecture indexable.
4. Frontend Next.js/TypeScript ; backend applicatif modulaire ; workers Python isolés pour l'analyse/conversion documentaire et les traitements lourds.
5. Intégrations externes résilientes : BookStudio doit continuer à fonctionner si DTSC Platform, un fournisseur IA ou une base bibliographique sont momentanément indisponibles.
6. Livraison incrémentale : d'abord **importer, écrire, corriger, sauvegarder, versionner, exporter sans perte** ; ensuite enrichir l'intelligence éditoriale et la publication avancée.

---

# 1. Objectifs, périmètre et indicateurs

## 1.1 Objectifs métier

- Centraliser plusieurs ouvrages et éditions dans un espace privé ou collaboratif.
- Créer un manuscrit à partir de zéro ou importer un document DOCX/PDF sans perdre le fichier source.
- Disposer d'un éditeur puissant, lisible, autosauvegardé, utilisable sur de longs livres.
- Obtenir des diagnostics contextualisés : langue, style, structure, narration, cohérence, références et affirmations.
- Conserver la **voix de l'auteur** et obtenir des propositions de correction non destructives.
- Gérer les preuves et les références bibliographiques avec traçabilité.
- Comparer les versions, restaurer et expliquer les modifications.
- Préparer des ouvrages électroniques ou imprimés, avec des exports reproductibles.
- Préserver la confidentialité des manuscrits et encadrer toute transmission à l'IA.
- Construire une plateforme commercialisable, tout en évitant d'imposer les modules commerciaux à un usage personnel.

## 1.2 Publics et modes de travail

| Persona | Besoin prioritaire | Spécificité fonctionnelle |
|---|---|---|
| Auteur de roman | Structurer une histoire et la réviser | Personnages, lieux, intrigue, chronologie |
| Auteur scientifique / médical | Fiabilité, citations, cohérence | Sources, DOI, langage prudent, validation experte |
| Enseignant / auteur pédagogique | Progression des notions | Objectifs, exercices, glossaire, prérequis |
| Essayiste / professionnel | Organiser une argumentation | Carte d'idées, plan, cohérence logique |
| Correcteur / relecteur | Proposer sans écraser | Suggestions, commentaires, droits limités |
| Éditeur / maison d'édition | Piloter plusieurs ouvrages | Étapes, assignations, versions et validations |
| Designer éditorial | Produire un rendu | Modèles, couverture, prévisualisation, exports |
| Administrateur de plateforme | Exploitation et sécurité | Quotas, incidents, audit et support minimal |

## 1.3 Mesures de succès (cibles à confirmer en tests)

| Indicateur | Cible initiale proposée | Méthode |
|---|---|---|
| Parcours import → édition → export | 100 % des scénarios E2E prioritaires passent | Suite E2E avec corpus de référence |
| Perte de contenu validé | 0 événement toléré | Tests de reprise, concurrence et coupures réseau |
| Import DOCX courant | Structure correctement reconnue dans ≥ 95 % des cas du corpus pilote | Contrôle humain, par type d'élément |
| Autosauvegarde | Accusé de persistance visible, délai cible p95 < 3 s sur connexion normale | Mesures navigateur + serveur |
| Ouverture d'un chapitre | p95 < 2 s pour le corpus cible | Test de performance navigateur |
| Accessibilité | WCAG 2.2 AA visée pour les parcours essentiels | Audit manuel et automatisé |
| Qualité suggestions | ≥ 80 % jugées utiles sur un panel éditorial pilote | Évaluation humaine, non automatique |
| Traçabilité IA | 100 % des suggestions rattachées à une révision et au contexte analysé | Audit d'événements |

**Remarque :** les seuils ci-dessus sont des **objectifs de conception**, non des performances déjà atteintes ni des SLA contractuels.

## 1.4 Hors périmètre initial

Marketplace de livres, impression à la demande intégrée, distribution commerciale, traduction littéraire certifiée, détection infaillible du plagiat, vérification automatisée de la vérité scientifique, reproduction intégrale de livres tiers protégés, gestion des droits d'auteur complexes et suite de PAO équivalente à InDesign. Ces fonctions pourront faire l'objet d'études ultérieures.

# 2. Principes fondamentaux et règles métier transversales

**RM-01 — Autonomie.** BookStudio et DTSC Platform possèdent des référentiels, secrets, déploiements et données distincts. Aucune dépendance directe à un schéma Prisma ou à la base de DTSC Platform.

**RM-02 — Source préservée.** À chaque import, le binaire original est stocké de manière immuable. La conversion produit une représentation éditable distincte, accompagnée d'un rapport de fidélité.

**RM-03 — Auteur souverain.** Une suggestion IA est `PROPOSED`, jamais appliquée automatiquement. Elle devient `ACCEPTED` ou `REJECTED` par un acteur autorisé ; les opérations de masse nécessitent prévisualisation et confirmation.

**RM-04 — Texte et apparence séparés.** L'écriture appartient au domaine `Manuscript`, les styles de publication au domaine `Publication`; un changement de gabarit ne modifie pas le manuscrit.

**RM-05 — Version figée pour export.** Toute exportation est liée à un snapshot, un modèle et une version du moteur de rendu ; un export peut être régénéré ou comparé.

**RM-06 — Bibliographie vérifiable.** Une référence retrouvée par DOI n'est pas automatiquement une preuve qu'elle soutient une assertion. Toujours distinguer identité de la source, intégrité des métadonnées, pertinence et support de l'affirmation.

**RM-07 — Analyses périmées.** Tout changement de contenu peut marquer les analyses, suggestions ou ancres concernées comme `STALE` ; elles ne doivent plus apparaître comme valables sans recalcul.

**RM-08 — Consentement IA.** L'utilisateur choisit si le contenu peut être traité par des fournisseurs IA externes, et peut désactiver l'IA. Aucune donnée privée de projet ne part vers un fournisseur non autorisé.

**RM-09 — Isolation par espace.** Un membre ne voit jamais un livre sans être autorisé, même s'il en connaît l'identifiant. Contrôles serveur pour chaque lecture et mutation.

**RM-10 — Dépendances tolérantes aux pannes.** Échec d'un service DTSC externe : mise en file, fallback ou message ciblé ; jamais de blocage de l'éditeur ou de perte de contenu.

# 3. Parcours utilisateurs et carte fonctionnelle

## 3.1 Navigation principale

Au niveau global : **Bibliothèque**, **Rechercher**, **Modèles**, **Activité**, **Compte / Abonnement**. Au niveau projet : **Vue d'ensemble**, **Manuscrit**, **Plan & notes**, **Analyses**, **Sources & citations**, **Versions**, **Design**, **Exports**, **Paramètres & équipe**.

La navigation est contextuelle : dans le Studio, les panneaux latéraux sont masquables et le ruban n'expose que les commandes utiles. Sur mobile, priorité à la lecture, aux commentaires, aux corrections ciblées et au suivi.

## 3.2 Parcours nominaux

**P01 — Nouveau livre.** Créer projet → renseigner type, langue, métadonnées, public → choisir plan ou page blanche → créer chapitre → écrire → voir état enregistré → créer version → exporter.

**P02 — Import Word.** Charger `.docx` → contrôle sécurité → extraction titres/blocs/images/notes/citations → prévisualisation → réconciliation éventuelle → validation de structure → édition → export et comparaison avec source.

**P03 — Import PDF.** Charger PDF natif ou numérisé → détecter besoin d'OCR → extraire structure avec score de confiance → signaler tableaux, colonnes et notes douteuses → correction manuelle → édition. La restitution fidèle à 100 % n'est pas promise.

**P04 — Correction assistée.** Sélectionner une phrase → choisir type de correction → recevoir une proposition avec diff → accepter/refuser → révision et attribution enregistrées.

**P05 — Diagnostic complet.** Choisir périmètre (sélection / chapitre / livre) → définir grille et budget IA → traiter de façon asynchrone → consulter un rapport regroupé → naviguer vers les passages → décider d'actions.

**P06 — Citation.** Sélectionner passage → rechercher / créer source → rattacher citation structurée → choisir style CSL → régénérer bibliographie → vérifier collisions et références non utilisées.

**P07 — Collaboration.** Inviter par adresse ou compte → attribuer rôle et expiration éventuelle → collaborateur commente ou propose → auteur tranche → journal conservé.

**P08 — Publication.** Geler un snapshot → sélectionner gabarit → prévisualisation → contrôler erreurs typographiques / citations / images → générer DOCX/PDF → télécharger.

**P09 — Reprise après incident.** Perte réseau → informer sans dramatiser → stocker localement si disponible → resynchroniser sans duplication → conserver historique → afficher conflits uniquement si non résolus automatiquement.

# 4. Domaine Bibliothèque et projets

## 4.1 Fonctions

Création, renommage, archivage, clonage, suppression logique avec délai de récupération, recherche, étiquettes, dossiers/collections et favoris. Fiche projet : titre provisoire/définitif, sous-titre, auteurs, type, genre, langue, lectorat, résumé, mots-cibles facultatifs, progression, dernière activité, vignette/couverture, équipe et confidentialité.

Un projet peut contenir plusieurs **éditions** ; une édition peut avoir un manuscrit maître et plusieurs branches éditoriales de travail. Une traduction doit être une édition dérivée avec sa propre langue et ses propres versions, jamais un écrasement.

## 4.2 États métier

`DRAFT` (en préparation) → `WRITING` (rédaction) → `REVIEW` (révision) → `APPROVED` (validé) → `PRODUCTION` (mise en page) → `PUBLISHED` (publié) → `ARCHIVED` (archivé). Retours possibles avec justification. L'état du livre ne remplace ni les états des suggestions ni les statuts d'export.

**Conditions :** publication seulement depuis un snapshot validé ; export de lecture autorisé avant validation ; révision post-publication crée une nouvelle version de travail ou édition.

# 5. Domaine Manuscrit et éditeur

## 5.1 Éditeur structurel

Édition WYSIWYG basée sur Tiptap/ProseMirror ; blocs : paragraphes, titres, citations, listes, tableaux, figures, légendes, séparateurs, encadrés, notes, références, équations selon besoins, ruptures de sections. Hiérarchie : parties / chapitres / sections, repli, déplacement, duplication, renumérotation et table des matières dynamique.

Fonctions : rechercher/remplacer dans chapitre ou livre, historique annuler/rétablir, compteur de mots, objectif de rédaction, navigation clavier, commentaires ancrés, suggestions de modification, mode concentration, écriture plein écran, export du seul chapitre, aperçu lecture.

## 5.2 Identifiants et conservation

Chaque chapitre et bloc reçoit un identifiant stable (`uuid`). Les ancres de commentaires et citations comportent l'identifiant documentaire, une plage relative robuste et un extrait témoin. En cas de modification, un résolveur tente de recalculer l'ancre ; si ambiguïté, statut `ANCHOR_REVIEW_REQUIRED` au lieu de la rattacher au mauvais texte.

La **source de vérité** d'un chapitre collaboratif est l'état/document Yjs et son journal de mises à jour persisté ; JSON ProseMirror, texte plein et index vectoriels sont des **projections reconstruites**, jamais des sources d'écriture concurrentes. Pour un MVP sans collaboration temps réel, une alternative transactionnelle par révision optimiste est acceptable ; la décision doit être prise avant le développement.

## 5.3 Importation et qualité

- Formats acceptés en MVP : `.docx`, `.pdf`. Rejeter macros actives et exécutables ; reconnaître le MIME réel.
- DOCX : conserver styles, titres, listes, tableaux, images, liens et notes dans les limites du parseur ; enregistrer les éléments non transformables.
- PDF natif : extraction textuelle et de mise en page ; PDF image : OCR explicite, avec indicateur d'incertitude.
- Générer `ImportReport` : pages, sections, éléments extraits, pertes potentielles, avertissements et revue humaine.
- Prévoir aperçu côte à côte du manuscrit importé et de l'original, échantillons de contrôle et possibilité d'annulation.
- Conserver le document source et ses empreintes cryptographiques indépendamment des conversions.

**Critère de recette :** aucun import ne doit être déclaré « fidèle » sans contrôle de la structure, des notes, des figures et des tableaux sur le corpus applicable.

## 5.4 Sauvegarde et résilience

Enregistrer chaque mise à jour dans un système persistant, avec accusé serveur ; gestion des tentatives et de la reconnexion. UI explicite : `Enregistrement…`, `Enregistré`, `Hors ligne`, `Échec — sauvegarde locale en attente`. Protéger contre fermeture de page avec opérations non synchronisées. Toute restauration d'une version génère une nouvelle révision.

# 6. Domaine Intelligence éditoriale et IA

## 6.1 Types d'analyses

| Niveau | Contrôles | Sortie attendue |
|---|---|---|
| Langue | Orthographe, accords, grammaire, ponctuation | Suggestion justifiée et diff |
| Style | Redondance, longueur, ambiguïté, ton | Observations non impératives |
| Structure | Plan, introductions, transitions, équilibre | Carte de recommandations |
| Cohérence | Contradictions, terminologie, dates | Paires de passages liées |
| Narration | Personnages, chronologie, intrigue | Fiches et anomalies candidates |
| Pédagogie | Objectifs, prérequis, exercices, progression | Rapport par compétence |
| Scientifique | Assertions, niveaux de preuve, références | Éléments à vérifier avec sources |
| Originalité | Similarités permises et risques de paraphrase | Avertissement prudent ; jamais verdict automatique |
| Prépublication | Table des matières, notes, figures, légendes | Liste de contrôle bloquante/non bloquante |

## 6.2 Agent éditorial contextualisé

L'assistant travaille sur un **périmètre explicite** : passage / chapitre / livre / corpus d'ouvrages autorisés. Il accède par outils filtrés et permissions ; il ne reçoit pas librement toute la base de données. Réponses avec citations internes vers des identifiants de chapitre et des références externes quand disponibles.

Modes : `Correction stricte`, `Révision stylistique`, `Analyse argumentative`, `Conseils narratifs`, `Expertise documentaire`, `Planification`, `Questions-réponses`. Les réglages enregistrent langue, niveau, public cible, règles de style, termes protégés, expressions à éviter et degré d'intervention permis.

## 6.3 Chaîne IA (workflow)

`AnalysisRequest` → contrôle permission/consentement/quota → snapshot de l'objet analysé → découpage sensible aux chapitres → recherche lexicale/vectorielle autorisée → outils déterministes → appel modèle selon politique → validation structure JSON → ancrage des résultats → déduplication → stockage → interface de revue. Le dossier de provenance inclut modèle, fournisseur, empreinte du prompt, version du manuscrit, fichiers consultés, consommation et horodatage.

Des outils déterministes assurent l'orthographe simple, le diff, les doublons DOI et le calcul de compteurs. Les modèles servent à la compréhension contextuelle, sans être présentés comme source de vérité autonome.

## 6.4 Permissions et garde-fous

- Un document importé ou une page web est une **donnée non fiable**, jamais une instruction système ; défense contre injections de prompt.
- Les modèles ne disposent d'aucune clé d'administration ni d'accès transversal entre projets.
- Toute écriture de texte, suppression, fusion de chapitres, modification de citations et diffusion passe par une action contrôlée et auditée.
- Le modèle ne peut affirmer avoir consulté une source si une requête/document vérifiable ne figure pas dans la provenance.
- Distinguer `FACT_CHECK_PENDING`, `SOURCE_FOUND`, `SOURCE_SUPPORTS_CLAIM_REVIEWED`, `CONTRADICTED` ; le dernier exige une justification et éventuellement validation experte.
- Pour contenus sensibles, proposer la désactivation du traitement IA externe et la suppression des copies dérivées selon politique de rétention.

## 6.5 Coûts et modèle multi-fournisseurs

`AiGatewayAdapter` interne : fournisseurs configurables, politiques par tâche, disponibilité, classifications de données, budget par utilisateur/projet/organisation, rate limit, retries, circuit breaker et fallback explicite. Si un jour la passerelle de DTSC Platform est exposée via API publique sécurisée, un adaptateur BookStudio pourra l'utiliser ; **aucune compatibilité n'est présumée aujourd'hui**.

# 7. Domaine Bibliographie, citations et recherche documentaire

## 7.1 Objets et formats

Bibliothèque de sources propre à l'utilisateur ou au projet. Métadonnées normalisées : `title`, `authors`, `issued`, `containerTitle`, `publisher`, `volume`, `issue`, `pages`, `DOI`, `ISBN`, `PMID`, `URL`, `language`, `type`, `licence`, `retrievedAt`, `sourceProvider`. Citations liées à un identifiant stable et à une localisation (pages/sections si disponible).

Importer/exporter RIS, BibTeX et CSL-JSON ; Zotero (lecture puis synchronisation bidirectionnelle sous autorisation), Crossref/OpenAlex (métadonnées et découverte). Styles CSL : Vancouver, APA, Chicago, IEEE selon types. Le formatage est distinct des données source.

## 7.2 Détection des collisions

1. **Doublons exacts :** DOI/PMID/ISBN normalisés identiques ; suggérer fusion, ne pas supprimer sans accord.
2. **Doublons probabilistes :** titre, auteurs, année et édition proches ; afficher score et motifs.
3. **Discordance de métadonnées :** même identifiant, titre/auteurs divergents ; mise en quarantaine et vérification.
4. **Citation cassée :** source supprimée, citation sans cible ou ancre perdue ; bloquer export « prêt à publier ».
5. **Référence non citée :** marquage et proposition de retrait facultative.
6. **Divergence de conclusions :** deux études en désaccord ; présenter un **débat scientifique**, pas un doublon.
7. **Signalement de correction/rétractation :** alerte avec source et date de vérification, sans suppression automatique.

## 7.3 Suggestions intelligentes

L'analyse parcourt les affirmations `Claim` et produit des `EvidenceGap` : assertion non sourcée, donnée périmée potentielle, référence insuffisamment pertinente. Elle propose des résultats de recherche consultables et indique leur niveau de vérification. Un article trouvé ne prouve pas à lui seul la pertinence de sa conclusion.

**Règle essentielle :** les livres protégés proposés comme inspiration ne peuvent être reproduits ou ingérés intégralement sans droit/licence. Résumés et extraits respectent le périmètre autorisé et la traçabilité de provenance.

# 8. Domaine Plan, notes, inspiration et continuité intellectuelle

Plan du livre arborescent avec objectifs par chapitre, liens de dépendances, statut et notes de recherche. Cartographie optionnelle des concepts et arguments ; bible narrative (personnages, lieux, événements) ou bible scientifique (définitions, hypothèses, nomenclature), selon profil éditorial.

L'utilisateur peut conserver notes libres, extraits autorisés, fiches de lecture, glossaire, décisions éditoriales et tableaux d'idées. Les éléments sont indexés au projet et restent distincts du manuscrit jusqu'à insertion explicite. Les suggestions de « prochain chapitre » s'appuient sur le plan et les passages identifiables.

# 9. Versions, commentaires, équipe et gouvernance des approbations

## 9.1 Modèle de versions

Sauvegardes continues (opérations), snapshots techniques réguliers, versions nommées par l'auteur et jalons de publication. Comparaison visuelle : insertions, suppressions, mouvements de blocs, évolution d'images/références. Restauration non destructive. Les snapshots de publication sont immuables et datés.

Une suggestion conserve : `suggestionId`, `authorId` / `modelId`, `baseRevisionId`, `anchor`, texte d'origine, texte proposé, motif, confiance éventuelle, statut et acteur/date de décision. Lors d'un changement concurrent, afficher `CONFLICT` ou recalculer une suggestion sur demande.

## 9.2 Rôles et matrice d'accès

| Rôle | Lire | Écrire manuscrit | Proposer/commenter | Valider publication | Gérer accès |
|---|---|---|---|---|---|
| Propriétaire | Oui | Oui | Oui | Oui | Oui |
| Coauteur | Oui | Oui | Oui | Selon délégation | Non par défaut |
| Éditeur responsable | Oui | Selon mandat | Oui | Selon délégation | Selon mandat |
| Correcteur | Oui | Non directement | Oui | Non | Non |
| Relecteur scientifique | Oui | Non directement | Oui | Non | Non |
| Designer | Contenu nécessaire | Non | Sur rendu | Non | Non |
| Lecteur invité | Selon partage | Non | Facultatif | Non | Non |
| Support plateforme | Non par défaut | Non | Non | Non | Non |

**Contrôles :** invitation expirante/révocable, journal d'accès, suppression d'accès immédiate, protections côté API et WebSocket, partage par projet et éventuellement par chapitre en V2.

# 10. Studio de design et diffusion

## 10.1 Gabarits et publication

Couche de styles indépendante du contenu : taille de page, marges, typographies, en-têtes/pieds de page, numérotation, hiérarchie des titres, veuves/orphelines, tables, images et notes. Gabarits par genre : roman, essai, manuel, mémoire/ouvrage scientifique. Aperçu paginé, rapport de débordement et d'images basse résolution.

MVP : DOCX éditable + PDF de lecture. Phase avancée : EPUB 3, PDF d'impression contrôlé, jaquette/couverture avant/dos/quatrième, gabarits d'imprimeur, gestion de fonds perdus ; les exigences PDF/X doivent dépendre de l'imprimeur et du moteur de rendu réellement retenu.

## 10.2 Exports comme objets métier

`ExportJob` référence une version immuable, format, modèle et réglages ; l'artefact généré possède checksum, taille, statut, journal de conversion, durée de conservation et lien de téléchargement temporaire signé. Reproduire un export ne doit pas prendre la version courante par erreur. ZIP de portabilité : sources, structure, annotations et manifeste, dans la limite des autorisations des collaborateurs.

# 11. UI/UX : design system et exigences détaillées

## 11.1 Principes

Premium sobre, sans surcharge de widgets ; une zone de travail centrale, structure latérale gauche et intelligence contextuelle à droite, tous deux repliables. Navigation au clavier, commande universelle, mode concentration, thème clair/sombre/sépia, typographie distincte pour le manuscrit et les commandes. Les recommandations IA n'interrompent pas la rédaction.

## 11.2 Écrans obligatoires

| Écran | Élément dominant | Actions essentielles |
|---|---|---|
| Connexion / onboarding | Projet en cours / nouveau | Créer, importer, récupérer |
| Bibliothèque | Cartes des livres et filtres | Ouvrir, archiver, trier |
| Tableau de bord d'un livre | Progression et problèmes | Reprendre, analyser, traiter |
| Studio de rédaction | Page/texte centré | Écrire, naviguer, suggérer |
| Plan & notes | Arbre + notes | Déplacer, planifier, lier |
| Rapport d'analyse | Constats regroupés | Filtrer, ouvrir passage, résoudre |
| Sources & citations | Bibliothèque + vérifications | Ajouter, fusionner, citer |
| Versions | Frise + diff | Comparer, nommer, restaurer |
| Design | Aperçu paginé | Configurer gabarit |
| Export | Snapshot + prévol | Générer, suivre, récupérer |
| Collaboration | Membres / demandes | Inviter, révoquer, examiner |
| Paramètres | Style, confidentialité, quotas | Configurer et exporter données |

## 11.3 Interaction et accessibilité

- Zéro fenêtre modale abusive pour une correction simple ; actions réversibles avec feedback clair.
- Une recherche trouve termes, chapitres, notes, citations et éventuellement analyses (avec filtres).
- Les détails d'une erreur conduisent au bon paragraphe ; pas de toast générique du type « Erreur ».
- Desktop ≥ 1024 px : trois panneaux adaptatifs ; tablette : deux panneaux ; mobile : studio à écran unique avec tiroirs.
- Navigation sur petits écrans sans débordement horizontal ; zones tactiles suffisantes ; respect des zones sûres.
- Contraste, focus visible, ordre de tabulation, étiquettes lecteurs d'écran, préférences de mouvement réduit ; objectif WCAG 2.2 AA.
- Tous les écrans documentent loading, empty, error, offline, permission denied et succès.

# 12. Architecture applicative cible

## 12.1 Diagramme logique

```text
Navigateur / PWA BookStudio (Next.js)
   │ HTTPS (session BookStudio)
   ▼
BFF / API BookStudio (API REST v1 + évènements)
   ├── Identité et autorisations
   ├── Projets / manuscrits / versions
   ├── Analyses / références / recherche
   ├── Design / exports / quotas
   ├── Adaptateurs de services DTSC (facultatifs)
   │       └── DTSC Platform : contrats API inter-applications
   ├── Neon PostgreSQL dédié (données structurées, journaux, pgvector optionnel)
   ├── Stockage S3 compatible dédié (sources, médias, exports)
   ├── Redis / queue (tâches, événements, limites)
   ├── Service temps réel Yjs/Hocuspocus (si activé)
   └── Workers isolés Python / Node
           ├── Ingestion Word/PDF/OCR
           ├── Indexation et analyse IA
           ├── Références Crossref / OpenAlex / Zotero
           └── Conversion DOCX / PDF / EPUB
```

## 12.2 Choix d'infrastructure

Frontend : Next.js, React, TypeScript, Tailwind/shadcn. Éditeur : Tiptap/ProseMirror ; collaboration optionnelle Yjs/Hocuspocus, hébergée sur un service WebSocket adapté, non sur des fonctions HTTP éphémères. API : modules métier Node/TypeScript ; validation Zod, OpenAPI contractuel, services idempotents. Workers Python/FastAPI et outils de conversion conteneurisés. Hébergement web potentiellement Vercel ; workers, WebSockets et conversions dans une infrastructure persistante distincte.

Neon PostgreSQL contient métadonnées, droits, objets éditoriaux, révisions, référentiel bibliographique, jobs et audit ; **les binaires volumineux restent en stockage objet**. `pgvector` est envisagé pour la recherche sémantique, avec index hybride lexical/SQL ; le nombre de vecteurs et leurs dimensions dépendront du modèle retenu.

**Neon :** connexion poolée pour trafic applicatif concurrent ; connexion directe pour migrations et certaines opérations administratives ; environnements isolés (production, staging, développement/test), contrôles de coûts et sauvegardes. L'usage des branches Neon pour des tests doit tenir compte de la confidentialité des manuscrits : pas de données personnelles copiées en dev sans anonymisation/autorisation.

## 12.3 Politique de déploiement

Dépôt séparé, workflows GitHub Actions et CI propres ; `main` protège la production, PR avec checks obligatoires, suites unitaires/intégration/E2E et revue de sécurité. Staging indépendant recommandé pour tests ; pas de publication de branches expérimentales en production. Les conventions DTSC de qualité peuvent inspirer le nouveau dépôt, mais **les configurations GitHub, Vercel et les secrets ne sont jamais partagés implicitement**.

# 13. Interopérabilité avec DTSC Platform : frontière anti-couplage

## 13.1 Audit léger du dépôt existant

Consultation en lecture seule du dépôt `Bandsman942/dtsc-platform` sur la branche `main`, le 03/11/2026 : présence de routes de connexion, catalogue d'abonnement, renouvellement, contexte agent IA et politique IA. Ces éléments montrent des **capacités internes DTSC existantes**, pas nécessairement des **API externes stables**. Par exemple, la route de connexion vérifiée utilise le contexte organisationnel, l'origine de la requête et des cookies applicatifs ; elle ne doit **pas** être utilisée directement comme SSO inter-applications. Un audit contractuel et sécurité est requis avant chaque intégration.

## 13.2 Matrice make/buy/reuse

| Service | BookStudio au départ | Réutilisation DTSC possible | Précondition bloquante |
|---|---|---|---|
| Identité | Auth autonome | OIDC/SSO fédéré | DTSC doit fournir un vrai IdP / OIDC documenté |
| Comptes/profils | Profil local minimal | Synchronisation volontaire | Consentement, identifiant externe stable |
| Abonnements | Entitlements locaux BookStudio | Catalogue/billing de DTSC | API serveur-à-serveur et webhooks signés |
| Paiements | Mode manuel ou propre | DTSC Payments | Contrat de paiement, devise, statuts, idempotence |
| Notifications | Email interne minimal | DTSC notification service | API d'envoi isolée, modèles et rate limits |
| IA | Passerelle BookStudio propre | DTSC AI Gateway | API dédiée, politiques de données, coût et quotas |
| Support | Tickets basiques | DTSC Support | API externe et consentement sur les métadonnées |
| Analytics | Télémétrie BookStudio | Agrégats côté DTSC | Aucune fuite de contenu d'ouvrage |

**Règle absolue :** pas de requêtes SQL croisées, pas d'import de classes métiers DTSC Platform, pas de partage de session cookie entre sous-domaines. L'intégration se fait par `IntegrationPort` + `Adapter`, désactivable par feature flag, derrière un BFF BookStudio.

## 13.3 Contrats d'API à négocier (propositions ; non existants aujourd'hui)

Exemples de familles cibles, sous un domaine d'intégration indépendant :

- `GET /v1/identity/me` : claims d'utilisateur **après** fédération OIDC validée.
- `GET /v1/entitlements/{subjectId}?product=bookstudio` : plan, limites, période et version de contrat.
- `POST /v1/payments/intents` : intention de paiement avec `Idempotency-Key`.
- `GET /v1/payments/{paymentId}` : consultation ; notifications `payment.succeeded`, `payment.failed` par webhook signé.
- `POST /v1/notifications` : type, destinataire externe approuvé, template et identifiant d'événement.
- `POST /v1/ai/jobs` : tâche limitée, classification, budget et consentement ; aucune lecture implicite de manuscrit.

Ces routes sont **des contrats à concevoir**, non des endpoints vérifiés de DTSC Platform. Les références exactes et les propriétaires de schéma seront fixés par des ADR (Architecture Decision Records).

## 13.4 Sécurité des échanges et pannes

Authentification `client_credentials` OAuth2 ou jetons de service courts avec audience et scopes limités ; mTLS selon contraintes d'hébergement ; listes d'origines restreintes ; horodatage, signature HMAC des webhooks, idempotence et protection contre les rejeux ; versionnement `/v1`, documentation OpenAPI, erreurs normalisées (`code`, `message`, `requestId`).

Les appels synchrones doivent avoir délai d'expiration, retries bornés pour seules opérations sûres, circuit breaker, métriques de santé et fallback. Les évènements sont consommés **au moins une fois** : traitement idempotent par `eventId`. Perte d'accès à DTSC : lecture/édition du manuscrit maintenues ; les fonctions commerciales ou liées au SSO suivent un mode dégradé explicitement conçu.

## 13.5 Séparation des identités et des abonnements

`BookStudioUser` possède son identifiant local ; le lien `ExternalIdentityLink` conserve fournisseur, subject externe, date et consentement. Les droits d'accès aux projets sont **toujours** évalués dans BookStudio. Un abonnement payant ne confère jamais automatiquement le droit de lire un manuscrit. Les notifications de paiement modifient des `EntitlementGrant` BookStudio, sans recopier les tables de facturation DTSC.

# 14. Modèle de données conceptuel Neon

## 14.1 Schémas logiques

Pour la maintenance, séparer par préfixe de module ou schémas PostgreSQL selon maturité ; une convention initiale unique (`public` avec modèles Prisma nommés) est acceptable. Contraintes de clé étrangère, unicité et index définies en migrations. Les entités ci-dessous ne sont pas une migration exécutable ; elles cadrent les règles métier.

| Ensemble | Entités principales | Contraintes et index essentiels |
|---|---|---|
| Identité | User, ExternalIdentityLink, Workspace, Membership, Invite | unique(provider, externalSubject), rôle, statut |
| Projet | BookProject, BookEdition, Manuscript, Section, Chapter | projectId, editionId, orderKey, visibility |
| Édition | ContentBlockProjection, DocumentUpdate, DocumentSnapshot | chapterId + revision ; projection reconstruisible |
| Révision | Revision, NamedVersion, Branch, ChangeEvent | snapshot immuable, provenance, contentHash |
| Éditorial | Comment, Suggestion, Anchor, EditorialDecision, GlossaryTerm | statut, baseRevision, actorId |
| Intelligence | AnalysisRequest, AnalysisFinding, ModelInvocation, AiPolicy | idempotencyKey, scope, modèle, coût, consentement |
| Documents | SourceFile, MediaAsset, ImportJob, ImportReport | sha256, ownerId, objectKey, statut |
| Bibliographie | BibliographicSource, Citation, Claim, EvidenceGap | DOI normalisé, citationAnchor, provenance |
| Recherche | SearchChunk, Embedding, ConceptRelation | revisionId, projet, ACL, modèle d'embedding |
| Design | PublicationTemplate, BookStyle, ExportJob, ExportArtifact | immutableSnapshotId, checksum, format |
| Plateforme | AuditEvent, OutboxEvent, WebhookInbox, UsageLedger, EntitlementGrant | eventId unique, retries, retention |

## 14.2 Exemples de champs métiers

`BookProject(id, workspaceId, ownerId, title, bookType, language, status, createdAt, updatedAt, archivedAt)` ; `Chapter(id, manuscriptId, title, orderKey, revisionSeq, createdAt, updatedAt)` ; `Suggestion(id, chapterId, baseRevisionId, anchorId, proposedPatchJson, rationale, origin, status, decidedBy, decidedAt)` ; `Citation(id, sourceId, chapterId, anchorId, locator, prefix, suffix)` ; `ExportJob(id, manuscriptSnapshotId, templateVersionId, format, status, requestedBy, resultObjectKey, sha256)`.

Ne pas matérialiser toute l'arborescence des blocs en tables relationnelles si cela multiplie les écritures et complique les opérations CRDT. Conserver le document structuré dans les snapshots, projeter des blocs référencés stables à des fins de recherche/annotation. Les transactions critiques (droits, versions, export, citations) restent relationnelles.

## 14.3 Index, lifecycle et rétention

Index composites tenant/projet/statut/date ; unicité DOI normalisé à **niveau de bibliothèque** seulement lorsque la politique de fusion le permet ; index plein texte français et multilingue ; vecteurs versionnés par fournisseur/modèle ; purge des caches et index après suppression autorisée. Journaux d'audit protégés en écriture ; sauvegardes testées par restauration ; délais de rétention configurés et documentés.

# 15. API BookStudio : contrat initial

Toutes les API sont préfixées `/api/v1`, avec identité authentifiée et autorisation sur chaque ressource ; pagination par curseur, `requestId`, validation de schéma, filtres bornés, réponses d'erreurs structurées et clés d'idempotence pour créations coûteuses.

| Méthode / endpoint indicatif | Usage | Contrôles |
|---|---|---|
| `POST /books` | Créer un projet | Utilisateur autorisé, quota |
| `GET /books` | Lister ses projets | ACL, pagination |
| `GET /books/{id}` | Lire les métadonnées | Membre du projet |
| `POST /books/{id}/imports` | Déposer document (phase 1) | Type/taille, scan, URL signée |
| `GET /imports/{id}` | Statut et rapport | Propriétaire/projet |
| `GET /chapters/{id}` | Lire document/projection | ACL chapitre |
| `POST /chapters/{id}/suggestions` | Proposer patch | Révision de base, permission |
| `POST /suggestions/{id}/decision` | Accepter/refuser | Auteur autorisé, conflit vérifié |
| `POST /books/{id}/analysis-jobs` | Lancer analyse | Consentement, quota, snapshot |
| `GET /analysis-jobs/{id}` | Résultats | ACL, statut, révision |
| `POST /books/{id}/sources` | Ajouter référence | Contrôle métadonnées |
| `POST /books/{id}/citations` | Lier citation au texte | Source existante, ancre valide |
| `POST /books/{id}/versions` | Snapshot nommé | Droits, hash, immutabilité |
| `GET /books/{id}/versions/diff` | Comparer versions | ACL, versions existantes |
| `POST /books/{id}/exports` | Générer export | Snapshot, droits et prévol |
| `GET /exports/{id}` | Statut/téléchargement | URL signée temporaire |
| `POST /books/{id}/invites` | Inviter collaborateur | Rôle autorisé, expiration |
| `GET /me/usage` | Consommation IA/stockage | Identité et politique |

**Temps réel :** canal WebSocket autorisé par ticket éphémère, lié au chapitre/projet et validé lors de la connexion puis de ses renouvellements. Les payloads d'édition ne transitent pas par les API de génération IA.

## 15.1 Événements internes

`book.created`, `import.completed`, `manuscript.revision_committed`, `analysis.completed`, `suggestion.decided`, `source.reverified`, `export.ready`, `member.revoked`, `entitlement.changed`. Pattern outbox en transaction pour garantir que l'événement correspond à un changement métier persisté. Ordre par agrégat et déduplication consommateurs.

# 16. Sécurité, confidentialité, conformité et droit d'auteur

## 16.1 Contrôles non négociables

- Authentification forte et MFA facultative au départ ; MFA imposable pour admins/équipes éditoriales.
- Sessions HTTP-only, secure, anti-CSRF/validation d'origine selon transport et design ; aucune réutilisation brute des cookies DTSC.
- ACL vérifiées côté backend à chaque lecture, recherche vectorielle, événement, fichier et WebSocket ; journal des refus.
- Chiffrement TLS, chiffrement stockage et sauvegardes ; secrets dans coffre de secrets, rotation et séparation par environnement.
- Uploads : allowlist de formats, limitation taille, quotas, scan antimalware, sandbox sans exécution active, protection contre bombes ZIP et chemins trompeurs.
- Rendus HTML/markdown nettoyés, CSP, protections SSRF pour import d'URL, rate limiting et alertes opérationnelles.
- Fichiers privés via stockage objet + URL signées courtes ; pas de lien public permanent pour manuscrits.
- Suppression de projet : contrôle d'impact, délai de récupération, politique de purge des dérivés et sauvegardes ; information claire sur limites temporelles.
- Politique d'IA : consentement documenté, journal des fournisseurs sollicités, durée de conservation, classification des contenus, contenu tiers non fiable.
- Export et effacement des données personnelles selon les législations applicables et pays cibles ; revue juridique avant commercialisation internationale.

## 16.2 Propriété et droits

L'auteur conserve ses droits sur son œuvre selon contrats et droit applicable ; les conditions générales doivent préciser la licence technique limitée nécessaire à l'hébergement et au traitement. Les collaborateurs peuvent avoir leurs propres droits de contribution à encadrer. Les modèles d'IA ne garantissent pas originalité ou absence de contrefaçon. Les métadonnées bibliographiques ne donnent pas automatiquement accès au texte intégral des publications.

## 16.3 Journalisation et assistance

Ne jamais journaliser par défaut le texte intégral des manuscrits, prompts privés, contenus sensibles ou clés. Traces techniques par `requestId`, `bookId` pseudonymisé et événements métier. Support sans accès au contenu par défaut ; accès exceptionnel uniquement avec consentement temporaire et audit détaillé.

# 17. Exigences non fonctionnelles et exploitation

| Domaine | Cible / exigence |
|---|---|
| Disponibilité | Objectif initial 99,5 % mensuel sur les fonctions d'édition, à valider économiquement |
| Performance | Navigation fluide sur 300–500 pages grâce au chargement par chapitre ; aucune page géante dans le DOM |
| Sauvegarde | Accusés fiables, reprise après réseau interrompu, zéro perte lors des scénarios testés |
| Sauvegarde/restauration | RPO cible 15 min, RTO cible 4 h pour incidents sévères, **à valider** |
| Scalabilité | Jobs en queue, autoscaling workers, limites par projet pour éviter monopolisation |
| Observabilité | Logs structurés, métriques latence/coût, traces, alertes, tableaux de santé |
| Portabilité | Export intégral du projet ; format document et sources documentés |
| Interopérabilité | OpenAPI, Webhooks et schémas versionnés ; adaptateurs DTSC non obligatoires |
| Localisation | Interface FR en priorité ; contenu multilingue ; traduction UI extensible |
| Accessibilité | WCAG 2.2 AA pour parcours essentiels ; audits réguliers |
| Réversibilité fournisseur | Remplacement possible de l'IA, du stockage, des services DTSC par adaptateurs |
| Résilience | Idempotence, retrys bornés, dead-letter queue, mode dégradé hors services externes |

Les contrats commerciaux de performance devront être décidés après mesures du MVP. Les objectifs techniques ci-dessus ne constituent pas des engagements déjà obtenus.

# 18. Organisation du dépôt GitHub indépendant

## 18.1 Structure recommandée

```text
bookstudio-ai/
├── apps/
│   ├── web/                 # Next.js : bibliothèque, studio, BFF
│   ├── worker-documents/    # Python : import DOCX/PDF, OCR, exports
│   └── realtime/            # Yjs/Hocuspocus (si collaboration)
├── packages/
│   ├── domain/              # Entités, invariants, use cases
│   ├── database/            # Prisma, migrations Neon, seed
│   ├── editor-schema/       # Nodes ProseMirror, ancres, transforms
│   ├── ui/                  # Design system et composants
│   ├── api-contracts/       # OpenAPI, Zod, types d'événements
│   ├── integrations/        # Ports DTSC, Zotero, Crossref, IA
│   ├── testing/             # Fixtures, corpus, E2E helpers
│   └── observability/       # Logging, métriques, audit commun
├── docs/
│   ├── architecture/adr/
│   ├── functional-spec/
│   ├── api/
│   ├── security/
│   ├── runbooks/
│   ├── qa/
│   └── release-notes/
├── .github/
│   ├── workflows/
│   └── ISSUE_TEMPLATE/
├── AGENTS.md
├── CONTRIBUTING.md
├── README.md
└── pnpm-workspace.yaml
```

Les composants Python peuvent disposer de leur propre gestionnaire de dépendances sans être forcés dans `pnpm`. Monorepo **BookStudio seul**, totalement séparé du dépôt DTSC Platform ; aucun sous-module Git obligatoire vers DTSC.

## 18.2 Stratégie Git

Issues avant développement, features courtes, PR ciblées, CI exigée, revue, E2E propriétaire pour parcours critiques, merge vers `main` après gates, déploiement contrôlé, observabilité et rollback. Gouvernance inspirée de DTSC mais réglée pour ce produit. Publier le repo en privé pendant la phase de développement est recommandé tant que secrets, modèles commerciaux et architecture sont en maturation ; décider de la licence séparément.

# 19. Plan de réalisation en lots et priorités

## 19.1 Lot 0 — Fondations et preuve technique (P0)

Créer dépôt, architecture, CI/CD, instance Neon dédiée et migrations ; prototype Tiptap ; test de documents longs ; preuve import DOCX/PDF sur corpus varié ; preuve export ; sécurité uploads ; ADR sur persistance ProseMirror/Yjs, identités et isolation. **Go/no-go :** un DOCX complexe est importé, modifié, sauvegardé, restauré puis exporté sans défaut critique silencieux.

## 19.2 Lot 1 — MVP éditorial fiable (P0)

Comptes, bibliothèque, projets/chapitres, éditeur, autosauvegarde, import assisté, commentaires simples, suggestions manuelles/IA par passage, versions nommées, recherche plein texte, exports DOCX/PDF de lecture, journal d'activité, sauvegardes, pages d'erreurs. **Go/no-go :** parcours de bout en bout validés par un auteur réel sur un manuscrit long.

## 19.3 Lot 2 — Intelligence et bibliographie (P1)

Analyses chapitre/livre, règles de style, cohérence, RAG, moteur de citations et sources, DOI/doublons, Crossref/OpenAlex, bibliographies CSL, Zotero import ; affichage de provenance et limites de confiance. **Go/no-go :** un relecteur peut vérifier pourquoi l'IA suggère chaque changement et chaque source.

## 19.4 Lot 3 — Collaboration et édition avancée (P1)

Invitation, rôles, suivi des modifications, Yjs temps réel si retenu, arbitrage de conflits, versions comparées, bible narrative/scientifique, glossaire et notes. **Go/no-go :** collaboration concurrente sans perte, permission révoquée immédiatement.

## 19.5 Lot 4 — Design / publication (P2)

Gabarits, prévisualisation paginée, couverture, EPUB, PDF d'impression avec prévol, exports reproductibles, contrôles d'images et d'accessibilité documentaire. **Go/no-go :** livres de test validés sur lecteurs EPUB et profils d'impression cibles.

## 19.6 Lot 5 — Commercialisation et intégration DTSC (P2)

Quotas, plans, métriques d'utilisation, facturation, webhooks, SSO facultatif, notifications externes, administration support, conformité et documentation commerciale. Chaque adaptateur DTSC possède une activation indépendante. **Go/no-go :** aucun incident de paiement/DTSC n'empêche un auteur de lire et modifier un livre déjà accessible.

## 19.7 Backlog illustratif et dépendances

| ID | Priorité | Épic | Dépend de |
|---|---|---|---|
| BS-001 | P0 | Dépôt, CI, qualité et environnements | — |
| BS-002 | P0 | Neon / Prisma / migrations | BS-001 |
| BS-003 | P0 | Identité locale et ACL | BS-002 |
| BS-004 | P0 | Projet, édition, chapitre | BS-003 |
| BS-005 | P0 | Schéma éditorial et autosauvegarde | BS-004 |
| BS-006 | P0 | Import DOCX, contrôle de fidélité | BS-005 |
| BS-007 | P0 | Import PDF/OCR et rapport | BS-006 |
| BS-008 | P0 | Versions, restauration, diff | BS-005 |
| BS-009 | P0 | Export DOCX/PDF lecture | BS-005, BS-008 |
| BS-010 | P0 | Sécurité documents et recovery | BS-001 → BS-009 |
| BS-011 | P1 | Analyse linguistique IA | BS-005 |
| BS-012 | P1 | Analyse structurelle et RAG | BS-011 |
| BS-013 | P1 | Bibliothèque sources et CSL | BS-004 |
| BS-014 | P1 | Vérification et collisions sources | BS-013 |
| BS-015 | P1 | Suggestions ancrées et validation | BS-008, BS-011 |
| BS-016 | P1 | Collaboration et permissions fines | BS-005, BS-003 |
| BS-017 | P2 | Studio design et EPUB | BS-009 |
| BS-018 | P2 | Adaptateur identité DTSC (SSO) | API externe auditée |
| BS-019 | P2 | Adaptateur billing/paiements DTSC | API + webhooks audités |
| BS-020 | P2 | Adaptateur IA DTSC | Contrat sécurité / coûts |

# 20. Recette et scénarios E2E obligatoires

| Référence | Scénario | Attendu impératif |
|---|---|---|
| E2E-01 | Créer livre, chapitre, rédiger et revenir | Texte identique, état « enregistré » fiable |
| E2E-02 | Importer DOCX avec titres, notes, tableaux, images | Rapport fidèle, anomalies visibles, original conservé |
| E2E-03 | Importer PDF numérique et PDF scanné | Différenciation OCR, avertissements de confiance |
| E2E-04 | Éditer hors réseau puis reconnecter | Aucun doublon/perte, état de synchro clair |
| E2E-05 | Deux éditions concurrentes d'un même chapitre | Fusion ou conflit explicite, jamais écrasement silencieux |
| E2E-06 | Restaurer une version puis comparer | Nouvelle révision créée, ancienne intacte |
| E2E-07 | Accepter/refuser suggestion IA | Diff exact, attribution, historique |
| E2E-08 | Modifier le texte après création d'une suggestion | Résultat `STALE`/conflit, pas de mauvais patch |
| E2E-09 | Rattacher citation puis changer style CSL | Citations et bibliographie recalculées |
| E2E-10 | Ajouter deux sources même DOI | Collision détectée, fusion proposée et réversible |
| E2E-11 | Source introuvable / retraitée | Alerte prudente, pas de source inventée |
| E2E-12 | Utilisateur non membre appelle API du projet | 403/404 selon politique, aucun contenu divulgué |
| E2E-13 | Révoquer un invité pendant une session | API et WebSocket refusent les accès futurs |
| E2E-14 | Service DTSC externe indisponible | Lecture, écriture, sauvegarde et export local possibles |
| E2E-15 | Fournisseur IA en panne / budget épuisé | Message utile, aucune perte, fallback autorisé uniquement |
| E2E-16 | Exporter snapshot V1 pendant édition V2 | Artefact reste strictement attaché à V1 |
| E2E-17 | Importer fichier malveillant / très volumineux | Rejet sécurisé, aucune exécution, trace sans contenu |
| E2E-18 | Supprimer projet puis le restaurer dans délai | Données et permissions conformes |
| E2E-19 | Générer export avec citation cassée | Prévol signale et bloque seulement « prêt à publier » |
| E2E-20 | Écran mobile 320 px / clavier / lecteur d'écran | Navigation fonctionnelle, pas de chevauchement bloquant |
| E2E-21 | Injection de prompt dans document importé | Aucune commande privilégiée exécutée |
| E2E-22 | Webhook paiement envoyé deux fois | Un seul changement d'entitlement, audit conservé |

Compléter par tests unitaires invariants, tests de contrat OpenAPI, migrations up/down sur branche Neon, charge et endurance de livres longs, tests d'accessibilité, tests de sécurité OWASP et répétitions de restauration de sauvegardes.

# 21. Risques et plans de réduction

| Risque | Impact | Mitigation |
|---|---|---|
| Import complexe dégrade la structure | Fort | Corpus représentatif, rapport de fidélité, original conservé |
| Deux sources de vérité éditeur | Critique | ADR unique Yjs/persistance/projections, tests de reprise |
| IA hallucine ou cite de faux travaux | Fort | Provenance, outils de vérification, contrôle humain |
| Fuite de manuscrit confidentiel | Critique | ACL, chiffrement, audit, fournisseurs IA consentis |
| Coût IA non maîtrisé | Fort | Budgets, cache, quotas et jobs mesurés |
| Dépendance au backend DTSC | Fort | API contracts, ports/adapters, mode autonome |
| EPUB / PDF d'impression imparfaits | Moyen à fort | Prévol, corpus de test, reports de phase |
| Licence commerciale éditeur/collaboration | Moyen | Vérification Tiptap/extensions et coûts avant engagement |
| Trop de modules livrés simultanément | Fort | Lots priorisés, gates E2E, périmètre MVP strict |
| Collisions bibliographiques faussement positives | Moyen | Suggestions explicables et fusion humaine |

# 22. Gouvernance, décisions ouvertes et critères de lancement

## 22.1 Décisions à prendre avant Lot 0

1. Nom commercial final et réservation de domaine ; `BookStudio AI by DTSC` reste une désignation de travail.
2. Statut privé/public du nouveau dépôt GitHub et licence.
3. Mode d'identité du lancement : autonome recommandé ; SSO DTSC uniquement après intégration OIDC réelle.
4. Choix MVP : éditeur individuel transactionnel ou Yjs dès le départ (selon calendrier collaboration).
5. Fournisseur de stockage objet, politique de rétention et résidence des données.
6. Fournisseurs IA autorisés, politique de consentement et classification des manuscrits.
7. Corpus pilote : au moins un roman, un ouvrage scientifique, un livre illustré et un PDF scanné.
8. Fonctionnalités gratuites, quotas et stratégie de paiement (à activer ultérieurement).
9. Règles d'accès support et traitement des demandes de suppression/portabilité.
10. Gouvernance des décisions d'architecture et validation du design system.

## 22.2 Livrables de conception détaillée

- ADR-001 `Document source of truth / CRDT / snapshots`.
- ADR-002 `Auth autonome vs fédération DTSC OIDC`.
- ADR-003 `Neon environments, migrations, backups and vector search`.
- ADR-004 `Document ingestion fidelity and conversion pipeline`.
- ADR-005 `AI orchestration, provenance, privacy and budgets`.
- ADR-006 `Citation anchors and CSL data model`.
- ADR-007 `Exports reproducibles and PDF rendering`.
- Wireframes : bibliothèque, tableau de bord, studio trois panneaux, analyse, sources, versions, design et export.
- OpenAPI v1 et schémas d'événements ; diagramme ERD détaillé ; modèle de permission ; matrice de menaces ; corpus E2E.

## 22.3 Définition de « prêt à développer »

Le Lot 0 commence lorsque les responsables ont accepté : périmètre MVP, stockage/sauvegarde, indépendance du dépôt, schéma de sécurité, décision CRDT, parcours critiques, budget de traitement IA et critères E2E. Les décisions non retenues sont enregistrées dans les ADR, avec conséquences et stratégie de révision.

## 22.4 Définition de « prêt à ouvrir aux premiers auteurs »

La plateforme doit permettre un cycle complet sans pertes : projet → import ou page blanche → édition/autosauvegarde → correction → versions → export. Tous les scénarios P0 doivent être verts, restaurations démontrées, accès non autorisés bloqués, documentation de récupération publiée, coûts observables et tableau d'incidents opérationnel.

# 23. Annexes

## 23.1 Glossaire

**BFF** : Backend for Frontend ; couche d'API adaptée au client. **CRDT** : structure de données permettant fusion des éditions concurrentes. **CSL** : Citation Style Language, format de styles bibliographiques. **DOI** : identifiant pérenne de publication. **EPUB** : format de livre numérique. **Idempotence** : répétition d'une action sans effets supplémentaires. **Neon** : service PostgreSQL géré avec branches de base. **OCR** : reconnaissance optique de caractères. **OIDC** : protocole de fédération d'identité. **RAG** : génération augmentée par récupération d'informations. **Snapshot** : version figée d'un état éditorial. **Worker** : processus asynchrone de traitement.

## 23.2 Documentation technique consultée (sources principales)

- Dépôt DTSC Platform, `main` (consultation limitée, 03/11/2026) : `https://github.com/Bandsman942/dtsc-platform` ; fichiers : `package.json`, `docs/CONTRIBUTING.md`, `app/api/auth/sign-in/route.ts`, `app/api/billing/catalog/route.ts`, `app/api/billing/renewal-request/route.ts`, `app/api/ai/agent/context/route.ts`, `app/api/admin/ai/policy/route.ts`.
- Neon — Connexion et branches : `https://neon.com/docs/get-started/connect-neon` ; `https://neon.com/branching`.
- Prisma PostgreSQL/Neon : `https://docs.prisma.io/docs/orm/core-concepts/supported-databases/postgresql`.
- Tiptap Collaboration / Hocuspocus : `https://tiptap.dev/docs/collaboration/getting-started/overview` ; `https://tiptap.dev/docs/hocuspocus/getting-started/overview`.
- Docling formats pris en charge : `https://docling-project.github.io/docling/usage/supported_formats/`.
- Zotero Web API v3 : `https://www.zotero.org/support/dev/web_api/v3/basics`.
- Crossref REST : `https://www.crossref.org/documentation/retrieve-metadata/rest-api/`.
- OpenAlex API : `https://docs.openalex.org/`.
- Citation Style Language : `https://citationstyles.org/`.
- OWASP LLM Prompt Injection : `https://genai.owasp.org/llmrisk/llm01-prompt-injection/`.
- OWASP File Upload Cheat Sheet : `https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html`.

## 23.3 Synthèse finale

**BookStudio AI by DTSC** est défini comme un **nouveau produit SaaS autonome**, reposant sur **son propre dépôt GitHub**, **son propre projet Neon PostgreSQL** et une architecture documentaire robuste. La connexion avec DTSC Platform reste possible, mais **facultative, contractualisée et réversible via API**. La première priorité reste un éditeur et une chaîne import/version/export fiables ; l'IA, la bibliographie et la publication avancée amplifient ensuite la valeur du produit sans se substituer à l'auteur.