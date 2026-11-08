# Comparaison fiable mais prudente des éditions — BS-008b / BS-004g #152

**Candidate v0.28.0-alpha, NON déployée.**

## Contrat de confidentialité

`GET /api/v1/books/{bookId}/editions/compare?from=<UUID>&to=<UUID>` exige un utilisateur connecté, un livre non archivé, une appartenance workspace confirmée **avant** de lire les deux éditions. Les deux éditions doivent appartenir au même livre. Statuts : 401 sans session, 404 livre ou édition étrangère, 400 IDs identiques/invalides, 409 révision manquante, 422 plus de **350 chapitres actifs** dans une édition, 503 incident DB.

La réponse est toujours `Cache-Control: private,no-store`. Elle n'inclut **aucun contenu `DocumentRevision.text`, ProseMirror `content`, hash brut, source Supabase, token, URL signée**. Les métadonnées de chapitres (ID, titre, position) sont des données privées accessibles uniquement après autorisation. Les révisions sont interrogées avec une projection `contentHash` interne uniquement.

## Correspondances déterministes

Un chapitre de l'édition A n'a pas d'identifiant commun avec sa copie en B. Il est impossible de prouver toute filiation si aucun identifiant de lignée explicite n'est enregistré. Pour ne pas produire de fausses certitudes, `compareEditionFingerprints()` rapproche, pour les occurrences **uniques**, successivement :
1. même emplacement, titre normalisé et empreinte ;
2. empreinte de contenu complète identique et unique ;
3. titre normalisé identique et unique.

Un couple rapproché peut être indiqué **modifié** (empreinte), **renommé** (titre) et/ou **déplacé** (position). Tout reste **lecture seule**. Les éléments sans correspondance non ambiguë sont affichés comme **ajoutés** et **absents**, avec un avertissement : un chapitre totalement renommé et réécrit peut ressembler à une suppression + ajout. Les doublons de titres/contenu ne sont pas associés arbitrairement. Le taux de changements n'est pas une évaluation de qualité littéraire.

## Interface et tests

La comparaison s'affiche sous la chronologie des éditions dans la vue d'ensemble ; deux sélecteurs, bouton Comparer, compteurs et listes de différences, message de limitation et d'incertitude ; FR/EN, mobile 320/375/768px, lecteur d'écran. Aucune mutation, aucun appel IA. Tests pure engine `pnpm edition-diff:check` et E2E HTTP : copie identique, changement d'un texte de la nouvelle édition, ajout, lecture autorisée/cross-workspace, aucune prose/hash en JSON.

Le même lot corrige l'overlay vidéo #151 en portalisant les quatre dialogues hors des cartes `transform`/`overflow:hidden` (détails dans `docs/design/ACTIONS-CONTEXTUELLES.md`).

**Non inclus :** diff sémantique/mot à mot, comparaison de sources binaires, lineage irréprochable sans champ structurel, pagination de très grands corpus, édition des versions historiques. Garder #9 ouvert pour les autres comparaisons et restauration avancée. ClamAV reste différé.
