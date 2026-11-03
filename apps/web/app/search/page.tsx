import Link from 'next/link';
import {redirect} from 'next/navigation';
import {activeUser} from '@/lib/auth';
import SearchClient from '@/components/SearchClient';
export const dynamic='force-dynamic';
export const metadata={title:'Recherche privée | BookStudio AI'};
export default async function SearchPage(){
  const user=await activeUser();
  if(!user)redirect('/login');
  return <div className="workspace">
    <aside className="nav">
      <Link href="/library" className="brand"><span className="brand-symbol">B✦</span><span>BookStudio <b>AI</b><small>by DTSC</small></span></Link>
      <div className="nav-section">MON ESPACE</div>
      <Link href="/library" className="nav-link">▦ Bibliothèque</Link>
      <Link href="/search" className="nav-link active" aria-current="page">⌕ Recherche</Link>
      <Link href="/library/archives" className="nav-link">▤ Archives</Link>
      <div className="nav-spacer"/>
      <div className="nav-user"><span className="avatar">{user.name.charAt(0).toUpperCase()}</span><span>{user.name}<small>Auteur</small></span></div>
    </aside>
    <main className="content">
      <header className="content-top"><span className="breadcrumb"><Link href="/library">Mon espace</Link> / <strong>Recherche</strong></span><span className="save-badge">● Résultats privés</span></header>
      <SearchClient/>
    </main>
  </div>;
}
