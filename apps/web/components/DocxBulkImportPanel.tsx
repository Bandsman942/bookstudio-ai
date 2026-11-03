'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import AppIcon from './AppIcon';
import {useAppPreferences} from './AppPreferences';
import {proposeDocxChapters} from '@/lib/docx-chapter-split';
import type {DocxPreview} from '@/lib/docx-preview';

const copy={
 fr:{title:'Créer plusieurs chapitres',intro:'Découpage proposé selon les titres Word. Relisez chaque segment et corrigez les titres avant validation.',introTitle:'Introduction',
   fallback:'Aucun découpage fiable en Titres 1 : tous les titres reconnus ont été utilisés comme séparateurs. Vérifiez attentivement.',
   tooMany:'Plus de dix chapitres proposés : importation en lot indisponible pour éviter des omissions.',
   label:'Titre du chapitre',blocks:'{count} blocs de texte',
   consent:'J’ai revu les chapitres proposés et j’accepte les omissions possibles (images, notes, tableaux, styles et révisions). Le DOCX original restera privé et intact.',
   submit:'Créer {count} chapitres',busy:'Création des chapitres…',
   failure:'Importation non confirmée. Réessayez avec la même opération : aucun doublon ne sera créé.',
   conflict:'Le lot a changé ou une autre création est intervenue : vérifiez avant de réessayer.',
   source:'Source DOCX indisponible ou non conforme.',note:'Création atomique : soit tous les chapitres sont ajoutés, soit aucun. Les chapitres existants restent intacts.'},
 en:{title:'Create multiple chapters',intro:'Proposed split based on Word headings. Review every segment and edit titles before approval.',introTitle:'Introduction',
   fallback:'No reliable Heading 1 split: other recognized headings were used as boundaries. Review carefully.',
   tooMany:'More than ten proposed chapters: bulk import is disabled to prevent omissions.',
   label:'Chapter title',blocks:'{count} text blocks',
   consent:'I have reviewed the proposed chapters and accept possible omissions (images, notes, tables, styles and revisions). The original DOCX remains private and unchanged.',
   submit:'Create {count} chapters',busy:'Creating chapters…',
   failure:'Import not confirmed. Retry with the same operation: no duplicate chapters will be created.',
   conflict:'The batch changed or another import intervened: review before retrying.',
   source:'DOCX source missing or invalid.',note:'Atomic creation: either all chapters are added or none. Existing chapters remain unchanged.'}
} as const;

export default function DocxBulkImportPanel({bookId,name,preview}:{
 bookId:string;name:string;preview:DocxPreview
}){
 const {locale}=useAppPreferences(),t=copy[locale],router=useRouter();
 const proposal=useMemo(()=>proposeDocxChapters(preview,t.introTitle),[preview,t.introTitle]);
 const [titles,setTitles]=useState<string[]>([]);
 const [approved,setApproved]=useState(false);
 const [busy,setBusy]=useState(false),[locked,setLocked]=useState(false);
 const [error,setError]=useState('');
 const batchId=useRef<string|null>(null);
 useEffect(()=>{
   if(proposal.reason==='ok')setTitles(proposal.chapters.map(x=>x.title));
 },[proposal]);
 if(proposal.reason==='no_headings'||proposal.reason==='invalid'||proposal.reason==='truncated')return null;
 if(proposal.reason==='too_many')return <p className="source-note" role="status">{t.tooMany}</p>;
 async function create(event:React.FormEvent){
   event.preventDefault();
   if(proposal.reason!=='ok'||busy||!approved||titles.length!==proposal.chapters.length||
     titles.some(x=>x.trim().length<2))return;
   setBusy(true);setLocked(true);setError('');
   if(!batchId.current)batchId.current=crypto.randomUUID();
   try{
     const response=await fetch('/api/v1/books/'+bookId+'/import/docx/bulk',{
       method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({
         sourceName:name,batchId:batchId.current,
         confirm:'IMPORT_REVIEWED_DOCX_BATCH',acknowledged:true,truncated:false,
         chapters:proposal.chapters.map((chapter,index)=>({
           title:titles[index],blocks:chapter.blocks.map(({kind,text})=>({kind,text}))
         }))
       })
     });
     const data=await response.json().catch(()=>({})) as {chapters?:{id:string}[];error?:string};
     if(!response.ok||data.chapters?.length!==proposal.chapters.length||!data.chapters?.[0]?.id){
       setError(['DOCX_SOURCE_INVALID','DOCX_SOURCE_NOT_FOUND'].includes(data.error??'')?t.source:
         ['DOCX_BATCH_CONFLICT','DOCX_IMPORT_CONFLICT'].includes(data.error??'')?t.conflict:t.failure);
       return;
     }
     router.push('/books/'+bookId+'/chapters/'+data.chapters[0].id);
     router.refresh();
   }catch{setError(t.failure);}
   finally{setBusy(false);}
 }
 return <details className="docx-bulk-panel">
   <summary><AppIcon name="chapter" size={18}/>{t.title}
     <span className="docx-bulk-count">{proposal.chapters.length}</span></summary>
   <form className="docx-import-form" onSubmit={event=>void create(event)}>
     <p className="source-note">{t.intro}</p>
     {proposal.fallbackToHeadings&&<p className="source-note">{t.fallback}</p>}
     <ol className="docx-split-chapters">
       {proposal.chapters.map((chapter,index)=><li key={index}>
         <label htmlFor={'docx-bulk-title-'+index}>{t.label} {index+1}
           <input id={'docx-bulk-title-'+index} type="text" minLength={2} maxLength={180}
             required value={titles[index]??chapter.title} disabled={busy||locked}
             onChange={e=>setTitles(current=>current.map((title,i)=>i===index?e.target.value:title))}/>
         </label>
         <small>{t.blocks.replace('{count}',String(chapter.blocks.length))}</small>
         <p className="docx-chapter-excerpt">{chapter.blocks[0]?.text}</p>
       </li>)}
     </ol>
     <p className="source-note">{t.note}</p>
     <label className="docx-acknowledge">
       <input type="checkbox" required checked={approved} disabled={busy}
         onChange={e=>setApproved(e.target.checked)}/><span>{t.consent}</span>
     </label>
     {error&&<p role="alert" className="form-error">{error}</p>}
     <button type="submit" className="button full" disabled={busy||!approved||
       titles.length!==proposal.chapters.length||titles.some(x=>x.trim().length<2)}>
       <AppIcon name="check"/>{busy?t.busy:t.submit.replace('{count}',String(proposal.chapters.length))}
     </button>
   </form>
 </details>;
}
