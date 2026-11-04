# E2E v0.20.0-alpha — registre de queue antivirus (#129)

1. Exécuter CI Postgres 18 migration additive `20261104173000_source_scan_jobs`, tests et build ; aucune autre migration destructive.
2. Vérifier flag absent : confirmation Supabase demeure `UNSCANNED`, aucun job créé ; import et téléchargement gardent le comportement existant, mode strict OFF.
3. Sur **environnement CI isolé** avec mock de métadonnées Storage, activer `BOOKSTUDIO_SOURCE_SCAN_QUEUE_ENABLED=true`. Confirmer une source et vérifier atomiquement un seul job `QUEUED` avec taille/type et identifiant de génération.
4. Reconfirmer : génération différente, ancien job `CANCELLED`, nouveau job `QUEUED`. Vérifier que le traitement éventuel de la génération précédente ne peut pas créer un statut `SCANNED_CLEAN`.
5. Supprimer une source autorisée : job courant annulé, registre et audit conservés. Vérifier RBAC et CSRF et refus croisé entre ouvrages/tenants.
6. Vérifier les limites : taille >20 MiB et plus de 30 demandes/heure refusées, sans statut mensonger. Réseau lent et erreurs DB : aucune déclaration de scan sain.
7. Ne PAS lancer ClamAV sur Vercel, ne PAS activer le flag en production, ne PAS prétendre que les documents utilisateurs sont analysés.

Recette de bout en bout ClamAV réel sur worker isolé et quarantaine, preuve d'empreinte sur octets et restauration hors site : #126, non livrés ici.
