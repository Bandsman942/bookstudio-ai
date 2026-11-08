# BS-004d — Destinations d'import et tableau éditorial

Candidate v0.25.0-alpha, issue #141, non déployée.

## Contrat de confidentialité

L'API GET /api/v1/books accepte `editable=1` : le `where` Prisma filtre les
livres actifs dont l'utilisateur connecté appartient à un workspace comme
OWNER ou EDITOR. Les titres et totaux sont toujours calculés **après**
restriction RBAC ; aucun texte, contenu de chapitre, fichier source ni
URL signée n'est transmis. Le curseur keyset est lié à archived, editable,
q, type, status, sort. Un curseur provenant d'une autre portée retourne 400.
Il n'est ni un token d'autorisation ni une capacité de lecture.

## Sélecteur de destination

`BookDestinationPicker` appelle `GET /api/v1/books?editable=1&sort=title&limit=20`
indépendamment de la page des 24 livres de la bibliothèque. Recherche titre
maximum 80 caractères ; pagination manuelle ; aucune sélection d'ouvrage
extérieur ni archivé. Les demandes précédentes sont annulées à chaque nouveau
filtre et au démontage. Échec réseau : message FR/EN explicite et possibilité
de réessayer. L'API d'upload/confirmation effectue sa propre validation des
droits et de la destination, même si la liste a changé entre-temps.

## Tableau de bord

Les six comptes `byStatus` (DRAFT, WRITING, REVIEW, APPROVED,
PRODUCTION, PUBLISHED) proviennent d'un `groupBy` Prisma dans le même
périmètre RBAC que la liste ; `archived` est compté séparément.
`total` concerne la bibliothèque autorisée active, jamais le nombre de
cartes présentes. Une case de statut applique le filtre correspondante.

La publication déclarée dans le workflow n'est jamais une publication
publique. Les métriques représentent des comptes de livres, pas des mots
rédigés ni une estimation d'effort.

## Gouvernance

Aucune migration SQL, aucun secret, pas de serveur ClamAV provisionné.
`pnpm release:check` doit vérifier le manifeste documentaire en CI avant
E2E et production. Issue #5 reste ouverte pour les autres exigences métier.
