# Feux de passage avant première production privée ou publique

## Préconditions générales

1. Version SemVer préparée dans `release.json` ; CI verte sur le SHA exact de `main`.
2. Domaine HTTPS confirmé et `APP_ORIGIN` identique octet pour octet à son origine (sans slash final).
3. `DATABASE_URL` poolée / `DIRECT_URL` directe pointent vers la **même base BookStudio production**, pas DTSC Platform ; contrôle sans afficher les secrets.
4. Neon production protégée ; migration Prisma revue et approuvée, exécutée et vérifiée ; restauration sauvegarde testée.
5. Compte initial propriétaire provisionné par script à usage unique ; **inscriptions publiques désactivées**.
6. Accès Vercel SSO / authentification vérifié, contrôles CSRF et sessions sur URL réelle.
7. Recette propriétaire sur l'environnement accessible : bibliothèque, édition/sauvegarde, versions, Word et isolation des comptes.
8. Aucun manuscrit sensible réel tant que stockage objet, analyse antivirus et restauration d'exploitation ne sont pas établis.
9. Débloquer le build Vercel **seulement** pour la publication autorisée depuis `main`.
10. Vérifier READY, `/api/version`, journal d'erreurs, et produire immédiatement la fiche du déploiement réel.

## Première production privée (alpha)

Une production privée `v0.1.0` peut être envisagée uniquement comme environnement d'essai sous Vercel Authentication, après conditions 1–10. Les fonctionnalités d'import web, IA et PDF sont inactives, et une publicité comme produit final est interdite.

## Première production publique (disponibilité générale)

En plus de tout ce qui précède, terminer et valider les P0 du cahier des charges : import DOCX/PDF sécurisé, export PDF, stockages chiffrés, antivirus, sauvegardes/restaurations éprouvées, contrôle d'accès collaboratif et conformité de traitement des manuscrits. Version `v1.0.0` seulement après recette complète et consentement final.
