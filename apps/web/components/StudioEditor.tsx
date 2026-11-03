'use client';
import {useEffect,useRef,useState} from 'react';
import {EditorContent,useEditor} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from 'next/link';
import ChapterComments from './ChapterComments';
import ActionMenu from './ActionMenu';
type Chapter={id:string;title:string};
type SaveState='saved'|'editing'|'saving'|'conflict'|'error'|'offline';
type Props={bookId:string;bookTitle:string;chapterId:string;chapterTitle:string;revision:number;initialContent:Record<string,unknown>;chapters:Chapter[];canEdit:boolean};
export default function StudioEditor({bookId,bookTitle,chapterId,chapterTitle,revision,initialContent,chapters,canEdit}:Props){
 const [state,setState]=useState<SaveState>('saved');
 const [currentRevision,setRevision]=useState(revision);
 const [focus,setFocus]=useState(false),[rightPanel,setRightPanel]=useState(true),[compact,setCompact]=useState<boolean|null>(null),[mobilePanel,setMobilePanel]=useState(false),[wordCount,setWordCount]=useState(0),[errorDetail,setErrorDetail]=useState('');
 const [recovery,setRecovery]=useState<string|null>(null);
 const revisionRef=useRef(revision),savedContentRef=useRef(JSON.stringify(initialContent)),pendingRef=useRef(false),savingRef=useRef(false),lastJson=useRef(JSON.stringify(initialContent));
 const serializeTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 const retryCountRef=useRef(0),retryAtRef=useRef(0),conflictRef=useRef(false);

 const draftKey='bookstudio:draft:'+chapterId;
 const drawerCloseRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
   const query=window.matchMedia('(max-width: 1150px)');
   const update=()=>{setCompact(query.matches);if(!query.matches)setMobilePanel(false);};
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

 const editor=useEditor({
   extensions:[StarterKit],
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
       catch{setState('error');setErrorDetail('Stockage local indisponible. Restez sur cette page jusqu’à confirmation de la sauvegarde serveur.');}
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
     if(pendingRef.current){setState('offline');setErrorDetail('Hors ligne : brouillon local en attente de synchronisation.');}
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
       setErrorDetail('Hors ligne : vos dernières modifications restent sur ce navigateur.');
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
         setErrorDetail('Conflit de versions. Votre texte reste visible et en brouillon local. Copiez-le avant de recharger : aucun remplacement automatique.');
         return;
       }
       if(response.status===401||response.status===403){
         conflictRef.current=true;pendingRef.current=true;
         setState('error');
         setErrorDetail('Session expirée ou accès refusé. Copiez votre texte avant de vous reconnecter ; aucune écriture non autorisée ne sera réessayée.');
         return;
       }
       if(!response.ok||!Number.isSafeInteger(body.revision)||body.revision!==baseRevision+1){
         pendingRef.current=true;retryCountRef.current+=1;
         retryAtRef.current=Date.now()+Math.min(30_000,2_000*2**Math.min(4,retryCountRef.current-1));
         setState('error');
         setErrorDetail('Sauvegarde non confirmée. Nouvelle tentative espacée automatiquement ; brouillon local conservé.');
         return;
       }
       retryCountRef.current=0;retryAtRef.current=0;
       revisionRef.current=body.revision;setRevision(body.revision);
       savedContentRef.current=snapshot;
       if(lastJson.current!==snapshot){pendingRef.current=true;setState('editing');}
       else{
         setState('saved');
         try{localStorage.removeItem(draftKey);}catch{}
       }
     }catch{
       pendingRef.current=true;retryCountRef.current+=1;
       retryAtRef.current=Date.now()+Math.min(30_000,2_000*2**Math.min(4,retryCountRef.current-1));
       setState(typeof navigator!=='undefined'&&!navigator.onLine?'offline':'error');
       setErrorDetail('Connexion lente ou interrompue. Le brouillon local reste disponible ; nouvelle tentative progressive.');
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

 const format=(command:'bold'|'italic'|'h1'|'h2'|'bullet')=>{
   if(!editor)return;
   if(command==='bold')editor.chain().focus().toggleBold().run();
   if(command==='italic')editor.chain().focus().toggleItalic().run();
   if(command==='h1')editor.chain().focus().toggleHeading({level:1}).run();
   if(command==='h2')editor.chain().focus().toggleHeading({level:2}).run();
   if(command==='bullet')editor.chain().focus().toggleBulletList().run();
 };
 return <div className={'studio '+(focus?'studio-focus ':'')+(mobilePanel?'studio-mobile-insights-open':'')}>
  <aside className="studio-sidebar">
    <Link href="/library" className="brand"><span className="brand-symbol">B✦</span><span>BookStudio <b>AI</b><small>by DTSC</small></span></Link>
    <Link href={'/books/'+bookId} className="back-link">← Vue d'ensemble</Link>
    <div className="nav-section">MANUSCRIT</div><div className="studio-book-title">{bookTitle}</div>
    <div className="chapter-navigation">{chapters.map((c,i)=><Link href={'/books/'+bookId+'/chapters/'+c.id} key={c.id} className={'chapter-nav-link '+(c.id===chapterId?'selected':'')}>{String(i+1).padStart(2,'0')} <span>{c.title}</span></Link>)}</div>
    <div className="nav-spacer"/><div className="sidebar-footer">Un livre, une idée à la fois. ✦</div>
  </aside>
  <main className="studio-center">
    <div className="studio-topbar"><span className="breadcrumb"><Link href={'/books/'+bookId}>{bookTitle}</Link> / <strong>{chapterTitle}</strong></span>
      <div className="studio-actions">
        <span className={'save-state save-'+state}>{!canEdit?'Lecture seule':state==='saved'?'✓ Enregistré':state==='editing'?'● Modifié':state==='saving'?'◌ Enregistrement…':state==='conflict'?'⚠ Conflit de versions':state==='offline'?'◌ Hors ligne · brouillon local':'⚠ Sauvegarde en attente'}</span>
        <ActionMenu label="Options d’affichage de l’éditeur" actions={[
          {label:focus?'Quitter le mode concentration':'Activer le mode concentration',
            onSelect:()=>setFocus(value=>!value)},
          {label:compact?(mobilePanel?'Fermer le panneau éditorial':'Afficher le panneau éditorial'):(rightPanel?'Masquer le panneau éditorial':'Afficher le panneau éditorial'),
            onSelect:()=>{if(compact)setMobilePanel(value=>!value);else setRightPanel(value=>!value);}}
        ]}/>
      </div>
    </div>
    {canEdit&&<div className="toolbar"><button onClick={()=>format('h1')}>Titre 1</button><button onClick={()=>format('h2')}>Titre 2</button><i/><button onClick={()=>format('bold')}><b>G</b></button><button onClick={()=>format('italic')}><em>I</em></button><button onClick={()=>format('bullet')}>☷ Liste</button><i/><button onClick={()=>editor?.chain().focus().undo().run()} title="Annuler">↶</button><button onClick={()=>editor?.chain().focus().redo().run()} title="Rétablir">↷</button></div>}
    {recovery&&<div role="alert" className="editor-warning">Un brouillon local plus récent a été trouvé.
      <button onClick={()=>{try{editor?.commands.setContent(JSON.parse(recovery) as any);setRecovery(null);}catch{setErrorDetail('Brouillon local illisible.');}}}>Restaurer mon brouillon</button>
      <button onClick={()=>{setRecovery(null);try{localStorage.removeItem(draftKey)}catch{}}}>Ignorer</button>
    </div>}
    {(state==='conflict'||state==='error'||state==='offline')&&<div className="editor-warning" role="alert">{errorDetail}</div>}
    <div className="editor-scroll"><article className="editor-sheet"><span className="chapter-label">MANUSCRIT · CHAPITRE</span><h1>{chapterTitle}</h1><div className="editor-rule"/><EditorContent editor={editor} className="prose-editor"/></article></div>
    <div className="editor-status"><span>{wordCount.toLocaleString('fr-FR')} mots</span><span>Révision {currentRevision}</span><span>Sauvegarde automatique</span></div>
  </main>
  {compact&&mobilePanel&&<button type="button" className="studio-insights-backdrop" aria-label="Fermer le panneau éditorial" onClick={()=>setMobilePanel(false)}/>}
  {((compact===false&&rightPanel)||(compact===true&&mobilePanel))&&<aside className="studio-insights" aria-label="Panneau éditorial">
    <button ref={drawerCloseRef} type="button" className="studio-insights-close" aria-label="Fermer le panneau éditorial" onClick={()=>setMobilePanel(false)}>×</button>
    <div className="insights-header"><span>✦</span><strong>Intelligence éditoriale</strong><small>À venir</small></div>
    <div className="insight-card"><span className="eyebrow">VOTRE ÉCRITURE</span><h3>Un espace pour vos idées.</h3><p>Votre manuscrit dispose d'un historique de révisions. L'IA ne modifiera jamais votre texte sans accord.</p></div>
    <ChapterComments bookId={bookId} chapterId={chapterId} revision={currentRevision} saveState={state} canEdit={canEdit}/>
    <div className="insight-card pale"><span className="eyebrow">PROCHAINES ÉVOLUTIONS</span><p>✧ Analyse stylistique</p><p>✧ Suggestions à valider</p><p>✧ Bibliographie intelligente</p></div>
    <div className="insights-footer">BookStudio AI respecte votre voix.</div>
  </aside>}
 </div>;
}
