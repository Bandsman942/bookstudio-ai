# E2E — v0.13.0-alpha : multi-chapitres DOCX avec revue (BS-006c)

**Préconditions :** environnement alpha privé, livre avec chapitres existants, OWNER/EDITOR, VIEWER et utilisateur externe ; vrais fichiers DOCX de test non sensibles. Ne pas fusionner ni déployer avant feu vert.

1. **Segmentation simple :** un DOCX de test avec 3 paragraphes `Heading1` et plusieurs `Heading2` : le découpage doit proposer **3 chapitres**, les titres Heading2 restent dans leur chapitre. Les blocs prévisualisés sont tous conservés dans l'ordre.
2. **Avant-propos :** ajouter des paragraphes avant le premier Heading1 : ils doivent former le segment « Introduction » et ne jamais être perdus.
3. **Sans Heading1 :** tester plusieurs titres Heading2 : affichage d'un avertissement de découpage approximatif et revue requise. Sans assez de titres : seul l'import en un chapitre reste disponible.
4. **Revue :** ouvrir « Créer plusieurs chapitres », vérifier le nombre de segments, les extraits, modifier les titres et cocher explicitement l'acceptation des omissions. Le bouton reste désactivé tant qu'un titre ou le consentement manque.
5. **Import atomique :** confirmer 3 nouveaux chapitres ; vérifier leurs textes, leur ordre, la première révision et leurs sources. Les anciens chapitres et le document source Supabase restent inchangés.
6. **Réseau faible / doublons :** répéter exactement le même lot avec la même clé UUID après perte de réponse ou clic rapide : retour 200 sans doublon. Rejouer la même clé avec titres modifiés : 409. Vérifier qu'aucun sous-lot n'est conservé après un échec transactionnel.
7. **Sécurité :** pas de bouton d'import pour REVIEWER/VIEWER ; POST direct interdit (404). Compte anonyme = 401, origine étrangère = 403. Le fichier source doit appartenir au même ouvrage et être confirmé dans le bucket privé.
8. **Limites :** un seul chapitre, 11 chapitres, plus de 200 blocs, 100 000 caractères, prévisualisation tronquée, types HTML actifs, source absente ou PDF renommé sont refusés de façon compréhensible. Pas de suppression de source déjà utilisée par les imports.
9. **Observabilité :** audit sans texte de manuscrit ni clé Supabase ; exactement autant de lignes ManuscriptSourceImport que de nouveaux chapitres. Aucun contenu n'est envoyé vers OpenRouter/IA.
10. **UX et régressions :** FR/EN, clair/sombre/système, clavier/focus/Escape, 320/375/768/1440px, mobile et zoom 200 % ; mode un chapitre v0.12 inchangé, uploads, autosauvegarde, exports, commentaires et snapshots fonctionnels.

**Condition de publication :** CI verte **et** E2E propriétaire v0.13.0-alpha BON. Pas de previews, fusion sur `main` uniquement après feu vert.
