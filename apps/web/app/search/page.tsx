import Link from 'next/link';
import {redirect,notFound} from 'next/navigation';
import {prisma} from '@bookstudio/database';
import {activeUser} from '@/lib/auth';
import SearchClient from '@/components/SearchClient';
import WorkspaceShell from '@/components/WorkspaceShell';
import AppIcon from '@/components/AppIcon';
import {cookies} from 'next/headers';
import {LOCALE_COOKIE,parseLocale,translate} from '@/lib/i18n';
export const dynamic='force-dynamic';
export const metadata={title:'Recherche privée | BookStudio AI'};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function SearchPage({searchParams}:{
 searchParams:Promise<{bookId?:string|string[]}>
}){
 const user=await activeUser();if(!user)redirect('/login');
 const params=await searchParams;
 const scoped=params.bookId;
 if(scoped!==undefined&&(typeof scoped!=='string'||!UUID.test(scoped)))
   notFound();
 // Even the book title must only be rendered after a verified membership.
 const book=scoped?await prisma.book.findFirst({where:{
   id:scoped,archivedAt:null,
   workspace:{memberships:{some:{userId:user.id}}}
 },select:{id:true,title:true}}):null;
 if(scoped&&!book)notFound();
 const jar=await cookies();
 const locale=parseLocale(jar.get(LOCALE_COOKIE)?.value);
 const t=(key:Parameters<typeof translate>[1])=>translate(locale,key);
 return <WorkspaceShell sidebar={<aside className="nav">
     <Link href="/library" className="brand"><span className="brand-symbol">B✦</span><span>BookStudio <b>AI</b><small>by DTSC</small></span></Link>
     <div className="nav-section">{t('library.mySpace')}</div>
     <Link href="/library" className="nav-link"><AppIcon name="library"/><span>{t('common.library')}</span></Link>
     <Link href="/search" className="nav-link active" aria-current="page"><AppIcon name="search"/><span>{t('common.search')}</span></Link>
     <Link href="/library/archives" className="nav-link"><AppIcon name="archive"/><span>{t('common.archives')}</span></Link>
     {book&&<>
       <div className="nav-section">{locale==='fr'?'Ouvrage sélectionné':'Selected book'}</div>
       <Link href={'/books/'+book.id} className="nav-link"><AppIcon name="book"/><span>{book.title}</span></Link>
     </>}
     <div className="nav-spacer"/>
     <div className="nav-user"><span className="avatar">{user.name.charAt(0).toUpperCase()}</span><span>{user.name}<small>{t('common.author')}</small></span></div>
   </aside>}>
   <main className="content">
     <header className="content-top">
       <span className="breadcrumb"><Link href="/library">{t('library.mySpace')}</Link> / <strong>{t('common.search')}</strong></span>
       <span className="save-badge">● {t('search.private')}</span>
     </header>
     <SearchClient bookId={book?.id??null} bookTitle={book?.title??null}/>
   </main>
 </WorkspaceShell>;
}
