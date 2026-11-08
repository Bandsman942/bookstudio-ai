# Conception — progression privée d'un ouvrage (BS-004e #145)

**Candidat v0.26.0-alpha. Non déployé.**

## Sources de vérité et définitions

La progression ne doit jamais être calculée à partir des 24 premières cartes de la bibliothèque. Pour un ouvrage autorisé, utiliser **l'édition au numéro le plus élevé** et son manuscrit actif. Une révision du texte reste immuable : aucune requête du tableau de bord n'écrit une ligne.

- **Chapitres actifs** : chapitre de cette édition avec `deleted_at IS NULL`.
- **Avec texte enregistré** : dernière `DocumentRevision` du chapitre actif (`sequence` maximale) dont `text` contient au moins un caractère autre qu'un espace (`[^[:space:]]` dans PostgreSQL). Les sauvegardes anciennes ne doivent pas faire paraître rédigé un chapitre effacé puis enregistré vide.
- **Encore vides** : chapitres actifs moins chapitres avec texte. `writingCoveragePercent` = arrondi de `100 × avec_texte / actifs`. Ce pourcentage n'est **pas** un taux d'achèvement, une approbation, un nombre de mots ou un score de qualité.
- **Révisions enregistrées** : nombre de lignes `document_revisions` rattachées aux chapitres actifs de l'édition courante, y compris leur révision initiale 0.
- **Versions nommées** : nombre de `BookSnapshot` pour l'ensemble du livre. Les versions anciennes restent immuables ; leur contenu n'est pas chargé.
- **Chapitres retirés** : `deleted_at NOT NULL` uniquement dans le manuscrit de l'édition courante.
- **Dernière modification de chapitre** : plus grand `Chapter.updatedAt`, pouvant refléter renommage ou réorganisation ; **dernière révision** : max `DocumentRevision.createdAt` des chapitres actifs.

## Confidentialité, permissions et données

`GET /api/v1/books/{bookId}/progress` exige une session active et une appartenance au workspace de l'ouvrage. Un livre archivé, non trouvé ou hors tenant retourne HTTP 404 ; sans session HTTP 401 ; incident de la base HTTP 503. `Cache-Control: private, no-store`. Pas de manuscrit, texte, blocs, commentaires, source Supabase, URL signée ou secret dans la réponse.

Le service `getBookProgress()` revérifie le droit à l'ouvrage au niveau Prisma puis calcule en parallèle les métriques de l'édition courante. Une requête SQL paramétrée `$queryRaw` sélectionne la **dernière révision** par chapitre via `DISTINCT ON`, sans renvoyer le champ texte : seulement `chapterId` et booléen `hasText`. Les résultats sont associés aux IDs actifs autorisés avant le résumé.

Le chargement des métriques est **secondaire** sur la page serveur : si cette requête échoue, l'éditeur reste accessible et une explication contextualisée est affichée. Le tableau de bord ne bloque jamais la rédaction.

## Interface

- Section « Progression du manuscrit », barre native `<progress>`, six indicateurs, raccourcis structure/versions et dernier chapitre modifié.
- Badge par chapitre « Texte enregistré » ou « Pas encore de texte » ; aucun statut « terminé » automatique.
- Localisation FR/EN, contraste et focus hérités, mise en page 320px à 1440px.
- Une restauration ou un retrait entraîne un nouveau calcul après rafraîchissement, pas de double source de vérité.

## Limites et exploitation

Mesure non temps réel (réactualiser après sauvegarde), pas de nombre de mots/tokens ni d'objectif éditorial, pas de statistiques inter-édition, aucune nouvelle migration SQL, aucune variable Vercel. Contrôler les plans SQL `DISTINCT ON` et la latence des révisions longues en production, sans journaliser leur texte. ClamAV dédié non installé, scanner OFF ; les P0 sécurité restent ouverts.
