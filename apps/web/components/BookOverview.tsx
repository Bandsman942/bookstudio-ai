'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import SnapshotsPanel from './SnapshotsPanel';
import BookSourceFiles from './BookSourceFiles';
import BookActionsMenu from './BookActionsMenu';
import ChapterActionsMenu from './ChapterActionsMenu';
import {useAppPreferences} from './AppPreferences';

type Chapter={id:string;title:string;revision:number;updatedAt:string};
type Props={
  bookId:string;title:string;status:string;kind:string;
  chapters:Chapter[];updatedAt:string;editable:boolean
};

export default function BookOverview({bookId,title,status,kind,chapters,updatedAt,editable}:Props){
  const {t}=useAppPreferences();
  const [newTitle,setNewTitle]=useState(''),[showForm,setShowForm]=useState(false),
        [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const router=useRouter();
  async function add(event:React.FormEvent){
    event.preventDefault();setBusy(true);setError('');
    try{
      const response=await fetch('/api/v1/books/'+bookId+'/chapters',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:newTitle})
      });
      const payload=await response.json();
      if(!response.ok){setError(payload.error||t('book.chapterError'));return;}
      router.push('/books/'+bookId+'/chapters/'+payload.chapter.id);
      router.refresh();
    }catch{setError(t('book.serviceUnavailable'));}
    finally{setBusy(false);}
  }
  return <div className="content-inner">
    <span className="eyebrow">{t('book.projectOverview')}</span>
    <div className="book-title-actions">
      <div><h1>{title}<span className="dot">.</span></h1><p>{t('book.overviewSubtitle')}</p></div>
      {editable&&<BookActionsMenu bookId={bookId} title={title} updatedAt={updatedAt} editable onArchive="library"/>}
    </div>
    <div className="overview-cards">
      <div><span>{t('book.chapters')}</span><strong>{chapters.length}</strong><small>{t('book.organized')}</small></div>
      <div><span>{t('book.status')}</span><strong className="status-label">{status==='DRAFT'?t('library.draft'):status}</strong><small>{t('book.historySaved')}</small></div>
      <div><span>{t('book.type')}</span><strong className="status-label">{kind==='NOVEL'?t('library.kindNovel'):kind==='MEDICINE'?t('library.kindMedicine'):kind==='SCIENCE'?t('library.kindScience'):t('library.kindGeneral')}</strong><small>{t('book.customizable')}</small></div>
    </div>
    <div className="section-header"><h2>{t('book.structure')}</h2>
      {editable&&<button className="button small" type="button" onClick={()=>setShowForm(true)}>＋ {t('book.chapterAdd')}</button>}
    </div>
    <div className="chapter-list">{chapters.map((chapter,index)=><div key={chapter.id} className="chapter-item">
      <Link href={'/books/'+bookId+'/chapters/'+chapter.id} className="chapter-item-link">
        <span className="chapter-num">{String(index+1).padStart(2,'0')}</span>
        <div><strong>{chapter.title}</strong><small>{t('book.chapterRevision',{count:chapter.revision})}</small></div>
        <span className="chapter-arrow" aria-hidden="true">↗</span>
      </Link>
      <ChapterActionsMenu bookId={bookId} chapterId={chapter.id} title={chapter.title}
        updatedAt={chapter.updatedAt} editable={editable}/>
    </div>)}</div>
    <BookSourceFiles bookId={bookId} editable={editable}/>
    <SnapshotsPanel bookId={bookId} editable={editable}/>
    {showForm&&<div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)setShowForm(false);}}>
      <form className="modal" onSubmit={add} role="dialog" aria-modal="true" aria-label={t('book.newChapter')}>
        <button className="close" type="button" aria-label={t('common.close')} onClick={()=>setShowForm(false)}>×</button>
        <div className="eyebrow">{t('book.newChapter')}</div><h2>{t('book.newChapterTitle')}</h2>
        <label>{t('book.chapterName')}<input autoFocus required minLength={2} maxLength={180}
          value={newTitle} onChange={event=>setNewTitle(event.target.value)}
          placeholder={t('book.chapterPlaceholder')}/></label>
        {error&&<p role="alert" className="form-error">{error}</p>}
        <button className="button full" disabled={busy}>{t(busy?'book.chapterCreating':'book.chapterCreate')}</button>
      </form>
    </div>}
  </div>;
}
