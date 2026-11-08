'use client';
import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {transitionAllowed,type BookStatus} from '@bookstudio/domain';
import {useAppPreferences} from './AppPreferences';
import {useToast} from './ToastProvider';
import {explainActionError} from '@/lib/notification-copy';
import type {MessageKey} from '@/lib/i18n';

type Mode='properties'|'status';
type Props={mode:Mode;bookId:string;title:string;bookType:string;language:string;
  status:string;updatedAt:string;onClose:()=>void};
const bookTypes:{value:string;key:MessageKey}[]=[
 {value:'GENERAL',key:'library.kindGeneral'},
 {value:'NOVEL',key:'library.kindNovel'},
 {value:'ESSAY',key:'library.kindEssay'},
 {value:'SCIENCE',key:'library.kindScience'},
 {value:'MEDICINE',key:'library.kindMedicine'},
 {value:'EDUCATION',key:'library.kindEducation'}
];
const stages:BookStatus[]=['DRAFT','WRITING','REVIEW','APPROVED','PRODUCTION','PUBLISHED'];
const stageNames:Record<string,{fr:string;en:string}>={
 DRAFT:{fr:'Brouillon',en:'Draft'},WRITING:{fr:'En rédaction',en:'Writing'},
 REVIEW:{fr:'En relecture',en:'In review'},APPROVED:{fr:'Approuvé',en:'Approved'},
 PRODUCTION:{fr:'En production éditoriale',en:'Editorial production'},
 PUBLISHED:{fr:'Publié (statut déclaré)',en:'Published (manually declared)'}
};

export default function BookPropertiesDialog({
  mode,bookId,title,bookType,language,status,updatedAt,onClose
}:Props){
 const {locale,t}=useAppPreferences(),{notify}=useToast(),router=useRouter();
 const [kind,setKind]=useState(bookType),[lang,setLang]=useState(language==='en'?'en':'fr');
 const targets=useMemo(()=>stages.filter(s=>transitionAllowed(status as BookStatus,s)),[status]);
 const [next,setNext]=useState<string>(targets[0]??'');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
   const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!busy)onClose();};
   document.addEventListener('keydown',onKey);
   return ()=>document.removeEventListener('keydown',onKey);
 },[busy,onClose]);
 async function submit(event:React.FormEvent){
   event.preventDefault();if(busy||(mode==='status'&&!next))return;
   setBusy(true);setError('');
   try{
     const response=await fetch('/api/v1/books/'+bookId,{
       method:'PATCH',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({action:mode,expectedUpdatedAt:updatedAt,
         ...(mode==='properties'?{bookType:kind,language:lang}:{status:next})})
     });
     const result=await response.json().catch(()=>({})) as {error?:string};
     if(!response.ok){
       const detail=explainActionError({locale,operation:mode==='properties'?
         'book-properties':'book-status',status:response.status,code:result.error});
       setError(detail);
       notify({tone:response.status===409?'warning':'error',title:locale==='fr'?
         'Modification de l’ouvrage refusée':'Book update refused',detail});return;
     }
     notify({tone:'success',title:locale==='fr'?
       (mode==='properties'?'Propriétés actualisées':'Statut éditorial actualisé'):
       (mode==='properties'?'Book properties updated':'Editorial status updated'),
       detail:locale==='fr'?'« '+title+' » : '+(mode==='properties'?
         'type et langue de référence enregistrés, sans traduction du texte.':
         'le nouveau statut décrit votre progression, sans publier automatiquement le livre.'):
         '“'+title+'”: '+(mode==='properties'?
           'type and reference language saved without translating content.':
           'status now reflects progress; no automatic publication occurred.')});
     onClose();router.refresh();
   }catch{
     const detail=explainActionError({locale,operation:mode==='properties'?
       'book-properties':'book-status',status:0});
     setError(detail);
     notify({tone:'error',title:locale==='fr'?'Modification interrompue':'Update interrupted',detail});
   }finally{setBusy(false);}
 }
 return <div className="modal-backdrop book-actions-overlay"
   onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)onClose();}}>
   <form className="modal" role="dialog" aria-modal="true"
     aria-label={mode==='properties'?(locale==='fr'?'Propriétés du livre':'Book properties'):
       (locale==='fr'?'Statut éditorial du livre':'Book editorial status')}
     onSubmit={submit}>
     <button type="button" className="close" disabled={busy} aria-label={t('common.close')}
       onClick={onClose}>×</button>
     <div className="eyebrow">{locale==='fr'?'Gestion de l’ouvrage':'Book management'}</div>
     <h2>{mode==='properties'?(locale==='fr'?'Modifier les propriétés':'Edit book properties'):
       (locale==='fr'?'Progression éditoriale':'Editorial progress')}</h2>
     <p><strong>{title}</strong></p>
     {mode==='properties'?<>
       <label>{t('library.kind')}
         <select autoFocus value={kind} onChange={event=>setKind(event.target.value)} disabled={busy}>
           {bookTypes.map(option=><option key={option.value} value={option.value}>{t(option.key)}</option>)}
         </select>
       </label>
       <label>{t('library.manuscriptLanguage')}
         <select value={lang} onChange={event=>setLang(event.target.value)} disabled={busy}>
           <option value="fr">{t('prefs.fr')}</option><option value="en">{t('prefs.en')}</option>
         </select>
       </label>
       <p className="muted">{locale==='fr'?
         'Ces métadonnées décrivent le livre. Le texte et la langue de ses éditions ne sont pas modifiés ni traduits.':
         'These fields describe the book. Its content and edition languages are not changed or translated.'}</p>
     </>:<>
       <p>{locale==='fr'?'Étape actuelle : ':'Current milestone: '}
         <strong>{stageNames[status]?.[locale]??status}</strong></p>
       {targets.length?<label>{locale==='fr'?'Prochaine étape autorisée':'Allowed next milestone'}
         <select autoFocus value={next} onChange={event=>setNext(event.target.value)} disabled={busy}>
           {targets.map(value=><option key={value} value={value}>{stageNames[value]?.[locale]??value}</option>)}
         </select>
       </label>:<p role="status">{locale==='fr'?
         'Aucune autre transition éditoriale n’est disponible. L’archivage s’effectue séparément.':
         'No further editorial transition is available. Archiving is a separate action.'}</p>}
       <p className="muted">{locale==='fr'?
         'Statut de suivi manuel uniquement : cette action n’exporte ni ne publie votre ouvrage.':
         'Manual tracking only: this does not export or publish your book.'}</p>
     </>}
     {error&&<p className="form-error" role="alert">{error}</p>}
     <button type="submit" className="button full" disabled={busy||(mode==='status'&&!targets.length)}>
       {busy?(locale==='fr'?'Enregistrement…':'Saving…'):
         (locale==='fr'?'Enregistrer les modifications':'Save changes')}
     </button>
     <button className="text-button" type="button" onClick={onClose} disabled={busy}>
       {t('common.cancel')}
     </button>
   </form>
 </div>;
}
