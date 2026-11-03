# E2E — Thèmes clair/sombre/système et interface FR/EN

**Candidat non déployé.** Référence issues #66 et #67.

## Fonctionnement visible
1. Sur la page publique et la connexion, ouvrir le menu **⋯**, choisir **Français** puis **English** ; les libellés des écrans doivent changer sans rechargement complet. `<html lang>` doit correspondre à la sélection.
2. Sur la Bibliothèque, l'option Apparence doit proposer **Système / Clair / Sombre**. Système suit `prefers-color-scheme` ; Clair et Sombre gardent la préférence même si le système change.
3. Après un changement de langue et de thème, naviguer vers livre, chapitre, archives et recherche, actualiser puis rouvrir le navigateur : les préférences doivent rester mémorisées.
4. Les menus « ⋯ » n'ont pas de contour visible au repos ; ils deviennent visibles au survol, à l'ouverture et au focus clavier, sur les trois thèmes.
5. Contrôler l'interface sombre de bout en bout : manuscrit, barre d'édition, dialogues, formulaires, cartes, commentaires, menus, erreurs, placeholders, textes sur fond sombre, papier de l'éditeur.
6. Ajouter un livre en anglais, vérifier titre initial **Chapter 1**, tandis qu'un livre en français commence par **Chapitre 1**. Le choix de langue d'interface ne doit **jamais** traduire automatiquement le contenu déjà écrit.
7. Passer de FR à EN pendant la saisie d'un chapitre hors connexion ; conserver le brouillon local et ne pas forcer un rafraîchissement destructeur.
8. Contrôler dates et nombres selon les formats de langue, et tous les libellés des parcours principaux : bibliothèque, ouvrage, actions contextuelles, chapitres, commentaires, snapshots, archives, recherche et connexion.
9. Sur réseau faible : éviter les appels externes pour changer de thème/langue ; aucune mutation métier ou base Neon.
10. Tester clavier, lecteur d'écran, focus, zoom 200 %, largeurs 320 / 375 / 768 / 1440 px, et contraste suffisant sur actions destructives.

## Gouvernance
La traduction des chaînes est basée sur un catalogue FR/EN typé avec fallback français ; les chaînes métier (API, statut de manuscrit, textes écrits par les auteurs) sont **distinctes** de l'i18n de l'interface. Aucune traduction automatique de contenu privé ne doit être déclenchée par la préférence de langue.

Les améliorations de traduction des modules futurs, des messages backend et des documents exportés feront l'objet de leurs propres jalons. Un test automatisé structurel `pnpm prefs:check` ne remplace pas cette recette visuelle.
