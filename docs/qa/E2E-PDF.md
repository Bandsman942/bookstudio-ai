# Recette E2E PDF — BookStudio AI

## Scénarios
1. Se connecter comme auteur A, ouvrir un livre et créer un snapshot portant un titre.
2. Cliquer **PDF** à côté du snapshot : le téléchargement doit fournir `application/pdf`, un nom `bookstudio-<id>.pdf`, une signature `%PDF-` et aucune mise en cache publique.
3. Ouvrir le PDF dans un navigateur et un lecteur PDF, vérifier le titre, la séparation des chapitres, les accents, listes, citations, sauts de page et pagination automatiquement gérée.
4. Modifier ensuite le livre dans l'éditeur sans renouveler le snapshot : télécharger à nouveau le PDF. Les changements postérieurs ne doivent pas apparaître.
5. Se connecter avec un autre compte B : toute tentative de télécharger le PDF A doit échouer avec **404**.
6. Pour un texte contenant une écriture non prise en charge par les polices standard (par exemple caractères CJK ou emojis), constater l'erreur explicite `EXPORT_UNSUPPORTED_GLYPHS` (HTTP 422), sans remplacement silencieux des glyphes.
7. Sur un manuscrit de 50 pages, vérifier les césures, la lisibilité, les titres et le temps de génération.
8. Répéter sur ordinateur et mobile avec téléchargement correct.

## Périmètre limité du premier PDF
PDF de lecture A4 : titres et paragraphes, listes simples, citations, sauts de page. Pas encore de composition imprimeur, d'images, de tableaux, notes, index, signets, couverture professionnelle ou typographie multilingue complète.
**La validation de ce lot ne vaut pas autorisation commerciale publique.**
