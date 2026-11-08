# E2E propriétaire v0.28.0-alpha — comparaison d'éditions et menu des ouvrages

**Prérequis : deux éditions d'un même livre et la vidéo de régression du 8 novembre 2026. Candidate NON déployée.**

1. Sur Bibliothèque, survoler une carte, cliquer **⋯ → Modifier les propriétés…**. La modale doit être **immédiatement au centre avec voile plein écran**, sans se resserrer dans la carte. Déplacer la souris sur la couverture puis ailleurs : ni saut, ni clignotement, ni coupure de dialogue.
2. Refaire pour **Renommer**, **Faire évoluer le statut éditorial**, **Archiver**. Vérifier X/Échap/clic extérieur, fermeture avant action, confirm/succès/erreurs contextualisés FR/EN. L'action Archive ne doit archiver qu'après confirmation explicite.
3. Tester la même carte en Chrome mobile (320px, 375px), tablette 768px, desktop 1364px, zoom 200 %, thème clair/sombre, clic droit et navigation au clavier. Le scroll de la modale doit fonctionner sans faire défiler l'arrière-plan.
4. Aller sur **Vue d'ensemble → Éditions → Comparer** et sélectionner l'édition 1 puis sa copie 2. Si rien n'a changé depuis la duplication : compteur **inchangés** exact, zéro modification, aucun faux changement par nouveaux UUID.
5. Modifier le **texte de la nouvelle édition uniquement** et enregistrer. Relancer Comparer : le compteur contenu modifié augmente ; la lecture de l'édition originale et les exports des anciens snapshots demeurent strictement identiques.
6. Ajouter puis retirer un chapitre de la nouvelle édition ; contrôler additions et absences dans la comparaison, sans les confondre avec une édition historique. Renommer/déplacer un chapitre et vérifier les marqueurs, selon la correspondance unique.
7. Tester deux chapitres aux titres et empreintes identiques : ne pas inventer de rapprochement ambigu. Un chapitre renommé ET entièrement réécrit peut être compté comme absent+ajouté ; l'interface doit avertir de cette limite.
8. Se déconnecter : HTTP 401 sur compare. Autre workspace ou édition d'un autre livre : 404. IDs invalides/identiques : 400. Ouvrage archivé : 404. Une édition >350 chapitres actifs : 422 sans modification de données. Vérifier qu'aucune prose ni hash brut n'est présent dans la réponse JSON.
9. Tests automatisés : `pnpm edition-diff:check`, `pnpm ui:check`, `pnpm test`, E2E HTTP Postgres, typecheck et build ; toutes les pièces documentaires du manifeste `docs/releases/v0.28.0.md` **préparées avant la publication**, contrôlées par `pnpm release:check`.
10. Contrôler la politique : ClamAV dédié absent et OFF, aucune migration SQL/variable nouvelle. Ne publier que depuis main après snapshot Neon et validation utilisateur E2E v0.28.0-alpha BON.

**Interdiction de fusion/déploiement** avant CI SUCCESS au SHA final et E2E propriétaire BON ; Vercel production-only Preview OFF et journal des preuves après READY.
