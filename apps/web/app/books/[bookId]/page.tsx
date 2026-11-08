import {redirect,notFound} from 'next/navigation';
import Link from 'next/link';
import {activeUser,accessToBook,canWriteBook} from '@/lib/auth';
import BookOverview from '@/components/BookOverview';
import AppIcon from '@/components/AppIcon';
import ChapterActionsMenu from '@/components/ChapterActionsMenu';
import {chapterOrderToken} from '@/lib/chapter-order';
import {getBookProgress} from '@/lib/book-progress';
import {cookies} from 'next/headers';
import {LOCALE_COOKIE,parseLocale,translate} from '@/lib/i18n';
export const dynamic='force-dynamic';
export default async function BookPage({params}:{params:Promise<{bookId:string}>}){
  const user=await activeUser();if(!user)redirect('/login');
  const {bookId}=await params,book=await accessToBook(bookId,user.id);
  if(!book)notFound();
  const jar=await cookies();
  const locale=parseLocale(jar.get(LOCALE_COOKIE)?.value);
  const t=(key:Parameters<typeof translate>[1])=>translate(locale,key);
  const editable=canWriteBook(book);
  const chapters=book.editions[0]?.manuscript?.chapters??[];
  const orderToken=chapterOrderToken(chapters);
  // Progress may fail independently: a transient analytics error must not
  // prevent an author from opening or editing a manuscript.
  const progress=await getBookProgress(bookId,user.id).catch(()=>null);
  return <div className="workspace">
    <aside className="nav"><Link href="/library" className="brand"><span className="brand-symbol">B✦</span><span>BookStudio <b>AI</b><small>by DTSC</small></span></Link>
      <div className="nav-section">{t('book.navigation')}</div>
      <Link className="nav-link" href="/library"><AppIcon name="arrowLeft"/><span>{t('library.myLibrary')}</span></Link>
      <div className="nav-section">{t('book.myBook')}</div>
      <span className="nav-link active"><AppIcon name="book"/><span>{t('editor.bookOverview')}</span></span>
      <a className="nav-link" href="#book-source-files"><AppIcon name="upload"/><span>{t('book.sourcesNav')}</span></a>
      <a className="nav-link" href="#book-structure"><AppIcon name="chapter"/><span>{t('book.structure')}</span></a>
      <a className="nav-link" href="#book-versions"><AppIcon name="history"/><span>{t('book.versions')}</span></a>
      <div className="nav-section">{t('editor.manuscript')}</div>
      <div className="nav-chapter-list">{chapters.map((c,i)=><div className="nav-chapter-row" key={c.id} data-context-surface>
        <Link className="nav-link" href={'/books/'+bookId+'/chapters/'+c.id}>
          <AppIcon name="edit"/><span>{i+1}. {c.title}</span></Link>
        <ChapterActionsMenu bookId={bookId} chapterId={c.id} title={c.title}
          revision={c.revisionSeq} updatedAt={c.updatedAt.toISOString()} editable={editable}
          reorder={{token:orderToken,index:i,total:chapters.length}}/>
      </div>)}</div>
      <div className="nav-spacer"/><div className="nav-user"><span className="avatar">{user.name.charAt(0)}</span>{user.name}</div>
    </aside>
    <main className="content"><header className="content-top"><span className="breadcrumb"><Link href="/library">{t('common.library')}</Link> / <strong>{book.title}</strong></span><span className="save-badge">● Espace privé</span></header>
    <BookOverview bookId={book.id} title={book.title} status={book.status} kind={book.bookType} updatedAt={book.updatedAt.toISOString()} editable={editable} orderToken={orderToken} language={book.language} progress={progress} chapters={chapters.map(c=>({id:c.id,title:c.title,revision:c.revisionSeq,updatedAt:c.updatedAt.toISOString()}))}/></main>
  </div>;
}
