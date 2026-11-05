'use client';

import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import SnapshotsPanel from './SnapshotsPanel';
import BookSourceFiles from './BookSourceFiles';
import BookActionsMenu from './BookActionsMenu';
import ChapterActionsMenu from './ChapterActionsMenu';
import ChapterTrash from './ChapterTrash';
import ShortcutsHelp from './ShortcutsHelp';
import {useAppPreferences} from './AppPreferences';
import {useToast} from './ToastProvider';
import {explainActionError} from '@/lib/notification-copy';
import AppIcon from './AppIcon';

type Chapter={id:string;title:string;revision:number;updatedAt:string};
type Props={
  bookId:string;title:string;status:string;kind:string;
  chapters:Chapter[];updatedAt:string;editable:boolean;orderToken:string
};

export default function BookOverview({bookId,title,status,kind,chapters,updatedAt,editable,orderToken}:Props){
  const {t,locale}=useAppPreferences();
  const {notify}=useToast();
  const [newTitle,setNewTitle]=useState(''),[showForm,setShowForm]=useState(false),
        [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const router=useRouter();
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      const target=event.target instanceof Element?event.target:null;
      const typing=!!target?.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]');
      if((event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key.toLowerCase()==='n'&&editable){
        event.preventDefault();setShowForm(true);
      }else if(event.key==='?'&&!typing&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
        event.preventDefault();document.dispatchEvent(new Event('bookstudio-shortcuts-open'));
      }
    };
    document.addEventListener('keydown',key);return ()=>document.removeEventListener('keydown',key);
  },[editable]);
  async function add(event:React.FormEvent){
    event.preventDefault();setBusy(true);setError('');
    try{
      const response=await fetch('/api/v1/books/'+bookId+'/chapters',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:newTitle})
      });
      const payload=await response.json();
      if(!response.ok){const detail=explainActionError({locale,operation:'chapter-create',status:response.status,code:payload.error});
        setError(detail);notify({tone:'error',title:locale==='fr'?'Chapitre non créé':'Chapter not created',detail});return;}
      notify({tone:'success',title:locale==='fr'?'Chapitre créé':'Chapter created',
        detail:locale==='fr'?'« '+newTitle+' » a été ajouté à l’ouvrage « '+title+' ».':
          '“'+newTitle+'” was added to “'+title+'”.'});
      router.push('/books/'+bookId+'/chapters/'+payload.chapter.id);
      router.refresh();
    }catch{const detail=explainActionError({locale,operation:'chapter-create',status:0});setError(detail);
      notify({tone:'error',title:locale==='fr'?'Création du chapitre interrompue':'Chapter creation interrupted',detail});}
    finally{setBusy(false);}
  }
  return <div className="content-inner">
    <span className="eyebrow">{t('book.projectOverview')}</span>
    <div className="book-title-actions">
      <div><h1>{title}<span className="dot">.</span></h1><p>{t('book.overviewSubtitle')}</p></div>
      {editable&&<div className="book-header-actions">
        <a className="button small" href="#book-source-files"><AppIcon name="upload"/>{t('book.importManuscript')}</a>
        <BookActionsMenu bookId={bookId} title={title} updatedAt={updatedAt} editable onArchive="library"/>
      </div>}
    </div>
    <BookSourceFiles bookId={bookId} editable={editable}/>
    <div className="overview-cards">
      <div><span>{t('book.chapters')}</span><strong>{chapters.length}</strong><small>{t('book.organized')}</small></div>
      <div><span>{t('book.status')}</span><strong className="status-label">{status==='DRAFT'?t('library.draft'):status}</strong><small>{t('book.historySaved')}</small></div>
      <div><span>{t('book.type')}</span><strong className="status-label">{kind==='NOVEL'?t('library.kindNovel'):kind==='MEDICINE'?t('library.kindMedicine'):kind==='SCIENCE'?t('library.kindScience'):t('library.kindGeneral')}</strong><small>{t('book.customizable')}</small></div>
    </div>
    <div className="section-header" id="book-structure"><h2><AppIcon name="chapter"/>{t('book.structure')}</h2>
      {editable&&<button className="button small" type="button" onClick={()=>setShowForm(true)}><AppIcon name="plus"/>{t('book.chapterAdd')}</button>}
    </div>
    <div className="chapter-list">{chapters.map((chapter,index)=><div key={chapter.id} className="chapter-item">
      <Link href={'/books/'+bookId+'/chapters/'+chapter.id} className="chapter-item-link">
        <span className="chapter-num">{String(index+1).padStart(2,'0')}</span>
        <div><strong>{chapter.title}</strong><small>{t('book.chapterRevision',{count:chapter.revision})}</small></div>
        <AppIcon name="chevronRight" className="chapter-arrow"/>
      </Link>
      <ChapterActionsMenu bookId={bookId} chapterId={chapter.id} title={chapter.title}
        updatedAt={chapter.updatedAt} revision={chapter.revision} editable={editable}
        reorder={{token:orderToken,index,total:chapters.length}}/>
    </div>)}</div>
    {editable&&<ChapterTrash bookId={bookId}/>}
    <SnapshotsPanel bookId={bookId} editable={editable}/>
    <ShortcutsHelp/>
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
