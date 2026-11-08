'use client';
import {useEffect,useRef,useState} from 'react';
import {useAppPreferences} from './AppPreferences';
import {useToast} from './ToastProvider';

type Edition={id:string;number:number};
type Pair={from:{id:string;title:string;position:number};
  to:{id:string;title:string;position:number};
  matchedBy:string;titleChanged:boolean;contentChanged:boolean;positionChanged:boolean};
type Single={id:string;title:string;position:number};
type Comparison={counts:{from:number;to:number;unchanged:number;changed:number;
  renamed:number;contentChanged:number;moved:number;added:number;removed:number};
  pairs:Pair[];added:Single[];removed:Single[];limitations:string};
type Result={fromEdition:Edition;toEdition:Edition;comparison:Comparison};

export default function BookEditionCompare({bookId,editions}:{
  bookId:string;editions:Edition[]
}){
 const {locale}=useAppPreferences(),{notify}=useToast();
 const fr=locale==='fr';
 const [from,setFrom]=useState(editions[1]?.id??'');
 const [to,setTo]=useState(editions[0]?.id??'');
 const [result,setResult]=useState<Result|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const abort=useRef<AbortController|null>(null);
 useEffect(()=>()=>abort.current?.abort(),[]);
 function changed(set:(s:string)=>void,value:string){
   abort.current?.abort();setBusy(false);setResult(null);setError('');set(value);
 }
 async function compare(){
   if(!from||!to||from===to||busy)return;
   abort.current?.abort();
   const controller=new AbortController();abort.current=controller;
   setBusy(true);setError('');setResult(null);
   const url='/api/v1/books/'+bookId+'/editions/compare?'+
     new URLSearchParams({from,to}).toString();
   try{
     const response=await fetch(url,{cache:'no-store',signal:controller.signal});
     const data=await response.json().catch(()=>null) as Result|null;
     if(!response.ok||!data?.comparison){
       const detail=response.status===422?
         (fr?'La comparaison directe dépasse la limite de 350 chapitres par édition. Les éditions restent intactes.':
           'This comparison exceeds 350 chapters per edition. Both editions are unchanged.'):
         response.status===404?
         (fr?'Cette édition est introuvable ou vous n’êtes pas autorisé à la consulter.':
           'This edition cannot be found or you are not authorized to view it.'):
         (fr?'La comparaison n’a pas pu être chargée. Vérifiez votre connexion et réessayez.':
           'The comparison could not be loaded. Check your connection and retry.');
       throw Error(detail);
     }
     if(!controller.signal.aborted)setResult(data);
   }catch(e){
     if(controller.signal.aborted)return;
     const detail=e instanceof Error?e.message:
       (fr?'Impossible de comparer ces deux éditions. Réessayez.':
         'Unable to compare these editions. Please retry.');
     const msg=detail==='Failed to fetch'?
       (fr?'Connexion interrompue pendant la comparaison. Réessayez.':
         'Network interrupted during comparison. Please retry.'):detail;
     setError(msg);
     notify({tone:'error',title:fr?'Comparaison non disponible':'Comparison unavailable',detail:msg});
   }finally{if(!controller.signal.aborted)setBusy(false);}
 }
 const c=result?.comparison.counts;
 const label=(p:Pair)=>[
   p.titleChanged?(fr?'Titre changé':'Title changed'):null,
   p.contentChanged?(fr?'Contenu enregistré modifié':'Saved content changed'):null,
   p.positionChanged?(fr?'Position changée':'Position changed'):null
 ].filter(Boolean).join(' · ');
 return <section className="edition-comparison" id="book-edition-compare"
   aria-label={fr?'Comparer deux éditions':'Compare two editions'}>
   <h3>{fr?'Comparer les éditions':'Compare editions'}</h3>
   <p className="source-note">{fr?
     'Comparez les titres, l’ordre et les empreintes des dernières révisions sauvegardées. Aucun manuscrit n’est modifié.':
     'Compare titles, order and latest saved revision fingerprints. No manuscript is modified.'}</p>
   <form className="edition-comparison-controls" onSubmit={event=>{
     event.preventDefault();void compare();
   }}>
     <label>{fr?'Depuis l’édition':'From edition'}
       <select value={from} disabled={busy} onChange={e=>changed(setFrom,e.target.value)}>
         {editions.map(e=><option key={e.id} value={e.id}>
           {fr?'Édition ':'Edition '}{e.number}
         </option>)}
       </select>
     </label>
     <label>{fr?'Vers l’édition':'To edition'}
       <select value={to} disabled={busy} onChange={e=>changed(setTo,e.target.value)}>
         {editions.map(e=><option key={e.id} value={e.id}>
           {fr?'Édition ':'Edition '}{e.number}
         </option>)}
       </select>
     </label>
     <button className="button" type="submit" disabled={busy||!from||!to||from===to}>
       {busy?(fr?'Comparaison…':'Comparing…'):(fr?'Comparer':'Compare')}
     </button>
   </form>
   {from===to&&<p className="source-note" role="status">
     {fr?'Choisissez deux éditions différentes.':'Choose two different editions.'}
   </p>}
   {error&&<p className="form-error" role="alert">{error}</p>}
   {c&&result&&<div className="edition-comparison-results" aria-live="polite">
     <h4>{fr?'Comparaison : édition ':'Comparison: edition '}
       {result.fromEdition.number} → {result.toEdition.number}</h4>
     <div className="edition-comparison-stats">
       {[
         [c.unchanged,fr?'Sans différence détectée':'No difference detected'],
         [c.changed,fr?'Correspondances modifiées':'Changed matches'],
         [c.added,fr?'Nouveaux chapitres':'Added chapters'],
         [c.removed,fr?'Chapitres absents':'Removed chapters']
       ].map(([num,label])=><div key={String(label)}>
         <strong>{num}</strong><span>{label}</span></div>)}
     </div>
     {c.changed===0&&c.added===0&&c.removed===0&&<p role="status">
       {fr?'Aucune différence détectée dans la structure ni les empreintes enregistrées.':
         'No differences detected in structure or saved content fingerprints.'}
     </p>}
     {result.comparison.pairs.length>0&&<div className="edition-comparison-changes">
       <h5>{fr?'Chapitres rapprochés avec changements':'Matched chapters with changes'}</h5>
       {result.comparison.pairs.map(pair=><div key={pair.from.id+'-'+pair.to.id}>
         <strong>{pair.from.title} → {pair.to.title}</strong>
         <span>{label(pair)}</span>
       </div>)}
     </div>}
     {result.comparison.added.length>0&&<div className="edition-comparison-changes">
       <h5>{fr?'Chapitres présents seulement dans l’édition d’arrivée':
         'Chapters only in the target edition'}</h5>
       {result.comparison.added.map(ch=><div key={ch.id}>
         <strong>{ch.title}</strong><span>+ {ch.position+1}</span></div>)}
     </div>}
     {result.comparison.removed.length>0&&<div className="edition-comparison-changes">
       <h5>{fr?'Chapitres présents seulement dans l’édition de départ':
         'Chapters only in the starting edition'}</h5>
       {result.comparison.removed.map(ch=><div key={ch.id}>
         <strong>{ch.title}</strong><span>− {ch.position+1}</span></div>)}
     </div>}
     <p className="source-note">{fr?
       'Méthode prudente : association par même emplacement/texte/titre, puis empreinte ou titre uniques. Une suppression et un ajout peuvent aussi représenter un chapitre renommé ET réécrit ; sans lien fiable, l’application n’invente pas de correspondance. Les empreintes ne mesurent pas la qualité rédactionnelle.':
       'Conservative matching uses exact slot/title/content, then unique fingerprints or titles. A removal plus an addition may reflect a renamed AND rewritten chapter; without trustworthy lineage, no relationship is invented. Fingerprints do not assess writing quality.'}</p>
   </div>}
 </section>;
}
