# E2E — v0.14.0-alpha : manuscrit DOCX entier au-delà des limites historiques

**Préconditions :** compte propriétaire et éditeur, autre compte lecteur, bucket privé Supabase `Uploaded_books`. Utiliser le **même DOCX déjà importé** qui apparaissait tronqué dans la capture et des fichiers de test non sensibles. Aucun réupload demandé.

1. **Régression du bug :** ouvrir depuis Fichiers sources le DOCX de plus de 200 paragraphes et plus de 100 000 caractères ; le texte après le paragraphe 200 doit être disponible en cliquant sur « Page suivante ». La prévisualisation annonce le nombre **total** de blocs, pas le nombre de la page, et aucune alerte « limité à 200 paragraphes » ne doit apparaître.
2. **Un chapitre continu :** choisir le mode « Un manuscrit en continu ». Toutes les parties sont proposées, avec « suite 2, suite 3 » lorsqu'un chapitre dépasse les budgets de la base. Comparer le nombre de blocs total à la somme des blocs proposés : **identique**. Approuver explicitement puis créer tous les chapitres ; vérifier le début ET la fin du texte éditable.
3. **Nombreux chapitres :** importer un DOCX de 15 à 20 titres `Heading1`. Le mode « Découper par titres » détecte et propose toutes les sections ; les titres peuvent être corrigés, les pages de liste sont navigables. Les `Heading2` ne doivent pas créer de mauvais séparateurs quand plusieurs `Heading1` existent.
4. **Long paragraphe / Unicode :** vérifier les accents, emoji, ligatures et un paragraphe >9000 caractères. Les segments de texte doivent se concaténer sans perte de caractère, même en présence d'une paire UTF-16 sur une limite.
5. **Connexion faible :** interrompre le réseau pendant le lot 2/3, confirmer que le lot 1 reste en base et la progression exacte s'affiche. Reprendre **sans fermer le dialogue** : le lot 2 est rejoué avec le même UUID, aucun chapitre dupliqué. Confirmer l'absence de succès partiel **à l'intérieur d'un lot**. Fermer le dialogue après un échec ne doit pas prétendre permettre une reprise garantie.
6. **ACL/CSRF :** un VIEWER peut prévisualiser mais n'a pas de commande d'import ; le POST direct est toujours interdit. Sources d'un autre ouvrage, URLs signées expirées, origine malveillante et fichiers non DOCX sont refusés.
7. **Fichiers complexes :** un DOCX avec notes de bas de page, tableaux, images, champs ou suivi des modifications doit afficher les avertissements de contenus non restitués. Ne pas déclarer une fidélité complète ou un scan antivirus.
8. **Budget de sécurité :** vrai ZIP suspect, document.xml déclaré >24 Mio, archive >64 Mio décompressés ou fichier >20 Mio => refus explicite de prévisualisation, **pas de faux statut « complet »**.
9. **UI/UX :** FR/EN, clair/sombre/système, clavier Tab/Entrée/Escape, 320/375/768/1440 px, zoom 200 %, double défilement du dialogue, menus ⋯ et focus visible.
10. **Régression :** ancien import d'un chapitre et de plusieurs chapitres, éditions, renommer, commentaires, autosauvegarde, exports DOCX/PDF, snapshots, stockage privé.

## Validation
CI verte, puis **E2E propriétaire v0.14.0-alpha BON** avant fusion. Produire un snapshot Neon et publier uniquement depuis `main`; conserver le verrou Vercel Preview off.
