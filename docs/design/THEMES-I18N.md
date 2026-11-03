# Design system BookStudio AI — thème et internationalisation

## Thème
- Source de vérité SSR : cookies non sensibles `bookstudio_theme` et `bookstudio_locale`, `SameSite=Lax`, `Secure` en HTTPS ; la session et les manuscrits ne passent jamais dans ces cookies.
- Trois valeurs de thème : `light`, `dark`, `system` (par défaut). Le mode système suit `prefers-color-scheme`.
- Les attributs `html[data-theme]` et `html[lang]` sont rendus sur le serveur, sans script d'initialisation bloquant ni flash de thème par défaut.
- Tokens CSS : `--surface`, `--ink`, `--muted`, `--line`, `--paper`, `--paper-ink`, `--menu-hover`, `--menu-focus`, `--cta-bg`. Les futurs composants doivent utiliser ces tokens.
- Le bouton ⋯ reste transparent au repos, surbrillance au survol/ouverture et contour visible au focus clavier ; tous les modes conservent un contraste lisible.

## Internationalisation
- Catalogue statique `apps/web/lib/i18n.ts` avec `MessageKey` et version française de référence, version anglaise `Record<MessageKey,string>` imposant une couverture complète du catalogue.
- Choix UI indépendant de la langue du manuscrit. Créer un livre peut proposer `fr` ou `en` ; aucun contenu privé n'est envoyé à un service de traduction par le simple changement de préférence.
- Utiliser `t(key,{placeholder})` pour les libellés, les dates avec `Intl` locale adaptée.
- Le fournisseur React réagit sans navigation destructrice ; à la prochaine navigation normale, les pages serveur lisent les cookies et affichent leur traduction.
- Ne pas faire de cache public des préférences quand elles sont combinées à du contenu authentifié. Ne pas manipuler `DATABASE_URL` ni des informations de session.

## Périmètre livré et suite
Première vague : accueil public, connexion, bibliothèque, ouvrage, chapitres, éditeur, archives, commentaires, versions et recherche. Les nouvelles fonctions, la documentation de l'utilisateur, l'accessibilité approfondie et les messages backend doivent rejoindre le même catalogue au fil des PR. Le ruban éditorial avancé fait l'objet de l'issue #68, distincte du réglage de thème et du socle i18n. Ne pas présenter un contenu manuscrit comme traduit ou une parité Word complète.
