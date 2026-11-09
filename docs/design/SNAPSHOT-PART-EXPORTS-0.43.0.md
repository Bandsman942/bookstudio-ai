# BS-008f / BS-009c — snapshots de structure et exports v0.43.0

## Objectif et périmètre

La v0.42 permet d'organiser le manuscrit en parties et de les déplacer. En revanche, un snapshot `bookstudio.snapshot.v1` ne capturait que les chapitres et leurs révisions : un export de ce snapshot ne pouvait pas réutiliser **le titre historique de chaque partie**, et une restauration en nouvelle édition perdait ce regroupement.

Dans cette tranche #199, **les nouveaux snapshots utilisent le manifeste signé `bookstudio.snapshot.v2`**. Ils incluent le `partId` nullable de chaque chapitre, le titre et l'identité des parties au moment de la capture (y compris les parties vides), ainsi que l'ordre et les hash des révisions déjà présents. `manifestHash` reste le SHA-256 de la représentation JSON canonique. Le modèle Postgres `BookSnapshot.revisionManifest` est déjà JSON ; **aucune migration ni colonne ajoutée**.

## Contraintes et rétrocompatibilité

- Lecture des manifests **v1** toujours supportée, avec même reconstruction canonique et le même hash historique. Aucune partie ne peut être inventée pour une version v1.
- Pour les manifests **v2**, vérification des UUID, titres de parties non vides ≤180 caractères, parties uniques, associations vers une partie déclarée ou null, positions de chapitres uniques et regroupements contigus. Toute corruption/concurrence est rejetée plutôt que tronquée.
- Les révisions `DocumentRevision` restent **immutables** ; la création de snapshot n'y écrit rien. Les données de la version sont figées dans `revisionManifest`, sans interroger les parties actuelles lors de l'export.
- Restaurer **comme nouvelle édition** : nouvelles identités de parties et de chapitres, affectations historiques et ordre restaurés, seules révisions explicitement signées copiées comme révision 0 ; aucun ancien objet ou texte modifié. `RESTORE` dans la même édition conserve sa définition historique : **uniquement les textes**, pas la réorganisation ni le renommage des parties.
- Les exports DOCX/PDF/Markdown d'un **snapshot v2 comportant des parties affectées** intègrent un sommaire visible des parties/chapitres et les intertitres. DOCX : liens internes par signets de chapitre. PDF : sommaire paginé sans numéros de pages fictifs ; affichage premium et police Unicode embarquée existante. Markdown : titres de parties/chapitres. Si aucune partie n'est affectée, rendu plat historique inchangé.
- Aucune publication publique, demande IA, suppression de provenance, copie de Storage Supabase, accès aux commentaires ou activation de ClamAV.

## Risques et limites

1. Le sommaire ajouté porte sur **parties et chapitres**. Les titres internes H1–H3 restent dans le document mais **ne sont pas encore inclus** dans la table des matières exportée ; cela nécessite l'ancrage et la pagination de toutes les sections (lot futur).
2. La table PDF n'affiche volontairement **pas de numéro de page** tant que le calcul exact n'est pas implémenté. Le sommaire DOCX a des liens internes vers les chapitres, mais n'utilise pas un champ Word nécessitant une mise à jour manuelle.
3. La quantité reste bornée par l'ancien plafond 500 chapitres, le nouveau plafond 500 parties, 8 MiB de texte source pour export, 20 MiB de copie d'édition et 25 MiB de PDF final. L'ordre et le contenu privés sont transmis exclusivement à l'utilisateur autorisé ; `Cache-Control: private, no-store`.
4. Le contrôle automatique inclut tests de hash v1/v2, corruption, unicité/contiguïté, rendu de sommaire et HTTP E2E PostgreSQL sur l'export/la restauration/multi-tenant. La vérification visuelle réelle du PDF/DOCX et du Studio desktop/mobile reste du ressort du propriétaire avant production.

## Repli opérationnel

La v0.42 peut toujours lire et exporter les snapshots historiques v1, mais **ne sait pas lire v2**. En cas de rollback du code, il faut évaluer les snapshots v2 créés entre-temps et ne jamais prétendre qu'ils sont lisibles par l'ancienne version. Ne pas effacer ces versions ni modifier leur hash ; restaurer l'application v0.43 ou développer un lecteur rétrocompatible. Sauvegarde Neon de production avant toute fusion et tests de restauration restent obligatoires.
