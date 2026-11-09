# Recette propriétaire — v0.40.0-alpha (candidate, non déployée)

## Préconditions

- CI verte sur **SHA final de la PR candidate** (numéro indiqué après ouverture), E2E PostgreSQL et `pnpm book-outline:check` réussis. Ne pas confondre la CI avec une recette manuelle mobile.
- Livre privé avec **au moins 13 chapitres**, quelques H1/H2/H3, un chapitre vide, un chapitre avec >60 titres, un compte VIEWER et un compte d'un autre workspace. Enregistrer les textes dans le Studio avant de tester la vue d'ensemble.
- Navigateur Android Chrome réel 320/360/375/390 px (portrait et paysage), 768/900 px, ordinateur 1440 px ; FR/EN et clair/sombre ; connexion faible si possible.

## Parcours

1. Vue d'ensemble : **Sommaire global** montre les 13+ chapitres dans l'ordre courant, sans défilement latéral. Le hamburger du workspace donne accès au lien Sommaire global et la page peut défiler.
2. Déplier le chapitre : titres H1–H3 exactement enregistrés, indentation cohérente ; pas de paragraphes ordinaires, H4 ni titre vide. **Ouvrir** permet d'aller au chapitre sans cibler une section.
3. Cliquer une section au début, au milieu et après 60 titres : Studio centre réellement le passage et conserve le manuscrit intact. Le sommaire revient depuis le menu gauche, notamment sur mobile. Vérifier le panneau droit d'intelligence éditoriale de v0.39 toujours accessible.
4. Chapitre de 67 titres : 60 visibles, compteur 60/67 et bouton **Charger les titres suivants** ; 7 nouveaux titres visibles sans duplicat. Un filtre spécifique sur « Titre 67 » donne le même lien stable.
5. Modifier la révision dans un autre onglet entre dépliage et clic : une notification indique que le sommaire est périmé ; **aucun saut vers un autre titre**. Idem si un brouillon local attend restauration. Réessayer après sauvegarde et actualisation.
6. Ouvrir avec compte VIEWER : consultation et navigation possibles, pas d'édition. Compte sans accès / livre archivé / chapitre retiré : 404 ou écran inaccessible, aucun titre d'un autre espace.
7. Réseau lent/hors ligne : ouvrir une section ou charger la page suivante provoque un **message et Réessayer**, sans disparition des titres de chapitre déjà présents ni action d'édition involontaire.
8. Test clavier : Tab, Entrée, focus visible, liens, repli/dépli, filtre, charge suivante ; aucun bouton inaccessible derrière les tiroirs. Vérifier aucune fuite de prose vers logs/Analytics/IA.

## Gates et résultat

- [ ] CI, tests unitaires, E2E HTTP, typecheck et build au SHA exact.
- [ ] Vérification mobile physique et accessibilité ; toutes les observations listées.
- [ ] Validation explicite du propriétaire : **`E2E v0.40.0-alpha BON`**.
- [ ] Snapshot Neon `production` **avant** fusion de PR ; ensuite Vercel production **uniquement depuis `main`**, Preview OFF, health/version READY, journal réel.

**Situation actuelle : EN ATTENTE d'E2E propriétaire. Pas de déploiement v0.40 autorisé.**
