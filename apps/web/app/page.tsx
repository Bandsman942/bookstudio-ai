import Link from 'next/link';
import { APP_VERSION } from '@/lib/version';
export default function Home(){return <main className="landing">
  <header className="public-header"><div className="brand"><span className="brand-symbol">B✦</span><span>BookStudio <b>AI</b><small>by DTSC</small></span></div><Link className="button small" href="/login">Mon atelier →</Link></header>
  <section className="hero"><div className="eyebrow">UN ESPACE POUR LES IDÉES QUI COMPTENT</div>
  <h1>Chaque grand livre commence par <em>une idée.</em></h1>
  <p>Rédigez, organisez et faites évoluer vos manuscrits dans un atelier créé pour les auteurs exigeants. Votre texte, votre voix, votre histoire.</p>
  <Link href="/login" className="button">Ouvrir mon atelier ↗</Link>
  <div className="hero-notes"><span>✦ Éditeur structuré</span><span>✦ Versions fiables</span><span>✦ Manuscrits privés</span></div></section>
  <div className="preview"><span className="eyebrow">VOTRE MANUSCRIT, PAGE APRÈS PAGE</span><div className="paper"><small>CHAPITRE 01</small><h2>Au commencement, les mots.</h2><p>Il y a des idées qui méritent un livre entier. Des histoires que l'on construit patiemment, une phrase après l'autre.</p><p>Bienvenue dans votre atelier d'écriture.</p></div></div>
  <footer className="public-footer">© 2026 BookStudio AI · une création DTSC · v{APP_VERSION}</footer>
</main>}
