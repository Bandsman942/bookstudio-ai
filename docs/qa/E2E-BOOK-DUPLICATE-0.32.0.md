# Recette manuelle — BookStudio AI v0.32.0-alpha, BS-004f #164

**Candidate non déployée.** La production demeure v0.31.0-alpha jusqu'à validation propriétaire explicite E2E v0.32.0-alpha BON et CI SUCCESS au dernier SHA.

1. Créer un livre contenant au moins deux chapitres. Modifier et enregistrer leurs textes, créer plusieurs révisions. Créer un snapshot nommé et un commentaire sur l'ouvrage source.
2. Dans Bibliothèque puis sur la fiche livre, ouvrir ⋯. Le rôle OWNER/EDITOR voit Dupliquer le livre…. VIEWER/REVIEWER ne dispose pas de cette commande.
3. Ouvrir le dialogue : il apparaît au-dessus de l'interface même avec cartes survolées ; titre Copie de… modifiable, explication des exclusions de fichiers sources, snapshots, commentaires, scans, permissions et brouillons locaux.
4. S'assurer que les onglets d'édition portent Enregistré ; choisir un titre propre à la copie et confirmer. Le bouton est indisponible pendant la requête et le toast explique le succès. Le navigateur ouvre la fiche du nouveau livre.
5. Vérifier **nouvel ID** de livre, édition n°1, statut Brouillon, type/langue conservés, nouveaux IDs de chapitre, mêmes titres, positions et dernier texte réellement enregistré, révisions 0.
6. Vérifier **aucun fichier source, aucune ancienne importation, aucun snapshot, aucun commentaire, aucune attestation ClamAV** dans la copie ; le livre initial, ses révisions et ses snapshots restent accessibles et inchangés.
7. Sur une opération interrompue par déconnexion, reproduire le même operationId : HTTP 200 replay, **pas deux livres**. Un double clic immédiat ne doit pas déclencher deux requêtes. Vérifier l'historique d'activité sans prose privée.
8. Vérifier HTTP 401 sans session, 403 Origin absent, 404 hors workspace ou droits refusés, 400 confirmation/champs/titre/UUID malformés, 409 date/édition périmée, 413 corps >4 KiB, 422 livre hors limite 500 chapitres ou 20 MiB. Aucun livre incomplet ne doit subsister.
9. Deux onglets : changer l'édition ou enregistrer un chapitre au moment de la copie. La copie doit rester cohérente avec une version sauvegardée complète ; aucun état transitoire de révision.
10. Chrome mobile 320/375/768 px, desktop, thème clair/sombre, FR/EN, Tab/Escape, réseau faible : tester le dialogue, les toasts et la navigation sans débordement.

**CI avant publication** : pnpm release:check, pnpm book-duplicate:check, pnpm test, E2E HTTP PostgreSQL multi-tenant, pnpm typecheck, pnpm build, manifeste documentaire dans la PR. **Après validation E2E uniquement** : snapshot Neon prod avant fusion main, Vercel production uniquement et Preview OFF, contrôles READY, santé et version, journal réel postpublication. ClamAV reste OFF.
