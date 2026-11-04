'use client';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useAppPreferences} from './AppPreferences';
export default function ShortcutsHelp(){
 const {locale}=useAppPreferences(),[open,setOpen]=useState(false);
 useEffect(()=>{
   const show=()=>setOpen(true);const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};
   document.addEventListener('bookstudio-shortcuts-open',show);
   document.addEventListener('keydown',close);
   return ()=>{document.removeEventListener('bookstudio-shortcuts-open',show);document.removeEventListener('keydown',close);};
 },[]);
 if(!open)return null;
 const fr=locale==='fr';
 const shortcuts=[
   ['Ctrl/Cmd + S',fr?'Enregistrer le brouillon actuel':'Save current draft'],
   ['Ctrl/Cmd + Shift + O',fr?'Vue d’ensemble du livre':'Book overview'],
   ['Ctrl/Cmd + Shift + K',fr?'Recherche dans les manuscrits':'Search manuscripts'],
   ['Ctrl/Cmd + Shift + N',fr?'Créer un chapitre (vue d’ensemble, droits requis)':'New chapter (overview, if permitted)'],
   ['Alt + Shift + M',fr?'Ouvrir les chapitres sur mobile':'Open mobile chapters'],
   ['Alt + Shift + ↑ / ↓',fr?'Chapitre précédent / suivant':'Previous / next chapter'],
   ['Shift + F10',fr?'Actions contextuelles de l’élément sélectionné':'Selected item context menu'],
   ['?',fr?'Afficher cette aide hors zone de saisie':'Show help outside text input'],
   ['Échap / Escape',fr?'Fermer un menu ou une fenêtre':'Close menu or dialog']
 ];
 return typeof document==='undefined'?null:createPortal(<div className="modal-backdrop" style={{zIndex:2200}} onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false);}}>
   <div className="modal shortcuts-modal" role="dialog" aria-modal="true"
     aria-label={fr?'Raccourcis clavier':'Keyboard shortcuts'}>
     <button type="button" className="close" aria-label={fr?'Fermer':'Close'} onClick={()=>setOpen(false)}>×</button>
     <div className="eyebrow">{fr?'PRODUCTIVITÉ':'PRODUCTIVITY'}</div>
     <h2>{fr?'Raccourcis clavier':'Keyboard shortcuts'}</h2>
     <p>{fr?'Les commandes de saisie natives restent disponibles. Les actions dangereuses nécessitent confirmation.':
       'Native editing shortcuts remain available. Destructive actions require confirmation.'}</p>
     <dl className="shortcuts-list">{shortcuts.map(([key,label])=><div key={key}><dt><kbd>{key}</kbd></dt><dd>{label}</dd></div>)}</dl>
     <button className="button small" onClick={()=>setOpen(false)}>{fr?'Compris':'Got it'}</button>
   </div>
 </div>,document.body);
}
