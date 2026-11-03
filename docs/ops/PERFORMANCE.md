# Politique de performance et de résilience — BookStudio AI

**Lot de travail :** #61 ; **état : non publié**, aucun gain p95 ne peut être annoncé avant mesures réelles.

## Diagnostic vérifié au 03/11/2026
- Neon `bookstudio-ai-dtsc` : `aws-us-west-2` (Oregon).
- Vercel v0.5.0 : région de fonctions observée `iad1` (Est des États-Unis), donc aller-retour réseau serveur/base potentiellement coûteux.
- Logs récents : quelques messages `prisma:error ... PostgreSQL connection ... Closed` sur d'anciennes invocations. Aucun groupe d'erreurs runtime déclaré. Ne pas déduire un taux d'échec réel de ces seuls messages.
- Le navigateur client est potentiellement à Kinshasa (connexion faible). Ne pas confondre le **TTFB du serveur** avec la latence réseau utilisateur.
- L'éditeur Tiptap sérialise le document complet fréquemment ; les commentaires sont rafraîchis lors des nouvelles révisions. Le rendu des pages fait parfois des consultations d'autorisation redondantes.

## Changements du lot
1. Co-localisation des fonctions Vercel dans `pdx1` au plus près de Neon `us-west-2`, via `apps/web/vercel.json`. Les ressources statiques restent livrées par le CDN mondial. Cette optimisation doit être **mesurée** depuis plusieurs réseaux (en particulier Kinshasa) et abandonnée si le temps utilisateur complet se détériore.
2. Une recherche d'accès au livre par requête de rendu ; lecture de rôle issue de la même requête et cache de session **limité au contexte d'une requête React**, jamais global ni partagé entre utilisateurs.
3. Commentaires chargés quand le panneau est visible ; calcul de leur état périmé localement après révision, sans appel réseau par autosauvegarde.
4. Sauvegarde du brouillon dans le navigateur, pause de requêtes hors connexion, reprise lors du retour réseau, tentatives espacées avec backoff borné ; une réponse 409 ne doit jamais provoquer une écriture destructive.
5. Skeletons de navigation non personnalisés pour améliorer la perception sur liaison lente, sans cache CDN de manuscrit privé.

## Protocole de mesure : avant/après
- Faire au minimum **30 mesures par scénario** en environnement comparable, éliminer les warm-ups, relever **p50, p95 et erreurs**.
- Scénarios : ouverture bibliothèque, fiche ouvrage, premier chapitre, nouvelle sauvegarde de 1 / 50 / 200 pages, commentaires visibles / masqués.
- Tester sur réseau normal, Slow 3G, latence artificielle 250–500 ms, coupure puis reprise; mesurer le **nombre de requêtes réseau** déclenchées pour une série de 20 modifications consécutives.
- Vérifier aussi un utilisateur connecté en RDC, car une région américaine plus proche de la base peut réduire les RTT DB mais augmenter le trajet de la requête utilisateur.
- Vérifier la région effective des fonctions post-release (ne pas présumer que `vercel.json` a été appliqué).
- Collecter TTFB via navigateur Performance API ou DevTools et durées API via logs/profiling **sans enregistrer le manuscrit ou l'identité**.
- **Cibles provisoires (non mesurées)** : confirmation d'autosauvegarde p95 < 3 secondes sur réseau ordinaire, erreur non destructive en mode faible connexion ; ne pas promettre <3 s en Slow 3G.
- Maintenir la même taille de chapitre, la même localisation de l'utilisateur et la même région du backend pendant les comparaisons.

## Sécurité et rollback
- Toujours authentifier et autoriser sur le serveur ; aucun cache global de session ou de contenu utilisateur.
- `private, no-store` pour les manuscrits et les résultats de recherche. Ne jamais activer un service worker qui stocke des documents sensibles sans chiffrement et procédure dédiée.
- Une version dont les temps de réponse depuis Kinshasa empirent peut revenir à la région Vercel `iad1` via revert du fichier `apps/web/vercel.json`, après recette et publication versionnée.
- Réaliser les tests d'intégrité des données, de concurrence, d'archivage et de snapshots à chaque optimisation.
