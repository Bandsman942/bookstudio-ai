# Activation du premier propriétaire — BookStudio AI

Une installation privée neuve ne doit pas utiliser un mot de passe statique communiqué dans GitHub ou dans les notes de version.

## Variables Vercel (Production uniquement)
- `BOOKSTUDIO_BOOTSTRAP_TOKEN_HASH` : SHA-256 hexadécimal du code d'activation **aléatoire de 256 bits** communiqué au propriétaire, type `sensitive`/secret, jamais le code brut.
- `BOOKSTUDIO_BOOTSTRAP_EXPIRES_AT` : ISO 8601 UTC, durée de validité recommandée **24 h**. Code devenu inutilisable après expiration.

La route `/setup` demande le code d'activation, le nom, l'adresse e-mail et un mot de passe choisi personnellement par le propriétaire (16 caractères minimum). Elle n'envoie aucun email et ne nécessite aucune inscription publique.

## Garanties
- Comparaison du SHA-256 en temps constant ; expiration vérifiée côté serveur.
- Origine HTTPS vérifiée ; aucun secret inséré dans l'URL (donc évite historique navigateur et Referer).
- Transaction PostgreSQL et verrou d'activation unique ; impossible de créer un deuxième propriétaire par cette route.
- Dès qu'un utilisateur existe, la route ne peut plus créer de compte, même si une variable d'environnement persiste.
- `BOOKSTUDIO_PUBLIC_SIGNUP=false` reste obligatoire en production.
- Après le premier propriétaire, **supprimer les deux variables d'activation** du projet Vercel et documenter la suppression.

## Procédure
1. Configurer Neon Production (migrations vérifiées) et la protection Vercel.
2. Générer le jeton avec une source cryptographique sûre et fournir à Vercel son **hash**, sans sauvegarder le brut.
3. Fournir au seul propriétaire le jeton hors GitHub ; il ouvre `https://bookstudio-ai.vercel.app/setup`.
4. Le propriétaire choisit son e-mail et son mot de passe, active son atelier puis se connecte.
5. Vérifier que la seconde activation retourne 403 ; retirer les variables et conserver l'audit `OWNER_ACTIVATED_ONE_TIME`.

> N'ajouter jamais le jeton brut dans les issues, PR, notes de déploiement, les copies d'écran ou les journaux. Si le jeton expire, tourner la configuration et délivrer une nouvelle activation.
