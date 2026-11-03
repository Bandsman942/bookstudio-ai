# E2E v0.6.0-alpha — performances et connexion instable

**Statut : plan de recette, NON DÉPLOYÉ.** Aucun p95 ou gain chiffré n'est affirmé sans campagne de mesures reproductible.

## Préparatifs
Utiliser un livre de test (jamais de manuscrit sensible pour les traces navigateur). Garder DevTools Network ouvert avec Preserve log et Disable cache. Tester l'environnement protégé, au même endroit et sur le même réseau pour comparer avec la version v0.5.0-alpha ; préciser ville, navigateur, connexion et taille du document. Ne pas exporter de cookies, de corps de requêtes ou de traces contenant du texte.

## Recette fonctionnelle
1. **Navigation fluide :** ouvrir bibliothèque, fiche d'ouvrage, puis chapitre ; un squelette non privé doit apparaître pendant le chargement. Aucune page ne doit rester blanche.
2. **Autorisations :** membre éditeur peut modifier ; membre VIEWER peut lire mais ne doit ni éditer ni autosauvegarder. Aucun contenu d'un autre espace n'est mis en cache.
3. **Saisie continue :** saisir 20 modifications en moins de 10 secondes. Les sauvegardes ne doivent pas exploser en un nombre de requêtes par frappe. Observer la confirmation « Enregistré » uniquement après accusé serveur.
4. **Commentaires ouverts :** enregistrer 5 révisions avec le panneau ouvert. Le GET commentaires ne doit pas être exécuté à chaque révision ; l'indicateur « À revoir » doit néanmoins se mettre à jour localement.
5. **Commentaires masqués sur mobile :** 320 / 375 / 768 px. Ouvrir l'éditeur et garder le panneau fermé : aucun GET commentaires lié au panneau masqué. Ouvrir le tiroir : commentaires chargés ; fermer sans perte.
6. **Hors ligne avant modification :** couper le réseau dans DevTools, écrire plusieurs phrases, vérifier « Hors ligne · brouillon local », puis changer de route : une alerte de sortie doit prévenir du texte non enregistré.
7. **Reprise de connexion :** rétablir la connexion. La sauvegarde doit reprendre sans copier/écraser manuellement ; le contenu exact doit survivre à un rechargement après confirmation serveur.
8. **Réseau intermittent :** activer Slow 3G, 250–500 ms RTT et perte de connexion ; vérifier tentatives espacées (backoff jusqu'à 30 s), absence de boucle de requêtes, absence de fausse confirmation, texte conservé.
9. **Conflit :** modifier le même chapitre depuis deux onglets, envoyer une ancienne révision : **409**, message explicite et aucune écriture destructive, brouillon local conservé.
10. **Session expirée :** provoquer 401/403 lors d'une sauvegarde ; afficher l'erreur, arrêter les réessais automatiques non autorisés, préserver le brouillon.
11. **Volumétrie :** tester 1, 50 puis 200 pages simulées, mesurer frappe, sauvegarde, mémoire, taille du JSON et réponse. Les contenus au-dessus de 2 MiB doivent être refusés proprement.
12. **Exports/révisions :** vérifier que DOCX/PDF/MD et versions nommées restent disponibles, archives et restauration sans régression.

## Mesures avant/après (à remplir sans les inventer)
Pour chaque parcours, collecter **au moins 30 échantillons** après warm-up, dans les mêmes conditions. Mesurer :
- p50 et p95 du temps de navigation bibliothèque / ouvrage / chapitre.
- p50 et p95 du temps entre dernière saisie et confirmation serveur sous connexion normale.
- Nombre de GET /comments pour 5 révisions, panneau visible et masqué.
- Nombre de PATCH pour 20 modifications consécutives.
- TTFB de /api/health et durée `Server-Timing: db` ou `save`.
- Région exécutrice indiquée par les logs Vercel : **attendu `pdx1`** proche de Neon `aws-us-west-2`. Si une autre région apparaît, diagnostiquer le packaging / l'entitlement avant toute affirmation.
- Temps utilisateur total depuis Kinshasa : une meilleure proximité Vercel↔Neon n'est pas suffisante si le trajet Kinshasa↔Vercel se dégrade.

## Critères de décision
Aucune corruption de contenu, aucune perte de révision, confidentialité préservée, absence de boucles de retry. Pour la performance, le gain doit être **constaté** (avec résultats) ou le compromis documenté. Si la régionalisation ralentit fortement l'expérience depuis Kinshasa, retirer le ciblage `pdx1` avant publication ou effectuer un test comparatif contrôlé. CI GitHub + E2E humain **v0.6.0 bon** requis avant fusion de release et déploiement.
