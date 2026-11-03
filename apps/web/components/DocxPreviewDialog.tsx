'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import AppIcon from './AppIcon';
import {useAppPreferences} from './AppPreferences';
import {previewDocx,type DocxPreview,DocxPreviewError} from '@/lib/docx-preview';

const MAX_BYTES=20*1024*1024;
const copy={
  fr:{
    title:'Prévisualisation du manuscrit DOCX',reading:'Lecture privée du fichier depuis Supabase…',
    analysing:'Vérification de la structure Word dans votre navigateur…',
    subtitle:'Aperçu de lecture à réviser — fidélité non vérifiée',
    intro:'Aucun contenu n’est envoyé à un service d’IA. Ce texte est inspecté temporairement dans votre navigateur et n’est pas ajouté aux chapitres.',
    close:'Fermer',empty:'Aucun paragraphe simple reconnu.',error:'Impossible de prévisualiser ce DOCX.',
    invalid:'Archive Word refusée : fichier incomplet, trop volumineux ou potentiellement dangereux.',
    corrupted:'Le fichier DOCX paraît corrompu ou ses éléments XML ne sont pas lisibles.',
    network:'Connexion au stockage interrompue ou autorisation expirée. Réessayez.',
    warnings:'Éléments nécessitant une revue humaine',count:'{count} blocs affichés',
    noWarnings:'Aucune structure particulière signalée ; l’aperçu ne garantit pas la fidélité.',
    'IMAGES_PRESENT':'Images présentes : non restituées dans cet aperçu.',
    'NOTES_PRESENT':'Notes de bas de page ou de fin présentes : non restituées.',
    'TABLES_NOT_RENDERED':'Tableaux présents : non reproduits.',
    'TRACKED_CHANGES_PRESENT':'Modifications suivies présentes : vérifier le texte dans Word.',
    'FIELDS_NOT_EVALUATED':'Champs dynamiques présents : non évalués.',
    'DRAWINGS_NOT_RENDERED':'Dessins ou formes présents : non reproduits.',
    'EXTERNAL_LINKS_PRESENT':'Liens externes présents : jamais chargés.',
    'PREVIEW_TRUNCATED':'Aperçu limité à 200 paragraphes et 100 000 caractères.',
    'NO_SIMPLE_TEXT_FOUND':'Aucun paragraphe simple à présenter.',
    importTitle:'Créer un chapitre à partir de cet aperçu',chapterLabel:'Titre du nouveau chapitre',
    acknowledge:'J’ai relu cet aperçu et accepté les éventuelles omissions (images, tableaux, notes, mise en page, modifications suivies). Le DOCX original sera conservé.',
    createChapter:'Créer ce chapitre après ma validation',creating:'Création du chapitre…',
    noImportTruncated:'Cet aperçu est incomplet. Pour éviter toute perte de contenu, il ne peut pas être converti en chapitre.',
    importFailure:'Création non confirmée. Réessayez avec la même opération ; aucun chapitre ne doit être dupliqué.',
    sourceUnavailable:'Fichier source indisponible ou non conforme ; vérifiez-le avant l’importation.',
    importConflict:'Une autre modification est intervenue. Réessayez sans changer le contenu confirmé.',
    acceptedNote:'Le chapitre sera créé comme nouveau brouillon, sans modifier les chapitres existants ni certifier la fidélité Word.'
  },
  en:{
    title:'Preview DOCX manuscript',reading:'Reading private file directly from Supabase…',
    analysing:'Checking Word structure inside your browser…',
    subtitle:'Review-only preview — fidelity not verified',
    intro:'No content is sent to an AI service. This document is inspected temporarily in your browser and is not added to your chapters.',
    close:'Close',empty:'No ordinary paragraphs found.',error:'Could not preview this DOCX.',
    invalid:'Word archive rejected: unsafe, incomplete or oversized.',
    corrupted:'The DOCX appears corrupt or its XML cannot be read.',
    network:'Storage connection failed or permission expired. Retry.',
    warnings:'Items needing human review',count:'{count} blocks shown',
    noWarnings:'No special structure flagged; this preview is not fidelity-certified.',
    'IMAGES_PRESENT':'Images detected: not rendered.',
    'NOTES_PRESENT':'Footnotes or endnotes detected: not rendered.',
    'TABLES_NOT_RENDERED':'Tables detected: not reproduced.',
    'TRACKED_CHANGES_PRESENT':'Tracked changes detected: check in Word.',
    'FIELDS_NOT_EVALUATED':'Dynamic fields detected: not evaluated.',
    'DRAWINGS_NOT_RENDERED':'Drawings detected: not rendered.',
    'EXTERNAL_LINKS_PRESENT':'External hyperlinks detected: never fetched.',
    'PREVIEW_TRUNCATED':'Preview limited to 200 paragraphs and 100,000 characters.',
    'NO_SIMPLE_TEXT_FOUND':'No ordinary paragraphs were found.',
    importTitle:'Create a chapter from this reviewed preview',chapterLabel:'New chapter title',
    acknowledge:'I reviewed this preview and accept any omissions (images, tables, notes, layout, tracked changes). The original DOCX will be retained.',
    createChapter:'Create this chapter after my approval',creating:'Creating chapter…',
    noImportTruncated:'This preview is incomplete. It cannot be converted into a chapter to prevent silent content loss.',
    importFailure:'Creation not confirmed. Retry the same operation; no duplicate chapter should be created.',
    sourceUnavailable:'The source file is unavailable or invalid. Check it before importing.',
    importConflict:'Another edit occurred. Retry without changing the approved content.',
    acceptedNote:'A new draft chapter will be created. Existing chapters remain unchanged and Word fidelity is not certified.'
  }
} as const;
type Warning=keyof typeof copy.fr;

export default function DocxPreviewDialog({bookId,name,onClose,editable}:{
  bookId:string;name:string;onClose:()=>void;editable:boolean
}){
  const {locale}=useAppPreferences(),t=copy[locale];
  const router=useRouter();
  const [chapterTitle,setChapterTitle]=useState(name.slice(37).replace(/\.docx$/i,'').replace(/[-_]+/g,' ').slice(0,180));
  const [approved,setApproved]=useState(false),[importing,setImporting]=useState(false),
    [importError,setImportError]=useState(''),[locked,setLocked]=useState(false);
  const operationId=useRef<string|null>(null);
  const [stage,setStage]=useState<'reading'|'analysing'|'done'>('reading');
  const [preview,setPreview]=useState<DocxPreview|null>(null);
  const [error,setError]=useState('');
  const closeRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{closeRef.current?.focus();},[]);
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!importing)onClose();};
    document.addEventListener('keydown',key);
    return ()=>document.removeEventListener('keydown',key);
  },[onClose,importing]);
  useEffect(()=>{
    const controller=new AbortController();
    const inspect=async()=>{
      try{
        const signed=await fetch('/api/v1/books/'+bookId+'/files',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({action:'download',name}),signal:controller.signal
        });
        if(!signed.ok)throw new Error('NETWORK');
        const ticket=await signed.json() as {url?:string};
        if(typeof ticket.url!=='string')throw new Error('NETWORK');
        const url=new URL(ticket.url);
        if(url.protocol!=='https:'||url.username||url.password||
           !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname)||
           !url.pathname.startsWith('/storage/v1/object/sign/')||
           !url.searchParams.has('token'))throw new Error('NETWORK');
        const response=await fetch(url.toString(),{
          method:'GET',cache:'no-store',signal:controller.signal
        });
        if(!response.ok||Number(response.headers.get('content-length')||0)>MAX_BYTES)
          throw new Error('NETWORK');
        const content=new Uint8Array(await response.arrayBuffer());
        if(controller.signal.aborted)return;
        if(content.byteLength>MAX_BYTES)throw new DocxPreviewError('DOCX_ARCHIVE_LIMIT');
        setStage('analysing');
        // Decompress only the bounded OOXML parts after validating ZIP central directory.
        const report=previewDocx(content);
        if(!controller.signal.aborted){setPreview(report);setStage('done');}
      }catch(e){
        if(controller.signal.aborted)return;
        if(e instanceof DocxPreviewError){
          setError(['DOCX_CORRUPTED','DOCX_INVALID_XML'].includes(e.code)?t.corrupted:t.invalid);
        }else{setError(t.network);}
      }
    };
    void inspect();
    return ()=>controller.abort();
  },[bookId,name,locale,t.invalid,t.corrupted,t.network]);
  async function importReviewed(event:React.FormEvent){
    event.preventDefault();
    if(!editable||!preview||preview.truncated||!approved||!preview.blocks.length||importing)return;
    setImporting(true);setImportError('');setLocked(true);
    if(!operationId.current)operationId.current=crypto.randomUUID();
    try{
      const response=await fetch('/api/v1/books/'+bookId+'/import/docx',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({sourceName:name,operationId:operationId.current,title:chapterTitle,
          confirm:'IMPORT_REVIEWED_DOCX',acknowledged:true,truncated:preview.truncated,
          blocks:preview.blocks.map(({kind,text})=>({kind,text}))})
      });
      const payload=await response.json().catch(()=>({})) as {chapter?:{id:string};error?:string};
      if(!response.ok||!payload.chapter?.id){
        setImportError(payload.error==='DOCX_SOURCE_NOT_FOUND'||payload.error==='DOCX_SOURCE_INVALID'?
          t.sourceUnavailable:payload.error==='DOCX_IMPORT_CONFLICT'||payload.error==='DOCX_OPERATION_CONFLICT'?
          t.importConflict:t.importFailure);
        return;
      }
      router.push('/books/'+bookId+'/chapters/'+payload.chapter.id);router.refresh();
    }catch{setImportError(t.importFailure);}
    finally{setImporting(false);}
  }
  return <div className="modal-backdrop docx-preview-backdrop" onMouseDown={e=>{
    if(e.target===e.currentTarget&&!importing)onClose();
  }}>
    <section className="modal docx-preview-modal" role="dialog" aria-modal="true"
      aria-labelledby="docx-preview-title" aria-describedby="docx-preview-subtitle">
      <button ref={closeRef} type="button" className="close" disabled={importing} aria-label={t.close}
        onClick={onClose}>×</button>
      <span className="eyebrow">DOCX · {t.subtitle}</span>
      <h2 id="docx-preview-title"><AppIcon name="manuscript" size={25}/>{t.title}</h2>
      <p id="docx-preview-subtitle" className="source-note">{name.slice(37)} · {t.intro}</p>
      {error&&<p role="alert" className="form-error">{error}</p>}
      {!error&&!preview&&<p role="status" className="source-note">{stage==='reading'?t.reading:t.analysing}</p>}
      {preview&&<>
        <p className="docx-review-status" role="status"><AppIcon name="shield"/>{t.subtitle}</p>
        <p className="source-note">{t.count.replace('{count}',String(preview.blocks.length))}</p>
        <div className="docx-preview-article">
          {preview.blocks.length===0?<p>{t.empty}</p>:preview.blocks.map((block,index)=>
            block.kind==='heading'?<h3 key={index}>{block.text}</h3>:<p key={index}>{block.text}</p>)}
        </div>
        <div className="docx-review-warnings">
          <h3><AppIcon name="shield"/>{t.warnings}</h3>
          {preview.warnings.length===0?<p>{t.noWarnings}</p>:
            <ul>{preview.warnings.map(w=><li key={w}>{t[w as Warning]??w}</li>)}</ul>}
        </div>
        {editable&&<div className="docx-import-panel">
          <h3><AppIcon name="chapter"/>{t.importTitle}</h3>
          {preview.truncated?<p role="alert" className="form-error">{t.noImportTruncated}</p>:
          preview.blocks.length>0?<form onSubmit={e=>void importReviewed(e)} className="docx-import-form">
            <p className="source-note">{t.acceptedNote}</p>
            <label htmlFor="docx-new-chapter-title">{t.chapterLabel}
              <input id="docx-new-chapter-title" type="text" minLength={2} maxLength={180}
                value={chapterTitle} disabled={importing||locked}
                onChange={e=>setChapterTitle(e.target.value)} required/>
            </label>
            <label className="docx-acknowledge">
              <input type="checkbox" checked={approved} disabled={importing}
                onChange={e=>setApproved(e.target.checked)} required/>
              <span>{t.acknowledge}</span>
            </label>
            {importError&&<p className="form-error" role="alert">{importError}</p>}
            <button type="submit" className="button full"
              disabled={importing||!approved||chapterTitle.trim().length<2}>
              <AppIcon name="check"/>{importing?t.creating:t.createChapter}
            </button>
          </form>:null}
        </div>}
      </>}
    </section>
  </div>;
}
