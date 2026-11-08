# Recette E2E propriétaire v0.26.0-alpha — progression des ouvrages

1. Ouvrir un livre avec **3 chapitres actifs** : un chapitre vide, deux ayant du texte réellement enregistré. Vérifier les nombres 3 / 2 / 1 et « 67 % de chapitres contenant du texte ». Le libellé ne doit pas prétendre que le livre est achevé à 67 %.
2. Modifier le texte d'un chapitre, sauvegarder, puis réactualiser la vue d'ensemble : compteurs à jour ; le texte lui-même n'apparaît pas dans le JSON de l'API de progression.
3. Vider complètement un chapitre puis le sauvegarder : il doit être comptabilisé comme vide, même s'il possède d'anciennes révisions contenant du texte.
4. Créer, retirer puis restaurer un chapitre ; vérifier les nombres actifs/retirés et les badges correspondants après actualisation. Aucun doublon de position de chapitre.
5. Créer une **version nommée** ; l'indicateur des snapshots augmente sans modifier une révision. Contrôler la date de dernière révision et le lien « Ouvrir les versions ».
6. Tester trois rôles OWNER, EDITOR, REVIEWER/VIEWER : consultation autorisée dans le même workspace, aucune modification induite par le tableau ; outsider HTTP 404, utilisateur non connecté HTTP 401, livre archivé HTTP 404.
7. Simuler une panne de lecture statistique : la page de l'ouvrage doit rester lisible, le manuscrit éditable et afficher un message spécifique plutôt qu'une erreur générique.
8. Contrôler responsive 320/375/768/1440 px, clair/sombre, FR/EN, lien dernier chapitre, clavier/Tab, lecteur d'écran, pourcentage accessible.
9. Vérifier `pnpm book-progress:check`, CI E2E HTTP Postgres, `pnpm typecheck`, `pnpm build`, et les six documents obligatoires du manifeste de `pnpm release:check`.
10. Aucun ClamAV réel n'a été installé : flags scan OFF. Aucune migration/variable nouvelle.

**Ne pas fusionner / déployer** avant CI verte au dernier SHA, validation propriétaire explicite `E2E v0.26.0-alpha BON`, snapshot Neon, fusion main, Vercel production-only et vérification de santé/version.
