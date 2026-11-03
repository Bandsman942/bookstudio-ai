import LoginForm from '@/components/LoginForm';
import Link from 'next/link';
export default function Login(){return <main className="auth-bg">
  <Link href="/" className="brand auth-brand"><span className="brand-symbol">B✦</span><span>BookStudio <b>AI</b><small>by DTSC</small></span></Link>
  <section className="auth-card"><div className="eyebrow">VOTRE ATELIER PERSONNEL</div><h1>Heureux de vous retrouver.</h1><p>Reprenez votre manuscrit exactement là où vous l'aviez laissé.</p><LoginForm/></section>
  <div className="auth-side">« Écrire, c'est donner forme à ce qui mérite d'être transmis. »</div>
</main>}
