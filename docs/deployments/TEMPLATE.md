# BookStudio AI — Fiche de déploiement

> Modèle à copier uniquement APRÈS un déploiement réellement lancé. Ne jamais remplir par anticipation.

| Champ | Valeur vérifiée |
|---|---|
| Version applicative | `vX.Y.Z` |
| Environnement | production / preview |
| Événement | release / hotfix / rollback |
| Date et heure UTC (terminaison Vercel) | `YYYY-MM-DDTHH:mm:ssZ` |
| Équipe Vercel | `bandsmans-projects` |
| Projet Vercel | `bookstudio-ai` |
| ID de déploiement | `dpl_...` |
| URL du déploiement | `https://...` |
| SHA Git déployé | `40 caractères` |
| Statut confirmé | READY / ERROR / CANCELED |
| Branche source | main |
| CI GitHub commit exact | Lien de workflow GitHub |
| Migration Neon | Oui/non ; identifiant + branche ; revue |
| Recette E2E propriétaire | Cas et date de validation |
| Contrôle sécurité post-déploiement | Auth, ACL, cookies, CSRF, secrets, erreurs |
| Mesures post-déploiement | Logs, erreurs, endpoints de santé, latence |
| Retour arrière | URL / ID du dernier déploiement READY, procédure et résultat |

## Modifications effectivement livrées
Documenter les références au `CHANGELOG.md` et aux PR concernées.

## Incidents et limites
Décrire les risques confirmés, les fonctionnalités explicitement non livrées et la disponibilité des services.

## Décision finale
Indiquer **qui a validé, quand, avec quelle preuve** et l'état commercial de l'application.
