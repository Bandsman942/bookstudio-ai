# E2E de validation — lot initial

1. Compte privé A : créer un ouvrage et retrouver son entrée en bibliothèque.
2. Créer un chapitre et cinq paragraphes ; vérifier la sauvegarde après rechargement.
3. Deux onglets à révision identique : le second reçoit HTTP 409, brouillon local non perdu.
4. Un utilisateur B ne peut ni lire ni modifier un chapitre A (HTTP 404).
5. Une révision négative ou un document invalide : erreur contrôlée sans création.
6. Arrêter les services externes DTSC/IA : rédaction toujours disponible.
7. Responsive et clavier : 320 px, 768 px, 1440 px, panneaux et éditeur.
8. Désactivation des inscriptions publiques par défaut.

**Statut :** parcours documentés, pas encore exécutés en navigateur. Aucun déploiement production sans validation.
