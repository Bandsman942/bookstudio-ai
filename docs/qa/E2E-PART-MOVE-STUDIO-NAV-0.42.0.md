# Recette E2E propriétaire — v0.42.0-alpha (NON déployée)

## Prérequis

- CI verte au dernier SHA incluant `pnpm book-parts:check`, `pnpm studio-navigation:check`, HTTP E2E PostgreSQL, Prisma, TypeScript, build et documentation. **N'utiliser que la candidate de PR dans l'environnement de recette autorisé ; aucun déploiement Preview ou production de branche.**
- Un livre d'essai autorisé avec **13+ chapitres**, au moins 3 parties, une plage sans partie, une partie vide, un chapitre avec titres H1/H2/H3 réellement stylés, un chapitre sans titre H1/H2/H3 et plusieurs révisions immuables.
- Bureau Windows Chrome/Firefox à 1366×768 et 1440×900, zoom 100/125/150/200 %, Android Chrome 320/360/375/390 px, tablette 768/900px, portrait/paysage, clavier/Tab/Escape, FR/EN et clair/sombre.

## Réorganisation sûre des parties

1. **Vue d'ensemble → Parties** : Monter/Descendre apparaît pour une partie avec chapitres. Déplacer « Partie II » au-dessus de « Partie I » ; **tous** ses chapitres se déplacent ensemble et conservent leur ordre interne. Sommaire global, liste des chapitres et volet Manuscrit du Studio suivent la nouvelle position.
2. Descendre cette même partie pour revenir à l'ordre exact initial. Comparer les IDs, le nombre et le contenu des révisions, les notes, sources, versions et snapshots **avant/après** : aucune perte ni édition de texte ; seuls positions et timestamps de métadonnées changent.
3. Déplacer une partie voisine d'un groupe « Sans partie » : le groupe non affecté reste entier, personne n'est rattaché automatiquement. Les groupes de parties restent contigus.
4. Les boutons de la première partie (Monter), dernière partie (Descendre) ou partie vide sont inactifs lorsque rien ne peut être déplacé. Aucun clic ne supprime de chapitre ni ne crée une révision.
5. Simuler deux onglets : un onglet déplace, l'autre utilise un ordre périmé → **409 et toast contextualisé**, sans aucune seconde mutation. Vérifier session absente (401), utilisateur d'un autre espace (404), mauvais Origin (403), édition historique (409) et paramètres invalides (400).

## Studio : capture de régression bureau et téléphone

6. Ouvrir un chapitre de 1000+ mots, dont la capture signalait un **grand espace vide sous le Studio**. Faire défiler la souris sur le manuscrit puis la liste de gauche puis l'intelligence à droite : **trois défilements indépendants**, aucun scroll de `body`, aucun vide sous la grille, aucun contenu droit/gauche inaccessible. Le ruban et la barre de sauvegarde restent disponibles.
7. Activer **Chapitres**, vérifier la navigation 20+ chapitres jusqu'au dernier et leurs menus ⋯, même si le titre du livre est long. Activer **Sections**, vérifier 100+ H1–H3 et le filtre ; rechercher une section lointaine et y naviguer sans créer de révision. Le contexte supérieur du livre doit pouvoir défiler sur une fenêtre basse sans écraser la liste.
8. Sur le chapitre **sans vrais H1/H2/H3**, l'onglet Sections n'est pas vide sans explication : il explique que « Normal » n'est pas un style de titre, propose d'appliquer **Titre 1/2/3** et donne le lien **Sommaire global**. Si l'auteur applique Titre 2 à un texte, la section apparaît en direct sans reload ; la sortie vers le sommaire bloque si brouillon non sauvegardé.
9. Sur téléphone et tablette, hamburger supérieur gauche ouvre un drawer scrollable jusqu'au dernier chapitre/section. Étincelles ouvre **Intelligence éditoriale** : les deux drawers ne restent jamais simultanés, le Studio central conserve sa largeur. Fermer par ×/Escape/voile, vérifier retour du focus, menu ⋯/tap et scroll tactile. Les safe areas, thème sombre et clavier virtuel ne doivent pas masquer les commandes.
10. Sur 125–200% de zoom et écran bas, vérifier que le contexte latéral et la liste ont des défilements utilisables et qu'aucun bouton est hors écran. Tester lecture seule (pas de mutation, navigation intacte), connexion faible et rafraîchissement avec brouillon local récupérable.

## Gate

- [ ] CI complète et dernières modifications documentaires validées.
- [ ] Recette visuelle sur **vrai Android** et sur desktop, y compris la capture de régression.
- [ ] Validation explicite propriétaire **`E2E v0.42.0-alpha BON`**.
- [ ] **Après validation seulement** : snapshot Neon production avant merge, `main` seulement, Vercel Preview OFF, sondes health/version et journal réel postproduction.

**En attente : aucun merge, migration ou déploiement de v0.42.** ClamAV dédié OFF.
