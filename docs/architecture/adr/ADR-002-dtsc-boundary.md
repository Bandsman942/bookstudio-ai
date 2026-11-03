# ADR-002 — Frontière DTSC Platform

BookStudio possède sa base, ses utilisateurs, ses sessions, ses cookies et son domaine métier. L'intégration future se fait par OIDC/OAuth2, PKCE, audience et claims dédiés, **jamais** par partage de cookies ni accès à la base DTSC.

Adaptateurs API optionnels : identité, entitlements, paiements, notifications et IA. Activation après revue d'authentification, versionnement de contrats et tests d'API côté DTSC. Les fonctions rédactionnelles doivent rester disponibles en mode dégradé.

Aucune route observée dans DTSC Platform ne doit être considérée comme API partenaire déjà contractuelle sans revue.
