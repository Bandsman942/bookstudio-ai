# Recette propriétaire — v0.39.0-alpha, BS-005d #185

**CANDIDATE. Ne pas publier avant validation explicite `E2E v0.39.0-alpha BON`.** Reproduire depuis le vrai appareil Android Chrome de la capture du 9 novembre ; idéalement ajouter Safari iOS/tablette. Éviter les textes secrets réels dans les captures de CI.

## Correction visuelle critique

1. Ouvrir un chapitre dans Studio à **320, 360, 375, 390**, puis **768/900 px** (zoom texte Android normal puis agrandi). Le manuscrit doit occuper la largeur utile **dès l'arrivée** ; aucune colonne gauche permanente ni bande d'éditeur de quelques pixels, aucun scroll horizontal de la page.
2. Toucher le **☰ de 44 px en haut à gauche**. La colonne **Manuscrit** recouvre le Studio avec fond sombre sans le repousser. Parcourir au moins 13 chapitres, leurs menus ⋯ et les onglets **Chapitres/Sections**. La liste reste scrollable, les onglets conservés, et le sélecteur d'une section déplace uniquement le curseur.
3. Fermer par **×**, fond sombre puis **Échap** sur clavier ; confirmer le retour du focus au hamburger et le Studio plein écran. Essayer en concentration, lecture seule, FR/EN et mode sombre. Le texte non sauvegardé ne doit jamais se perdre lors d'une tentative de navigation.
4. La barre d'édition/ruban doit être utilisable par **défilement horizontal interne**, sans pousser le document hors viewport. Tester clavier logiciel ouvert et rotation portrait/paysage.

## Intelligence éditoriale visible

5. Sur téléphone/tablette, toucher le bouton **étincelles / Intelligence éditoriale** dans la barre supérieure, sans passer par les ⋯. Le tiroir **droit** s'ouvre et affiche ses commentaires ainsi que les **mots, paragraphes, titres** du chapitre ; fermer par croix, backdrop et Échap. Vérifier piège Tab/Shift+Tab et focus rendu au bouton étincelles.
6. Saisir un titre H2 puis un paragraphe de quelques mots : indicateurs actualisés après le checkpoint de saisie, sans double sauvegarde. Ajouter un paragraphe de **181 mots** : avertissement de lisibilité affiché. Le retrait du long paragraphe retire l'avertissement. En lecture seule, même indicateurs sans commande de modification.
7. Ouvrir successivement le tiroir gauche et le droit : **jamais les deux ouverts** ; après fermeture, aucun overlay permanent. À 1151/1440px, le panneau bureau conserve son comportement normal.
8. Confirmer explicitement que ce panneau ne prétend **pas** fournir une correction IA, et qu'aucune requête IA ou transmission externe de prose n'est ajoutée ; les fonctions IA futures restent annoncées comme telles.

## Tests techniques obligatoires avant E2E propriétaire

- `node --experimental-strip-types --test apps/web/lib/editorial-structure.test.mjs`
- `pnpm mobile-workspace:check`, `pnpm editorial-structure:check`, `pnpm section-outline:check`, `pnpm test`, `pnpm ui:check`, `pnpm perf:check`, `pnpm release:check`.
- PostgreSQL/Prisma E2E existants (ACL, 409, 403/404, restaurations), TypeScript, Next build et tests worker. Les tests statiques **ne prouvent pas** le rendu final sur Android ; la capture et le contrôle manuel sont obligatoires.
- Après **CI SUCCESS sur dernier SHA**, ne pas fusionner sans E2E propriétaire BON. Snapshot Neon production avant merge, Vercel uniquement depuis `main`, Preview OFF ; health/version/logs et journal réel après READY.
