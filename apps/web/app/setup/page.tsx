import OwnerSetupForm from '@/components/OwnerSetupForm';
import Link from 'next/link';
export const metadata={title:'Activation du propriétaire | BookStudio AI'};
export const dynamic='force-dynamic';
export default function SetupPage(){return <main className="auth-bg">
  <Link href="/" className="brand auth-brand"><span className="brand-symbol">B✦</span>
    <span>BookStudio <b>AI</b><small>by DTSC</small></span></Link>
  <section className="auth-card"><div className="eyebrow">INITIALISATION PRIVÉE</div>
    <h1>Votre atelier commence ici.</h1>
    <p>Cette procédure réservée au propriétaire n'est disponible qu'au premier démarrage de BookStudio.</p>
    <OwnerSetupForm/></section>
  <div className="auth-side">Un espace privé pour les mots qui comptent.</div>
</main>}
