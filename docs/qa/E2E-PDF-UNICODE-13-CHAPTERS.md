# E2E — v0.15.1-alpha : export PDF d'un livre à 13 chapitres

1. Sur l'application alpha privée, ouvrir **Versions & historique** de l'ouvrage ayant 13 chapitres. Créer un snapshot après les dernières modifications. Un snapshot plus ancien n'inclura pas les modifications ultérieures.
2. Dans Chrome Android, ouvrir le menu `…` de ce snapshot et choisir **Exporter PDF**. Un PDF valide doit se télécharger, sans page JSON brute.
3. Ouvrir le PDF et vérifier le titre général, les **13 chapitres dans l'ordre**, leurs paragraphes, les accents, les apostrophes courbes, les espaces insécables étroites `U+202F`, les guillemets et les puces.
4. Comparer début, milieu et fin des chapitres longs ; aucun bloc n'a été supprimé volontairement et les pages ne sont pas coupées à un plafond de 13.
5. Tester un exemple avec caractères grecs `α β π`, italiques, gras, liens, listes et citations ; vérifier visuellement le rendu (pas de rectangles vides ou caractères de substitution).
6. Si un glyphe rare (par exemple certains emoji) reste absent, le menu doit afficher une erreur **compréhensible** dans l'interface ; la version Word doit rester exportable avec son texte inchangé, pas de fichier PDF partiel.
7. Tester le même ouvrage en **DOCX** et **Markdown** ; télécharger les deux fichiers et contrôler accents et chapitres.
8. Tester version non autorisée : 401/404, aucun document ne doit être exposé. Tester snapshot manquant/corrompu : 409 ou 404, message visible. Sur réseau coupé : erreur visible, pas de JSON brut.
9. Vérifier l'UX sur Chrome Android 320/375px et desktop, thèmes clair/sombre, FR/EN, focus clavier et menu contextuel discret.
10. Tester les limites de taille (8 Mio de texte, 25 Mio PDF) : refus contrôlé, jamais une réponse 200 avec PDF incomplet. Aucun appel distant pour télécharger la police.

**Condition de publication** : CI verte puis **E2E propriétaire v0.15.1-alpha BON**, merge main, snapshot Neon et production main uniquement.
