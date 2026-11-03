import {redirect,notFound} from 'next/navigation';
import Link from 'next/link';
import {activeUser,accessToBook} from '@/lib/auth';
import BookOverview from '@/components/BookOverview';
export const dynamic='force-dynamic';
export default async function BookPage({params}:{params:Promise<{bookId:string}>}){
  const user=await activeUser();if(!user)redirect('/login');
  const {bookId}=await params,book=await accessToBook(bookId,user.id);
  if(!book)notFound();
  const chapters=book.editions[0]?.manuscript?.chapters??[];
  return <div className="workspace">
    <aside className="nav"><Link href="/library" className="brand"><span className="brand-symbol">B✦</span><span>BookStudio <b>AI</b><small>by DTSC</small></span></Link>
      <div className="nav-section">NAVIGATION</div><Link className="nav-link" href="/library">← Ma bibliothèque</Link>
      <div className="nav-section">MON LIVRE</div><span className="nav-link active">▦ Vue d'ensemble</span>
      {chapters.map((c,i)=><Link className="nav-link" key={c.id} href={'/books/'+bookId+'/chapters/'+c.id}>✎ {i+1}. {c.title}</Link>)}
      <div className="nav-spacer"/><div className="nav-user"><span className="avatar">{user.name.charAt(0)}</span>{user.name}</div>
    </aside>
    <main className="content"><header className="content-top"><span className="breadcrumb"><Link href="/library">Bibliothèque</Link> / <strong>{book.title}</strong></span><span className="save-badge">● Espace privé</span></header>
    <BookOverview bookId={book.id} title={book.title} status={book.status} kind={book.bookType} chapters={chapters.map(c=>({id:c.id,title:c.title,revision:c.revisionSeq}))}/></main>
  </div>;
}
