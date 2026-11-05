# Conception : bibliothèque paginée et filtrée (BS-004c #138)

**Version candidate v0.24.0-alpha — non déployée.**

## Invariants et sécurité

- `GET /api/v1/books` utilise **toujours** `workspace.memberships.some(userId)` pour restreindre les livres avant tout filtre, tri, agrégat et curseur. L'API ne retourne ni contenu de chapitre ni source, secret, URL signée ou identité d'un autre workspace.
- Index existant `@@index([workspaceId,updatedAt])` ; aucune migration SQL. Les requêtes `contains` par titre sont limitées à 80 caractères, lancées seulement à la soumission du formulaire. Index trigram et recherche avancée peuvent être envisagés après métriques réelles, pas revendiqués ici.
- Pagination **keyset** déterministe : `(updatedAt DESC,id DESC)` ou `(title ASC,id ASC)`. Le curseur opaque est un JSON encodé base64url contenant `v,sort,key,id,scope`. `scope` est l'empreinte SHA-256 des filtres `archived,q,type,status,sort` ; elle n'est **pas une signature/authentification** et **ne remplace jamais** le filtre RBAC. Toute altération ou réutilisation du curseur avec d'autres filtres retourne HTTP 400.
- La limite est entière 1–100 (par défaut 100 pour compatibilité API historique), la vue bibliothèque charge 24 cartes côté serveur et les pages suivantes à la demande. Les compteurs sont des agrégats de **tous les livres autorisés**, pas un décompte des premières 24 cartes. Le total filtré décrit le nombre d'éléments satisfaisant la recherche.
- Un livre modifié pendant la pagination peut changer de place dans le tri ; recharger le filtrage recompose le jeu de résultats. Le client déduplique les IDs. Ne pas revendiquer une photographie transactionnelle immuable de la bibliothèque pendant plusieurs pages.
- Tri titre se base sur la collation PostgreSQL du serveur ; il ne garantit pas un tri francophone accent-insensible.
- `archived=1` préserve la compatibilité des archives et la vue active exclut toujours les archives.

## Interface et performance

- SSR de 24 cartes et compteurs complets ; filtres par recherche, type, statut et tri, bouton Appliquer/Réinitialiser, état vide et « Afficher davantage ».
- Pendant une requête, empêcher les soumissions concurrentes ; un changement de filtre réinitialise le curseur. Les requêtes précédentes sont interrompues en cas de changement ou démontage. Un échec de réseau laisse les cartes visibles inchangées et affiche un toast FR/EN contextualisé.
- Accessible clavier, mobile 320/375/768 px, mode sombre via tokens. Les actions des livres restent protégées par RBAC et la route PATCH actuelle.
- Le sélecteur d'ouvrage lors d'un import travaille sur les cartes actuellement chargées : rechercher l'ouvrage dans la bibliothèque avant d'ouvrir l'import. Une sélection indépendante paginée doit être livrée séparément.

## Tests

`pnpm library-paging:check` teste limites, parsing, scope et curseurs invalides. L'E2E API vérifie 2 pages distinctes, filtres et count, refus de curseur incompatible et isolation des espaces. Le contrôle manuel d'ouvrages (>30), de réseau faible et de responsive figure dans `docs/qa/E2E-LIBRARY-0.24.0.md`.
