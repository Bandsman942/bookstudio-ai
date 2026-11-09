'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {EditorContent,useEditor} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {safeExternalHref} from '@bookstudio/domain';
import EditorRibbon from './EditorRibbon';
import ChapterFindReplacePanel from './ChapterFindReplacePanel';
import AppIcon from './AppIcon';
import Link from 'next/link';
import ChapterComments from './ChapterComments';
import ChapterRevisionsPanel from './ChapterRevisionsPanel';
import ActionMenu from './ActionMenu';
import ChapterActionsMenu from './ChapterActionsMenu';
import ShortcutsHelp from './ShortcutsHelp';
import {useAppPreferences,usePreferenceActions} from './AppPreferences';
import {useToast} from './ToastProvider';
type Chapter={id:string;title:string;updatedAt:string;revision:number};
type SaveState='saved'|'editing'|'saving'|'conflict'|'error'|'offline';
type Props={bookId:string;bookTitle:string;chapterId:string;chapterTitle:string;revision:number;initialContent:Record<string,unknown>;chapters:Chapter[];canEdit:boolean;orderToken:string};
export default function StudioEditor({bookId,bookTitle,chapterId,chapterTitle,revision,initialContent,chapters,canEdit,orderToken}:Props){
 const {t,locale}=useAppPreferences();
 const router=useRouter();
 const preferenceActions=usePreferenceActions();
 const {notify}=useToast();
 const previousSaveState=useRef<SaveState>('saved');
 const hadSaveIssue=useRef(false);
 const currentTRef=useRef(t);currentTRef.current=t;
 const [state,setState]=useState<SaveState>('saved');
 const [currentRevision,setRevision]=useState(revision);
 const [focus,setFocus]=useState(false),[rightPanel,setRightPanel]=useState(true),[compact,setCompact]=useState<boolean|null>(null),[mobilePanel,setMobilePanel]=useState(false),[mobileNav,setMobileNav]=useState(false),[wordCount,setWordCount]=useState(0),[errorDetail,setErrorDetail]=useState('');
 const [recovery,setRecovery]=useState<string|null>(null);
 const revisionRef=useRef(revision),savedContentRef=useRef(JSON.stringify(initialContent)),pendingRef=useRef(false),savingRef=useRef(false),lastJson=useRef(JSON.stringify(initialContent));
 const serializeTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 const retryCountRef=useRef(0),retryAtRef=useRef(0),conflictRef=useRef(false);

 useEffect(()=>{
   // Autosave itself is silent; only transitions that require intervention
   // and an eventual recovery trigger one contextual notification.
   const previous=previousSaveState.current;previousSaveState.current=state;
   if(!canEdit||state===previous)return;
   if(state==='conflict'||state==='offline'||state==='error'){
     hadSaveIssue.current=true;
     const detail=errorDetail||(
       locale==='fr'?'Les modifications du chapitre « '+chapterTitle+' » ne sont pas encore enregistrées sur le serveur.':
         'Changes to “'+chapterTitle+'” have not yet been saved on the server.');
     notify({tone:state==='conflict'?'warning':'error',
       title:locale==='fr'?(state==='conflict'?'Conflit de révision du chapitre':
         state==='offline'?'Chapitre hors connexion':'Enregistrement du chapitre à vérifier'):
         (state==='conflict'?'Chapter revision conflict':
         state==='offline'?'Chapter is offline':'Chapter save needs attention'),
       detail,key:'editor-state|'+chapterId+'|'+state,durationMs:state==='offline'?9500:0});
   }else if(state==='saved'&&hadSaveIssue.current){
     hadSaveIssue.current=false;
     notify({tone:'success',title:locale==='fr'?'Enregistrement du chapitre rétabli':'Chapter save recovered',
       detail:locale==='fr'?'« '+chapterTitle+' » est maintenant enregistré à la révision '+revisionRef.current+'.':
         '“'+chapterTitle+'” is now saved at revision '+revisionRef.current+'.',
       key:'editor-recovered|'+chapterId});
   }
 },[state,canEdit,chapterId,chapterTitle,errorDetail,locale,notify]);
 const draftKey='bookstudio:draft:'+chapterId;
 const drawerCloseRef=useRef<HTMLButtonElement>(null);
 const navCloseRef=useRef<HTMLButtonElement>(null),navListRef=useRef<HTMLDivElement>(null);
 const navToggleRef=useRef<HTMLButtonElement>(null),navWasOpen=useRef(false);

 useEffect(()=>{
   const query=window.matchMedia('(max-width: 1150px)');
   const update=()=>{setCompact(query.matches);if(!query.matches){setMobilePanel(false);setMobileNav(false);}};
   update();
   query.addEventListener('change',update);
   return ()=>query.removeEventListener('change',update);
 },[]);
 useEffect(()=>{
   if(!mobilePanel)return;
   drawerCloseRef.current?.focus();
   const handler=(event:KeyboardEvent)=>{if(event.key==='Escape')setMobilePanel(false);};
   document.addEventListener('keydown',handler);
   return ()=>document.removeEventListener('keydown',handler);
 },[mobilePanel]);

 useEffect(()=>{
   if(!mobileNav){
     if(navWasOpen.current)navToggleRef.current?.focus();
     navWasOpen.current=false;
     return;
   }
   navWasOpen.current=true;
   navCloseRef.current?.focus();
   const key=(event:KeyboardEvent)=>{
     if(document.querySelector('[role="dialog"][aria-modal="true"]:not(#studio-manuscript-nav)'))return;
     if(event.key==='Escape'){event.preventDefault();setMobileNav(false);return;}
     if(event.key!=='Tab')return;
     const items=[...document.querySelectorAll<HTMLElement>(
       '#studio-manuscript-nav a[href], #studio-manuscript-nav button:not([disabled])'
     )].filter(item=>item.getClientRects().length>0);
     const first=items[0],last=items[items.length-1];
     if(!first||!last)return;
     if(event.shiftKey&&document.activeElement===first){
       event.preventDefault();last.focus();
     }else if(!event.shiftKey&&document.activeElement===last){
       event.preventDefault();first.focus();
     }else if(!document.getElementById('studio-manuscript-nav')?.contains(document.activeElement)){
       event.preventDefault();first.focus();
     }
   };
   document.addEventListener('keydown',key);
   return ()=>document.removeEventListener('keydown',key);
 },[mobileNav]);
 useEffect(()=>{
   const selected=navListRef.current?.querySelector<HTMLElement>('.chapter-nav-row.selected');
   if(selected)selected.scrollIntoView({block:'nearest'});
 },[chapterId,mobileNav]);

 const editor=useEditor({
   extensions:[StarterKit.configure({
     link:{openOnClick:false,autolink:false,linkOnPaste:false,
       isAllowedUri:(url:string)=>safeExternalHref(url)!==null}
   })],
   content:initialContent as any,
   editable:canEdit,
   immediatelyRender:false,
   onUpdate:({editor})=>{
     if(!canEdit)return;
     pendingRef.current=true;
     setState(conflictRef.current?'conflict':'editing');
     // Coalesce many keystrokes into one serialization, word-count and local write.
     // Max 350ms between local draft checkpoints even while typing continuously.
     if(serializeTimerRef.current)return;
     serializeTimerRef.current=setTimeout(()=>{
       serializeTimerRef.current=null;
       lastJson.current=JSON.stringify(editor.getJSON());
       setWordCount(editor.getText().trim().split(/\s+/).filter(Boolean).length);
       try{localStorage.setItem(draftKey,lastJson.current);}
       catch{setState('error');setErrorDetail(currentTRef.current('editor.storageUnavailable'));}
     },350);
   }
 });
 useEffect(()=>{
   if(!editor)return;
   setWordCount(editor.getText().trim().split(/\s+/).filter(Boolean).length);
   try{const draft=localStorage.getItem(draftKey);
     if(draft&&draft!==savedContentRef.current){JSON.parse(draft);setRecovery(draft);}
   }catch{}
 },[editor,draftKey]);
 useEffect(()=>{
   function networkDown(){
     if(pendingRef.current){setState('offline');setErrorDetail(currentTRef.current('editor.offlinePending'));}
   }
   function networkUp(){
     retryAtRef.current=0;retryCountRef.current=0;
     if(pendingRef.current&&!conflictRef.current)setState('editing');
   }
   window.addEventListener('offline',networkDown);
   window.addEventListener('online',networkUp);
   return ()=>{window.removeEventListener('offline',networkDown);window.removeEventListener('online',networkUp);};
 },[]);

 useEffect(()=>{
   if(!canEdit)return;
   const id=setInterval(async()=>{
     if(!pendingRef.current||savingRef.current||conflictRef.current||serializeTimerRef.current)return;
     if(typeof navigator!=='undefined'&&!navigator.onLine){
       setState('offline');
       setErrorDetail(currentTRef.current('editor.offlineSaved'));
       return;
     }
     if(Date.now()<retryAtRef.current)return;
     if(lastJson.current===savedContentRef.current){pendingRef.current=false;setState('saved');return;}
     const snapshot=lastJson.current,baseRevision=revisionRef.current;
     pendingRef.current=false;savingRef.current=true;setState('saving');
     const controller=new AbortController();
     const timeout=setTimeout(()=>controller.abort(),20_000);
     try{
       const response=await fetch('/api/v1/books/'+bookId+'/chapters/'+chapterId,{
         method:'PATCH',headers:{'Content-Type':'application/json'},
         body:JSON.stringify({baseRevision,content:JSON.parse(snapshot)}),
         signal:controller.signal
       });
       const body=await response.json().catch(()=>({}));
       if(response.status===409){
         conflictRef.current=true;pendingRef.current=true;
         setState('conflict');
         setErrorDetail(currentTRef.current('editor.conflictDetailed'));
         return;
       }
       if(response.status===401||response.status===403){
         conflictRef.current=true;pendingRef.current=true;
         setState('error');
         setErrorDetail(currentTRef.current('editor.sessionExpired'));
         return;
       }
       if(!response.ok||!Number.isSafeInteger(body.revision)||body.revision!==baseRevision+1){
         pendingRef.current=true;retryCountRef.current+=1;
         retryAtRef.current=Date.now()+Math.min(30_000,2_000*2**Math.min(4,retryCountRef.current-1));
         setState('error');
         setErrorDetail(currentTRef.current('editor.retry'));
         return;
       }
       retryCountRef.current=0;retryAtRef.current=0;
       revisionRef.current=body.revision;setRevision(body.revision);
       savedContentRef.current=snapshot;
       if(pendingRef.current||serializeTimerRef.current||lastJson.current!==snapshot){pendingRef.current=true;setState('editing');}
       else{
         setState('saved');
         try{localStorage.removeItem(draftKey);}catch{}
       }
     }catch{
       pendingRef.current=true;retryCountRef.current+=1;
       retryAtRef.current=Date.now()+Math.min(30_000,2_000*2**Math.min(4,retryCountRef.current-1));
       setState(typeof navigator!=='undefined'&&!navigator.onLine?'offline':'error');
       setErrorDetail(currentTRef.current('editor.connectionRetry'));
     }finally{
       clearTimeout(timeout);
       savingRef.current=false;
     }
   },1_800);
   return ()=>clearInterval(id);
 },[bookId,chapterId,draftKey,canEdit]);

 useEffect(()=>{
   if(!canEdit||!editor)return;
   const flush=()=>{
     if(serializeTimerRef.current){
       clearTimeout(serializeTimerRef.current);serializeTimerRef.current=null;
       try{
         lastJson.current=JSON.stringify(editor.getJSON());
         localStorage.setItem(draftKey,lastJson.current);
       }catch{}
     }
   };
   const handler=(event:BeforeUnloadEvent)=>{
     flush();
     if(pendingRef.current||savingRef.current){event.preventDefault();event.returnValue='';}
   };
   window.addEventListener('beforeunload',handler);
   return ()=>{flush();window.removeEventListener('beforeunload',handler);};
 },[editor,draftKey,canEdit]);

 useEffect(()=>{
   const handle=(event:KeyboardEvent)=>{
     const mod=event.ctrlKey||event.metaKey,letter=event.key.toLowerCase();
     const target=event.target instanceof Element?event.target:null;
     const typing=!!target?.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]');
     if(mod&&letter==='s'&&!event.altKey){
       event.preventDefault();
       if(canEdit&&editor){
         if(serializeTimerRef.current){clearTimeout(serializeTimerRef.current);serializeTimerRef.current=null;}
         lastJson.current=JSON.stringify(editor.getJSON());
         try{localStorage.setItem(draftKey,lastJson.current);}catch{}
         pendingRef.current=lastJson.current!==savedContentRef.current;
         retryAtRef.current=0;
         if(pendingRef.current)setState('editing');
       }
       return;
     }
     if(mod&&event.shiftKey&&letter==='o'){
       event.preventDefault();
       if(!pendingRef.current&&!savingRef.current)router.push('/books/'+bookId);
       else notify({tone:'warning',title:locale==='fr'?'Enregistrement en cours':'Save in progress',
         detail:locale==='fr'?'Le chapitre doit être enregistré avant de changer de page.':'Save the chapter before navigating away.'});
     }else if(mod&&event.shiftKey&&letter==='k'){
       event.preventDefault();if(!pendingRef.current&&!savingRef.current)router.push('/search');
     }else if(event.altKey&&event.shiftKey&&(event.key==='ArrowUp'||event.key==='ArrowDown')){
       event.preventDefault();
       const current=chapters.findIndex(c=>c.id===chapterId),next=current+(event.key==='ArrowUp'?-1:1);
       if(next>=0&&next<chapters.length&&!pendingRef.current&&!savingRef.current)
         router.push('/books/'+bookId+'/chapters/'+chapters[next].id);
     }else if(event.altKey&&event.shiftKey&&letter==='m'){
       event.preventDefault();setMobileNav(v=>!v);
     }else if(event.key==='?'&&!typing&&!mod&&!event.altKey){
       event.preventDefault();document.dispatchEvent(new Event('bookstudio-shortcuts-open'));
     }
   };
   document.addEventListener('keydown',handle);
   return ()=>document.removeEventListener('keydown',handle);
 },[editor,bookId,chapterId,chapters,canEdit,draftKey,router,locale,notify]);

 function canLeaveEditor(){
   if(pendingRef.current||savingRef.current){
     notify({tone:'warning',title:locale==='fr'?'Sauvegarde du chapitre en attente':'Chapter has pending changes',
       detail:locale==='fr'?'Attendez la confirmation « Enregistré » avant de naviguer.':
         'Wait for the “Saved” confirmation before navigating.'});
     return false;
   }
   return true;
 }
 function protectNavigation(event:React.MouseEvent){
   if(!canLeaveEditor())event.preventDefault();else setMobileNav(false);
 }
 return <div className={'studio '+(focus?'studio-focus ':'')+(mobilePanel?'studio-mobile-insights-open ':'')+
     (mobileNav?'studio-mobile-navigation-open':'')}>
  {mobileNav&&<button type="button" className="studio-nav-backdrop" aria-label={locale==='fr'?'Fermer la navigation':'Close navigation'} onClick={()=>setMobileNav(false)}/>}
  <aside id="studio-manuscript-nav" className="studio-sidebar" aria-label={t('editor.manuscript')}
    role={mobileNav?'dialog':undefined} aria-modal={mobileNav?true:undefined}>
    <button ref={navCloseRef} type="button" className="studio-nav-close" aria-label={locale==='fr'?'Fermer les chapitres':'Close chapters'} onClick={()=>setMobileNav(false)}>×</button>
    <Link href="/library" className="brand" onClick={protectNavigation}><span className="brand-symbol">B✦</span><span>BookStudio <b>AI</b><small>by DTSC</small></span></Link>
    <Link href={'/books/'+bookId} className="back-link" onClick={protectNavigation}><AppIcon name="arrowLeft"/>{t('editor.bookOverview')}</Link>
    <div className="nav-section"><AppIcon name="manuscript"/>{t('editor.manuscript')}</div><div className="studio-book-title">{bookTitle}</div>
    <Link href={'/search?bookId='+bookId} className="back-link" onClick={protectNavigation}>
      <AppIcon name="search"/>{locale==='fr'?'Rechercher dans ce livre':'Search this book'}
    </Link>
    <div ref={navListRef} className="chapter-navigation" aria-label={locale==='fr'?'Liste des chapitres':'Chapter list'}>{chapters.map((c,i)=>
      <div key={c.id} className={'chapter-nav-row'+(c.id===chapterId?' selected':'')} data-context-surface>
        <Link href={'/books/'+bookId+'/chapters/'+c.id} onClick={protectNavigation}
          className={'chapter-nav-link '+(c.id===chapterId?'selected':'')} aria-current={c.id===chapterId?'page':undefined}>
          <AppIcon name="chapter" size={16}/><span>{String(i+1).padStart(2,'0')}. {c.title}</span>
        </Link>
        <ChapterActionsMenu bookId={bookId} chapterId={c.id} title={c.title} revision={c.revision}
          updatedAt={c.updatedAt} editable={canEdit} beforeNavigate={canLeaveEditor}
          reorder={{token:orderToken,index:i,total:chapters.length}}/>
      </div>)}</div>
    <div className="sidebar-footer">{t('editor.sidebarNote')}</div>
  </aside>
  <main className="studio-center">
    <div className="studio-topbar">
      <div className="studio-quick-nav">
        <button type="button" className="studio-nav-toggle" ref={navToggleRef}
          aria-controls="studio-manuscript-nav" onClick={()=>setMobileNav(v=>!v)}
          aria-label={locale==='fr'?'Afficher les options et les chapitres à gauche':'Show left options and chapters'}
          aria-expanded={mobileNav}>☰</button>
        <Link className="studio-quick-overview" href={'/books/'+bookId} onClick={protectNavigation}>
          <AppIcon name="arrowLeft" size={15}/>{t('editor.bookOverview')}
        </Link>
        <span className="breadcrumb"><Link href={'/books/'+bookId} onClick={protectNavigation}>{bookTitle}</Link> / <strong>{chapterTitle}</strong></span>
      </div>
      <div className="studio-actions">
        <span className={'save-state save-'+state}>{!canEdit?t('common.readOnly'):state==='saved'?'✓ '+t('editor.saved'):state==='editing'?'● '+t('editor.modified'):state==='saving'?'◌ '+t('editor.saving'):state==='conflict'?'⚠ '+t('editor.conflict'):state==='offline'?'◌ '+t('editor.offlineDraft'):'⚠ '+t('editor.unsaved')}</span>
        <ChapterFindReplacePanel editor={editor} chapterTitle={chapterTitle} canEdit={canEdit}
          canReplaceNow={()=>canEdit&&!conflictRef.current&&!recovery&&
            state!=='conflict'&&state!=='offline'&&state!=='error'&&
            (typeof navigator==='undefined'||navigator.onLine)}/>
        <button type="button" className="studio-shortcuts-trigger" title={locale==='fr'?'Raccourcis clavier (?)':'Keyboard shortcuts (?)'}
          aria-label={locale==='fr'?'Aide des raccourcis clavier':'Keyboard shortcuts help'}
          onClick={()=>document.dispatchEvent(new Event('bookstudio-shortcuts-open'))}>?</button>
        <ChapterRevisionsPanel bookId={bookId} chapterId={chapterId}
          canEdit={canEdit} getCurrentRevision={()=>revisionRef.current}
          canRestoreNow={()=>canEdit&&!pendingRef.current&&!savingRef.current&&
            !conflictRef.current&&state==='saved'&&!recovery}
          onRestored={()=>router.refresh()}/>
        <ActionMenu label={t('editor.display')} actions={[
          {label:locale==='fr'?'Rechercher dans tous les chapitres du livre':'Search across book chapters',
            onSelect:()=>{if(canLeaveEditor())router.push('/search?bookId='+bookId);}},
          {label:t(focus?'editor.focusOff':'editor.focusOn'),
            onSelect:()=>setFocus(value=>!value)},
          {label:compact?t(mobilePanel?'editor.panelClose':'editor.panelOn'):t(rightPanel?'editor.panelOff':'editor.panelOn'),
            onSelect:()=>{if(compact)setMobilePanel(value=>!value);else setRightPanel(value=>!value);}},
          ...preferenceActions
        ]}/>
      </div>
    </div>
    <EditorRibbon editor={editor} canEdit={canEdit}/>
    {recovery&&<div role="alert" className="editor-warning">{t('editor.draftRecovery')}
      <button onClick={()=>{try{editor?.commands.setContent(JSON.parse(recovery) as any);setRecovery(null);}catch{setErrorDetail(t('editor.draftUnreadable'));}}}>{t('editor.draftRestore')}</button>
      <button onClick={()=>{setRecovery(null);try{localStorage.removeItem(draftKey)}catch{}}}>{t('editor.draftIgnore')}</button>
    </div>}
    {(state==='conflict'||state==='error'||state==='offline')&&<div className="editor-warning" role="alert">{errorDetail}</div>}
    <div className="editor-scroll"><article className="editor-sheet"><span className="chapter-label">{t('editor.chapterTitle')}</span><h1>{chapterTitle}</h1><div className="editor-rule"/><EditorContent editor={editor} className="prose-editor"/></article></div>
    <div className="editor-status"><span>{t('editor.wordCount',{count:wordCount.toLocaleString(locale==='fr'?'fr-FR':'en-US')})}</span><span>{t('editor.revision',{count:currentRevision})}</span><span>{t('editor.autosave')}</span></div>
  </main>
  {compact&&mobilePanel&&<button type="button" className="studio-insights-backdrop" aria-label={t('editor.panelClose')} onClick={()=>setMobilePanel(false)}/>}
  {((compact===false&&rightPanel)||(compact===true&&mobilePanel))&&<aside className="studio-insights" aria-label="Panneau éditorial">
    <button ref={drawerCloseRef} type="button" className="studio-insights-close" aria-label="Fermer le panneau éditorial" onClick={()=>setMobilePanel(false)}>×</button>
    <div className="insights-header"><span><AppIcon name="sparkles"/></span><strong>{t('editor.editorial')}</strong><small>{t('editor.coming')}</small></div>
    <div className="insight-card"><span className="eyebrow">{t('editor.yourWriting')}</span><h3>{t('editor.ideas')}</h3><p>{t('editor.editorialCopy')}</p></div>
    <ChapterComments bookId={bookId} chapterId={chapterId} revision={currentRevision} saveState={state} canEdit={canEdit}/>
    <div className="insight-card pale"><span className="eyebrow">{t('editor.next')}</span><p>✧ {t('editor.style')}</p><p>✧ {t('editor.suggestions')}</p><p>✧ {t('editor.bibliography')}</p></div>
    <div className="insights-footer">{t('editor.respects')}</div>
  </aside>}
  <ShortcutsHelp/>
 </div>;
}
