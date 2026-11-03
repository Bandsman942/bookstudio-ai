# E2E — v0.11.0-alpha : prévisualisation DOCX privée (BS-006a)

## Préconditions
Environnement alpha privé ; bucket Uploaded_books non public ; comptes OWNER, VIEWER et un compte hors ouvrage. Ne pas charger de manuscrits sensibles avant scanner antivirus et restauration des binaires.

## Tests
1. Téléverser un DOCX simple avec plusieurs paragraphes et titres. Depuis Fichiers sources, action « Prévisualiser DOCX ». Lire le texte, confirmer que le statut « aperçu à réviser — fidélité non vérifiée » est visible. Fermer ; vérifier l'absence de modification des chapitres, commentaires et versions.
2. DOCX complexe avec tableaux, images, notes et liens externes : afficher les avertissements. Aucun lien externe ne doit être chargé. Comparer au fichier original ouvert dans Word.
3. Inspecter Network : POST JSON action=download à l'API BookStudio ; puis GET direct vers le domaine Supabase sur /storage/v1/object/sign/. Aucun fichier binaire n'est envoyé à Vercel et aucun texte à une IA.
4. Archive malveillante de test (Zip Slip ../, macros, faux DOCX, compression excessive) ou corrompue : refuser l'aperçu avec message explicite mais sans exposer les métadonnées serveur.
5. Un VIEWER autorisé peut prévisualiser sans modifier. Un compte non membre ou un ID d'un autre ouvrage ne peut pas obtenir de signature.
6. Un fichier très long doit annoncer la troncature. Un fichier de plus de 20 Mio doit être refusé. Images/tableaux ne doivent pas être présentés comme fidèlement importés.
7. Tester FR/EN, thèmes clair/sombre/système, clavier Tab/Enter/Escape, affichage 320/375/768/1440 px et zoom 200 %.
8. Couper la connexion pendant le téléchargement : erreur non ambiguë, aucune fausse confirmation, source préservée et éditeur indépendant.
9. Refaire les flux v0.10 (upload confirmé, téléchargement/suppression, bibliothèque, autosauvegarde des chapitres, exports et snapshots).

## Mise en production
CI verte, puis E2E propriétaire **v0.11.0-alpha BON** indispensable ; pas de preview ni fusion anticipée. Snapshot Neon avant déploiement depuis main seulement.
