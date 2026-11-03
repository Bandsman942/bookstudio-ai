# BookStudio AI — procédure de validation E2E (lot initial)

## Statut de la livraison

La PR #2 (socle) et la PR #4 (durcissement authentification) sont des lots de développement. Un pipeline CI vert n'est pas une validation utilisateur ni une autorisation de publication.

## Préconditions obligatoires

1. Déploiement de validation **protégé par Vercel Authentication** et non ouvert aux visiteurs anonymes ; environnements Preview désactivés, aucun domaine public attribué pendant la recette.
2. Base Neon **development** uniquement : migrations Prisma appliquées, identité propriétaire de test créée via le script one-shot avec secrets locaux, jamais dans les logs.
3. `DATABASE_URL`, `DIRECT_URL` (uniquement pour la commande de migration), `APP_ORIGIN` propres à cet environnement ; aucun accès DB DTSC Platform.
4. Tester sur une copie sans manuscrit sensible ; comptes Auteur A et Auteur B indépendants.

## Parcours de recette et résultats attendus

| ID | Action humaine | Résultat attendu |
|---|---|---|
| E2E-01 | Ouvrir la page de connexion protégée | Aucun manuscrit public et aucun affichage des données privées |
| E2E-02 | Se connecter au compte A | Bibliothèque du compte A sans erreur |
| E2E-03 | Créer un ouvrage (titre et type) | Carte créée, visible après rechargement |
| E2E-04 | Ouvrir le livre, créer un chapitre | Chapitre dans l'ordre prévu, accessible |
| E2E-05 | Saisir 5 paragraphes avec gras/titres ; attendre la sauvegarde | Indicateur « Enregistré », révision incrémentée |
| E2E-06 | Recharger la page et changer de chapitre, puis revenir | Contenu strictement identique |
| E2E-07 | Ouvrir 2 onglets du même chapitre, modifier le premier puis le second | Conflit signalé, aucun écrasement silencieux ; récupérer le brouillon local |
| E2E-08 | Sur une autre session, ouvrir le lien du livre A avec le compte B | Erreur d'accès, aucune lecture ni écriture |
| E2E-09 | Se déconnecter, revenir directement sur URL du livre | Redirection connexion, session révoquée |
| E2E-10 | Tester sur 320 px, 768 px, 1440 px | Écriture et lecture accessibles ; pas de blocage de saisie mobile |
| E2E-11 | Effectuer 9 identifiants invalides sur une identité de test uniquement | Au-delà du plafond, HTTP 429 et message explicite, sans fuite de compte |
| E2E-12 | Vérifier qu'aucun compte ne peut s'inscrire sur la production | Rejet 403 ; aucune inscription libre |
| E2E-13 | Simuler un rejet de sauvegarde par coupure réseau | Le texte reste dans l'éditeur et l'échec apparaît clairement |
| E2E-14 | Couper les API DTSC et IA en validation | La rédaction manuelle reste opérationnelle |

**À ne pas prétendre prêt :** import DOCX/PDF complet, export DOCX/PDF, restaurations/snapshots, antivirus, paiement, collaboration et IA sont des lots bloquants à terminer avant ouverture commerciale. Pour la première **production privée** de démonstration, documenter les exclusions ; aucun manuscrit réel sensible avant les sauvegardes et restaurations vérifiées.

## Décision humaine de recette

Le propriétaire fournit explicitement les résultats `E2E-01 OK` à `E2E-14 OK` ou les cas qui ont échoué. En cas de défaut P0 : correctif et nouvelle validation. **Ne pas fusionner ou exposer le projet en production publique sans cette validation.**

## Déploiement — garde-fous

- Vérifier le SHA GitHub fusionné sur `main` et la CI verte.
- Vérifier que les variables nécessaires existent dans Vercel, sans jamais lire ou afficher leurs valeurs secrètes.
- Appliquer les migrations à Neon **production** seulement après revue humaine et plan de retour arrière.
- Lever le verrou Vercel de build uniquement après décision de publication et exécuter le contrôle E2E en environnement protégé.
- Exposer un domaine public uniquement lorsque la sécurité, les imports/exports et les restaurations ont passé la recette.
