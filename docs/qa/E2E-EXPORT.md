# E2E — premier export de versions BookStudio AI (#10)

**Ce lot ne livre pas encore le PDF de lecture.** Il livre un DOCX OpenXML standard et un Markdown téléchargeables depuis un snapshot immuable. Les éléments de Word pris en charge : chapitres, titres, paragraphes, gras, italique et listes simples. Pas encore d'images, tableaux, notes, gabarits typographiques ni de pagination d'imprimeur.

## Recette propriétaire

1. Créer un livre comportant au moins deux chapitres, titres hiérarchiques, accents, caractères français, gras, italique et listes.
2. Créer le point « Manuscrit test » depuis l'espace **Versions & historique**.
3. Modifier le manuscrit après ce snapshot.
4. Sur la version « Manuscrit test », cliquer **Word**. Le fichier `.docx` doit se télécharger.
5. Ouvrir ce DOCX dans Word ou LibreOffice ; vérifier les titres, le contenu et le style de base. Aucune modification postérieure au snapshot ne doit apparaître.
6. Cliquer **Markdown** : vérifier UTF-8, accents, paragraphes et ordre des chapitres.
7. En session utilisateur B non autorisée : utiliser l'URL d'export A ; réponse **404**, aucune donnée livrée.
8. Essayer `?format=pdf` : rejet contrôlé `EXPORT_FORMAT_UNSUPPORTED` (aucun faux PDF).
9. Simuler une source de snapshot manquante sur une base de test : erreur contrôlée, aucun document partiel renvoyé.
10. Effectuer la recette après rechargement sur desktop et mobile, navigation clavier possible.

## Validation
Résultat attendu : DOCX/Markdown passent sans fuite ni perte des paragraphes pris en charge. **Le gate de publication publique reste fermé** tant que l'import Word/PDF sécurisé, le PDF de lecture et les sauvegardes/restaurations d'exploitation ne sont pas validés.
