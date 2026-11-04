# E2E v0.16.0-alpha — PDF de 13 chapitres et notifications

1. Sur Chrome Android, ouvrir Versions & historique et exporter le véritable snapshot de 13 chapitres. Le PDF doit télécharger un fichier valide, comporter 13 chapitres dans l’ordre, les flèches U+2192, accents, ponctuation et la fin de chaque chapitre.
2. Ouvrir Word et Markdown du même snapshot et vérifier l'absence de perte de texte. Un nouveau snapshot inclut les révisions postérieures, l'ancien reste immuable.
3. Tester un glyphe délibérément non couvert : réponse HTTP 422 donnant le code Unicode et le chapitre, toast FR/EN utile, aucun fichier PDF partiel, aucun texte du manuscrit dans les erreurs.
4. Créer une version, un livre et un chapitre : toasts succès précis ; erreur 403, 404, 409, 413, 423 et panne réseau : cause et remède par opération, aucun JSON brut.
5. Importer un DOCX privé Supabase puis convertir plusieurs chapitres : progression préservée et notification de confirmation, pas de faux statut antivirus.
6. Ajouter et résoudre des commentaires, renommer/archiver/restaurer un livre et renommer un chapitre ; vérifier les messages.
7. Éditer : aucun toast pendant chaque frappe ou sauvegarde normale ; panne réseau, conflit et retour au service produisent uniquement les alertes utiles.
8. UI : clair/sombre/système, FR/EN, 320/375/768/1440 px, Chrome Android, focus clavier sur fermer, aria-live, maximum trois toasts, expiration des succès et contrôle reduced-motion.
9. Refus d'accès aux snapshots et fichiers selon le rôle, intégrité 8 Mio texte / 25 Mio PDF, pas d'appel réseau pour la police.

**Gates : CI verte et E2E propriétaire v0.16.0-alpha BON avant fusion.** Production uniquement depuis main, Preview Vercel désactivée.
