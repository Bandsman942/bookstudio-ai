# Recette E2E — BS-008 versions nommées et restaurations (#9)

Préconditions : interface accessible en environnement **protégé**, DB de test migrée, un auteur A et un auteur B, aucun manuscrit inédit réel.

1. A crée un livre avec deux chapitres et du texte. Dans **Versions & historique**, crée « Avant réécriture » : la carte apparaît avec date, nombre de chapitres et empreinte.
2. A modifie les deux chapitres et confirme « Enregistré ». Il crée une deuxième version, « Après réécriture ».
3. A restaure « Avant réécriture », confirme dans la boîte de dialogue ; ouvrir chaque chapitre : son ancien texte apparaît.
4. Le compteur de révision des chapitres a **augmenté** ; les anciennes révisions n'ont pas été effacées.
5. A revient au livre et crée un nouveau chapitre ; une restauration d'une version plus ancienne ne supprime pas ce nouveau chapitre (restauration de contenu seulement).
6. Deux onglets simultanés : si un chapitre évolue entre la préparation et la restauration, l'API refuse la restauration avec HTTP **409** (aucun effet partiel).
7. B tente GET/POST version du livre A et restauration d'un identifiant récupéré : toutes les opérations sont refusées.
8. Recharger et rouvrir la liste des versions : mêmes noms, dates et empreintes ; aucune régression de sauvegarde.
9. Sur 320/768/1440 px : création, liste et boutons Restaurer lisibles et accessibles au clavier.

**Invariants à vérifier :** snapshot immuable, manifest hash canonique, auteur/date en audit, transaction sérialisable, restauration append-only, zero fuite inter-compte. Pas d'export Word/PDF dans ce lot.

**Critère de passage :** tous les points 1 à 9 OK ; PR #9 peut ensuite être fusionnée après ses dépendances #2 et #22, mais aucune production publique sans autres P0 et validation finale du propriétaire.
