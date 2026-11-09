# Feux de passage avant première production privée ou publique

## Préconditions générales

1. Version SemVer préparée dans `release.json` ; **porte documentaire obligatoire** décrite dans `docs/ops/RELEASE-DOCUMENTATION-GATE.md` franchie **avant fusion/déploiement** ; CI verte sur le SHA exact de la PR puis vérifiée sur `main`.
2. Domaine HTTPS confirmé et `APP_ORIGIN` identique octet pour octet à son origine (sans slash final).
3. `DATABASE_URL` poolée / `DIRECT_URL` directe pointent vers la **même base BookStudio production**, pas DTSC Platform ; contrôle sans afficher les secrets.
4. Neon production protégée ; migration Prisma revue et approuvée, exécutée et vérifiée ; restauration sauvegarde testée.
5. Compte initial propriétaire provisionné par script à usage unique ; **inscriptions publiques désactivées**.
6. Accès Vercel SSO / authentification vérifié, contrôles CSRF et sessions sur URL réelle.
7. Recette propriétaire sur l'environnement accessible : bibliothèque, édition/sauvegarde, versions, Word et isolation des comptes.
8. Aucun manuscrit sensible réel tant que stockage objet, analyse antivirus et restauration d'exploitation ne sont pas établis.
9. Débloquer le build Vercel **seulement** pour la publication autorisée depuis `main`.
10. Vérifier READY, `/api/version`, journal d'erreurs, et produire immédiatement la fiche du déploiement réel. Documentation fonctionnelle et technique déjà versionnée avant cette étape ; aucune donnée de production inventée dans les notes de release.

## Première production privée (alpha)

Une production privée `v0.1.0` peut être envisagée uniquement comme environnement d'essai sous Vercel Authentication, après conditions 1–10. Les fonctionnalités d'import web, IA et PDF sont inactives, et une publicité comme produit final est interdite.

## Première production publique (disponibilité générale)

En plus de tout ce qui précède, terminer et valider les P0 du cahier des charges : import DOCX/PDF sécurisé, export PDF, stockages chiffrés, antivirus, sauvegardes/restaurations éprouvées, contrôle d'accès collaboratif et conformité de traitement des manuscrits. Version `v1.0.0` seulement après recette complète et consentement final.

## Addendum candidat v0.37.0-alpha — validation mobile et recherche privée

Contrôle supplémentaire avant Go : le même menu desktop se découvre par **☰ haut gauche** sur les 4 workspaces centraux à 320/375px, avec navigation de tous les chapitres, actions contextuelles visibles, accès clavier, fermeture par Escape/backdrop/×, focus rendu, absence de débordement, thèmes et safe area. Studio reste consultable en mode concentration et bloque la sortie si un brouillon n'est pas sauvegardé. Recherche dans un livre : 35 résultats = 30+5 avec hasMore, ACL par ouvrage et workspace, 404 hors workspace/archives, q littéral anti-injection et aucune ancienne révision renvoyée. Le test `mobile-workspace:check` est statique, donc **recette E2E mobile manuelle obligatoire**. Documentation complète avant déploiement selon `RELEASE-DOCUMENTATION-GATE.md` ; E2E propriétaire BON, snapshot Neon pré-merge, Vercel prod-only et ClamAV désactivé.
