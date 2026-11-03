# Recette documentaire — Prévalidation DOCX (issue #7)

> **Mode :** exécution locale hors ligne du worker Python. Ce lot ne fournit **aucune** route d'upload publique ni stockage persistant.

## Jeu de documents
- Un DOCX sain d'au moins cinq chapitres ; titres de niveau 1 et 2 ; accents et caractères spéciaux.
- Un DOCX comportant tableau, une image et une note de bas de page.
- Un DOCX contenant un lien externe, un champ Word dynamique ou des modifications suivies.
- Un faux DOCX (exécutable renommé en .docx).
- Un DOCM à macro / fichier OOXML contenant `vbaProject.bin`.
- Un ZIP malicieux (chemin `../`, symlink, entrée dupliquée, ratio de compression excessif, DTD XML).

## Attendus
1. L'inspection de sécurité rejette sans aucun traitement de contenu actif les documents dangereux.
2. Le texte et les titres d'un DOCX sain apparaissent dans les blocs extraits, dans le bon ordre.
3. Les tableaux, images, notes et liens externes sont marqués **REVUE HUMAINE NÉCESSAIRE**. Aucune allégation de fidélité parfaite.
4. Chaque résultat porte `status: PREVIEW_REVIEW_REQUIRED`, `verifiedFidelity: false`, `sourceRetained: false`, `readyForPublication: false`.
5. Aucune URL distante n'est appelée, aucun fichier n'est décompressé sur le système, aucune macro n'est exécutée.
6. Le PDF est explicitement rejeté `PDF_PARSER_NOT_IMPLEMENTED` : ne jamais signaler « importé ».
7. Les tests automatisés Python et la CI passent.

## Gates du vrai import web
Avant de passer en production : files d'attente, stockage original chiffré, antivirus, quotas, worker isolé, signature temporaire, preview éditoriale et validation manuelle, conversions et test de restauration.
