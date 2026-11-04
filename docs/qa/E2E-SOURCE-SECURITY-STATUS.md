# E2E — v0.15.0-alpha : transparence sur l'analyse antivirus et fail-closed (#109)

## Préconditions
Environnement alpha privé, bucket `Uploaded_books` privé, comptes OWNER, EDITOR, REVIEWER, VIEWER et non membre, un fichier DOCX **déjà** importé (historique) et un fichier de test neuf. Ne pas utiliser de vrais manuscrits sensibles. Vérifier que le mode strict `BOOKSTUDIO_REQUIRE_SCANNED_SOURCES=false` est utilisé par défaut.

## Vérifications
1. Lister les sources anciennes : elles s'affichent avec « Analyse antivirus non effectuée » même si aucune ligne de statut n'existait auparavant. Aucun message « fichier sûr » ne doit apparaître.
2. Importer un nouveau DOCX : le transfert direct vers Supabase fonctionne, puis la confirmation serveur renvoie `scanStatus=UNSCANNED`. Dans Neon, une ligne `source_security_records` correspond à l'ouvrage, au fichier, à la taille, au MIME et à l'auteur de confirmation.
3. En mode strict désactivé, prévisualisation et création de chapitres continuent selon v0.14, avec avertissement d'absence de scan. Aucun fichier binaire ne traverse la fonction Vercel et aucun texte n'est transmis à l'IA.
4. En **environnement isolé exclusivement**, activer le mode strict `BOOKSTUDIO_REQUIRE_SCANNED_SOURCES=true` : demander une URL de téléchargement ou une création de chapitre depuis une source UNSCANNED doit répondre **423 SOURCE_SCAN_REQUIRED**. Les messages FR/EN sont explicites. Ne pas faire cette activation sur la production.
5. Sources d'un autre ouvrage ou utilisateurs non membres : aucun accès malgré le statut ; GET non membre 404, POST sans Origin 403, anonyme 401 selon route. Aucun endpoint client ne peut écrire SCANNED_CLEAN.
6. Réconfirmer une source après une opération d'upload de test : elle demeure UNSCANNED, champs d'attestation vides. Ne jamais prendre MIME ou taille pour preuve de non-infection.
7. Suppression d'un fichier non utilisé : object Supabase et ligne de sécurité supprimés. Un fichier déjà lié à des chapitres doit rester protégé par 409 SOURCE_IN_USE.
8. UI sur mobile 320/375px et desktop 1440px, mode clair/sombre/système, FR/EN, lecteur VIEWER, intitulés professionnels, pas de badge de réussite trompeur.
9. Incident simulé (Supabase indisponible, DB indisponible) : pas de fausse confirmation ou de statut SCANNED_CLEAN ; pas de fuite de clé dans les requêtes navigateur, les toasts, l'audit ou la console.
10. Reprise des tests v0.14 (long DOCX 200+ paragraphes, 100k+ caractères, import par lots), export DOCX/PDF, versions et commentaires.

## Feu vert
CI complète verte, migration testée sur Neon isolée, **E2E propriétaire v0.15.0-alpha BON** avant fusion et publication. Le moteur antivirus et la restauration des originaux demeurent hors de ce sous-lot.
