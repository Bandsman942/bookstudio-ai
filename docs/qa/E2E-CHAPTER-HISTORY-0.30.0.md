# E2E v0.30.0-alpha — historique et restauration de chapitre (#158)

**CANDIDATE NON PUBLIÉE**. La CI doit être verte au dernier SHA documenté ; la validation humaine exigée est `E2E v0.30.0-alpha BON`.

1. Ouvrir un chapitre, écrire et sauvegarder successivement deux textes différents. Le numéro de révision progresse à chaque sauvegarde et l'état **Enregistré** s'affiche. Dans la barre du Studio, ouvrir **Historique**.
2. Vérifier la ligne actuelle, les auteurs et les dates. Sélectionner une ancienne révision : le texte affiché correspond exactement à celui enregistré. Les anciennes versions sont lisibles sans toucher au contenu de l'éditeur.
3. Vérifier pagination de l'historique au-delà de 20 révisions ; **Charger les révisions précédentes** ne répète pas les lignes. À l'API `?limit=2`, retrouver `nextBefore` et la suite. Les limites malformées ou >50 doivent renvoyer 400.
4. Avec un brouillon local non sauvegardé, tenter **Restaurer cette révision** : refus explicite côté UI. Ne pas perdre les modifications du navigateur. Sauvegarder puis relancer l'action.
5. Sélectionner une ancienne révision et confirmer sa restauration. Une **nouvelle révision** apparaît ; le contenu courant retrouve le texte choisi, les anciennes révisions et dates restent inchangées. Le statut du livre revient à **Brouillon**. Le navigateur se resynchronise sans ajouter de seconde restauration involontaire.
6. Onglets simultanés : tenter restauration avec `expectedRevision` obsolète : HTTP 409 et aucune modification. Tenter de restaurer la révision déjà courante : 422.
7. Après création d'une nouvelle édition, la route d'historique de l'ancien chapitre et sa mutation renvoient 404 ; l'ancienne édition demeure consultable dans **Éditions**, avec son texte intact.
8. Tester API 401 sans session, 403 sans Origin pour POST, 404 d'un autre workspace, 400 pour numéro / confirmation invalides, 409 source absente ou incohérente, 503 panne DB. Les VIEWER/REVIEWER ont consultation seulement et aucune commande destructive.
9. Chrome mobile (320,375,768px), desktop, clavier (Tab, Escape), thème clair/sombre, FR/EN, réseau faible, textes longs : la modale n'est pas coupée, les toasts sont précis, l'aperçu conserve les paragraphes sans HTML exécutable, la navigation n'écrase pas les brouillons.
10. `pnpm release:check`, `pnpm chapter-history:check`, `pnpm test`, E2E HTTP PostgreSQL, `pnpm typecheck`, `pnpm build` tous verts. Documentation utilisateur, API, technique, QA, exploitation et roadmap complète dans la PR. ClamAV OFF.

**Publication interdite** sans CI SUCCESS SHA final, validation E2E propriétaire, snapshot Neon protégé avant fusion `main`, Vercel production uniquement Preview OFF, health/version et journal réel après READY.
