# Après la première activation du propriétaire — procédure de révocation

## Vérification du 03/11/2026
- Neon Production `bookstudio-ai-dtsc` : **un utilisateur, une appartenance OWNER** ; l'atelier initial a été activé.
- Vercel Production : `BOOKSTUDIO_BOOTSTRAP_TOKEN_HASH` remplacé par 64 zéros, `BOOKSTUDIO_BOOTSTRAP_EXPIRES_AT` remplacé par `2020-01-01T00:00:00Z`.
- La route d'activation bloque **en plus** toute nouvelle création lorsque `users.count() > 0` (dans un verrou PostgreSQL).
- La révocation est effective au niveau applicatif ; aucune remise à zéro d'utilisateur n'a été effectuée. **Les deux clés existent encore dans l'interface Vercel** : elles n'ont pas été supprimées, faute d'action de suppression dans le connecteur disponible.

## Suppression administrative définitive dans Vercel
Ouvrir Vercel → équipe Bandsman's projects → projet `bookstudio-ai` → Settings → Environment Variables ; sélectionner uniquement `BOOKSTUDIO_BOOTSTRAP_TOKEN_HASH` et `BOOKSTUDIO_BOOTSTRAP_EXPIRES_AT` ; choisir **Delete** pour chaque variable. **Ne pas toucher** `DATABASE_URL`, `DIRECT_URL`, `APP_ORIGIN`, `APP_ALLOWED_ORIGINS`, `BOOKSTUDIO_PUBLIC_SIGNUP` ou `AI_PROVIDER_ENABLED`.

Vérifier ensuite que les deux clés n'apparaissent plus. Les variables retirées ne disparaissent pas rétroactivement des anciens artefacts de déploiement ; l'interdiction en base reste donc une protection indépendante. Ne pas redéployer simplement pour effacer ces variables sans recette et journal de publication.

## Audit
Ne pas stocker les anciens tokens ou leurs empreintes secrètes dans GitHub, les logs, la documentation ou la messagerie. Ne pas communiquer l'adresse e-mail de l'utilisateur propriétaire dans un changelog public.
