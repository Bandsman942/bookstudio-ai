'use client';
import {useEffect,useRef,useState} from 'react';
import AppIcon from './AppIcon';
import DocxCompleteImportPanel from './DocxCompleteImportPanel';
import {useAppPreferences} from './AppPreferences';
import {previewDocx,type DocxPreview,DocxPreviewError} from '@/lib/docx-preview';

const MAX_BYTES=20*1024*1024;
const PREVIEW_PAGE_SIZE=24;
const copy={
 fr:{
  title:'Prévisualisation complète du manuscrit DOCX',
  reading:'Lecture du fichier privé directement depuis Supabase…',
  analysing:'Analyse de tous les paragraphes Word lisibles…',
  subtitle:'Aperçu à réviser — fidélité Word non vérifiée',
  intro:'Le fichier original est conservé. Le texte est analysé dans votre navigateur sans envoi vers l’IA.',
  close:'Fermer',goImport:'Aller à la création des chapitres',empty:'Aucun paragraphe simple détecté.',
  invalid:'Ce DOCX dépasse les limites de sécurité de l’archive ou contient des éléments suspects. Aucune portion n’est masquée : analyse refusée.',
  corrupted:'Ce DOCX paraît corrompu ou contient du XML invalide.',
  network:'Connexion au stockage interrompue ou lien expiré. Rouvrez ce fichier.',
  warnings:'Éléments nécessitant une revue humaine',
  count:'{count} blocs de texte disponibles sur {chars} caractères. La pagination concerne uniquement l’affichage.',
  page:'Page {page} sur {pages}',previous:'Précédent',next:'Suivant',
  noWarnings:'Aucune omission identifiée par les contrôles de base. La fidélité Word n’est pas certifiée.',
  'IMAGES_PRESENT':'Images présentes : non restituées dans le texte.',
  'NOTES_PRESENT':'Notes de bas de page ou de fin présentes : non restituées.',
  'TABLES_NOT_RENDERED':'Tableaux présents : non restitués.',
  'TRACKED_CHANGES_PRESENT':'Modifications suivies présentes : vérifier dans Word.',
  'FIELDS_NOT_EVALUATED':'Champs dynamiques présents : non évalués.',
  'DRAWINGS_NOT_RENDERED':'Dessins et formes présents : non restitués.',
  'EXTERNAL_LINKS_PRESENT':'Liens externes présents : jamais chargés.',
  'LONG_PARAGRAPH_SEGMENTED':'Certains longs paragraphes sont divisés en blocs consécutifs : le texte n’a pas été coupé.',
  'NO_SIMPLE_TEXT_FOUND':'Aucun paragraphe simple à présenter.'
 },
 en:{
  title:'Full DOCX manuscript preview',reading:'Reading the private file directly from Supabase…',
  analysing:'Analyzing all readable Word paragraphs…',
  subtitle:'Review required — Word fidelity not verified',
  intro:'The original file remains stored. Text is analyzed in your browser, not sent to AI.',
  close:'Close',goImport:'Go to chapter creation',empty:'No simple paragraphs found.',
  invalid:'This DOCX exceeds archive safety limits or contains unsafe elements. No partial preview is shown.',
  corrupted:'The DOCX appears corrupt or contains invalid XML.',
  network:'Storage connection failed or signed link expired. Reopen this file.',
  warnings:'Content needing human review',
  count:'{count} text blocks available, {chars} characters. Pagination only affects rendering.',
  page:'Page {page} of {pages}',previous:'Previous',next:'Next',
  noWarnings:'No omissions detected by basic checks. Word fidelity is not certified.',
  'IMAGES_PRESENT':'Images present: not rendered in text.',
  'NOTES_PRESENT':'Footnotes or endnotes present: not rendered.',
  'TABLES_NOT_RENDERED':'Tables present: not rendered.',
  'TRACKED_CHANGES_PRESENT':'Tracked changes present: review in Word.',
  'FIELDS_NOT_EVALUATED':'Dynamic fields present: not evaluated.',
  'DRAWINGS_NOT_RENDERED':'Drawings present: not rendered.',
  'EXTERNAL_LINKS_PRESENT':'External links present: never followed.',
  'LONG_PARAGRAPH_SEGMENTED':'Some long paragraphs were divided into consecutive blocks without losing text.',
  'NO_SIMPLE_TEXT_FOUND':'No simple text paragraph found.'
 }
} as const;
type Warning=keyof typeof copy.fr;
const fmt=(s:string,data:Record<string,number>)=>s.replace(/\{(\w+)\}/g,(_,key:string)=>String(data[key]??0));
export default function DocxPreviewDialog({bookId,name,onClose,editable}:{
 bookId:string;name:string;onClose:()=>void;editable:boolean
}){
 const {locale}=useAppPreferences(),t=copy[locale];
 const [stage,setStage]=useState<'reading'|'analysing'>('reading');
 const [preview,setPreview]=useState<DocxPreview|null>(null),[error,setError]=useState('');
 const [page,setPage]=useState(0),[importBusy,setImportBusy]=useState(false);
 const closeRef=useRef<HTMLButtonElement>(null),articleRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{closeRef.current?.focus();},[]);
 useEffect(()=>{
   const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!importBusy)onClose();};
   document.addEventListener('keydown',key);
   return ()=>document.removeEventListener('keydown',key);
 },[importBusy,onClose]);
 useEffect(()=>{
   const controller=new AbortController();
   async function inspect(){
     try{
       const signed=await fetch('/api/v1/books/'+bookId+'/files',{
         method:'POST',headers:{'Content-Type':'application/json'},
         body:JSON.stringify({action:'download',name}),signal:controller.signal
       });
       if(!signed.ok)throw Error('NETWORK');
       const ticket=await signed.json() as {url?:string};
       if(typeof ticket.url!=='string')throw Error('NETWORK');
       const url=new URL(ticket.url);
       if(url.protocol!=='https:'||url.username||url.password||
          !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname)||
          !url.pathname.startsWith('/storage/v1/object/sign/')||
          !url.searchParams.has('token'))throw Error('NETWORK');
       const response=await fetch(url.toString(),{method:'GET',cache:'no-store',signal:controller.signal});
       if(!response.ok||Number(response.headers.get('content-length')||0)>MAX_BYTES)throw Error('NETWORK');
       const bytes=new Uint8Array(await response.arrayBuffer());
       if(controller.signal.aborted)return;
       if(bytes.byteLength>MAX_BYTES)throw new DocxPreviewError('DOCX_ARCHIVE_LIMIT');
       setStage('analysing');
       await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
       if(controller.signal.aborted)return;
       const report=previewDocx(bytes);
       if(!controller.signal.aborted){setPreview(report);setPage(0);}
     }catch(e){
       if(controller.signal.aborted)return;
       setError(e instanceof DocxPreviewError?
         ['DOCX_CORRUPTED','DOCX_INVALID_XML'].includes(e.code)?t.corrupted:t.invalid:t.network);
     }
   }
   void inspect();
   return ()=>controller.abort();
 },[bookId,name,t.corrupted,t.invalid,t.network]);
 const pages=Math.max(1,Math.ceil((preview?.blocks.length??0)/PREVIEW_PAGE_SIZE));
 const visible=preview?.blocks.slice(page*PREVIEW_PAGE_SIZE,(page+1)*PREVIEW_PAGE_SIZE)??[];
 function jump(to:number){setPage(Math.max(0,Math.min(pages-1,to)));articleRef.current?.scrollTo({top:0});}
 return <div className="modal-backdrop docx-preview-backdrop" onMouseDown={e=>{
   if(e.target===e.currentTarget&&!importBusy)onClose();
 }}>
   <section className="modal docx-preview-modal" role="dialog" aria-modal="true"
     aria-labelledby="docx-preview-title" aria-describedby="docx-preview-subtitle">
     <button ref={closeRef} className="close" type="button" disabled={importBusy}
       aria-label={t.close} onClick={onClose}>×</button>
     <span className="eyebrow">DOCX · {t.subtitle}</span>
     <h2 id="docx-preview-title"><AppIcon name="manuscript" size={25}/>{t.title}</h2>
     <p id="docx-preview-subtitle" className="source-note">{name.slice(37)} · {t.intro}</p>
     {error&&<p role="alert" className="form-error">{error}</p>}
     {!error&&!preview&&<p role="status" className="source-note">
       {stage==='reading'?t.reading:t.analysing}</p>}
     {preview&&<>
       <p className="docx-review-status" role="status"><AppIcon name="shield"/>{t.subtitle}</p>
       <p className="source-note">{fmt(t.count,{
         count:preview.blocks.length,chars:preview.blocks.reduce((n,b)=>n+b.text.length,0)})}</p>
       {editable&&preview.blocks.length>0&&<a href="#docx-complete-title" className="docx-jump-import"><AppIcon name="chapter" size={17}/>{t.goImport}</a>}
       <div className="docx-preview-article" ref={articleRef}>
         {!preview.blocks.length?<p>{t.empty}</p>:
           visible.map((block,i)=>block.kind==='heading'?
             <h3 key={page*PREVIEW_PAGE_SIZE+i}>{block.text}</h3>:
             <p key={page*PREVIEW_PAGE_SIZE+i}>{block.text}</p>)}
       </div>
       {pages>1&&<div className="docx-page-actions" role="group" aria-label={t.page}>
         <button className="text-button" type="button" disabled={page===0}
           onClick={()=>jump(page-1)}>{t.previous}</button>
         <span role="status">{fmt(t.page,{page:page+1,pages})}</span>
         <button className="text-button" type="button" disabled={page===pages-1}
           onClick={()=>jump(page+1)}>{t.next}</button>
       </div>}
       <div className="docx-review-warnings">
         <h3><AppIcon name="shield"/>{t.warnings}</h3>
         {!preview.warnings.length?<p>{t.noWarnings}</p>:
           <ul>{preview.warnings.map(w=><li key={w}>{t[w as Warning]??w}</li>)}</ul>}
       </div>
       {editable&&preview.blocks.length>0&&
         <DocxCompleteImportPanel bookId={bookId} name={name} preview={preview}
           onBusyChange={setImportBusy}/>}
     </>}
   </section>
 </div>;
}
