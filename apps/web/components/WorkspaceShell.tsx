'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {useAppPreferences} from './AppPreferences';

/** Single mobile drawer for the CENTRAL workspace surfaces. Keeps exactly the
 * same sidebar DOM/navigation (including chapter ⋯ actions) as desktop.
 * Never clones private content or recreates a secondary navigation source. */
export default function WorkspaceShell({sidebar,children}:{
 sidebar:ReactNode;children:ReactNode
}){
 const {locale}=useAppPreferences();
 const pathname=usePathname();
 const [open,setOpen]=useState(false);
 const closeRef=useRef<HTMLButtonElement>(null);
 const triggerRef=useRef<HTMLButtonElement>(null);
 const drawerRef=useRef<HTMLDivElement>(null);
 const openRef=useRef(false);
 useEffect(()=>{setOpen(false);},[pathname]);
 useEffect(()=>{
   const mobile=window.matchMedia('(max-width: 900px)');
   const closeOnDesktop=()=>{if(!mobile.matches)setOpen(false);};
   closeOnDesktop();
   mobile.addEventListener('change',closeOnDesktop);
   return ()=>mobile.removeEventListener('change',closeOnDesktop);
 },[]);

 useEffect(()=>{
   if(!open){
     if(openRef.current)triggerRef.current?.focus();
     openRef.current=false;return;
   }
   openRef.current=true;
   closeRef.current?.focus();
   const original=document.body.style.overflow;
   document.body.style.overflow='hidden';
   const onKey=(event:KeyboardEvent)=>{
     // A context-menu dialog rendered into document.body has its OWN focus
     // management. Never steal Tab or Escape from a nested modal.
     if(document.querySelector('[role="dialog"][aria-modal="true"]:not(#workspace-mobile-drawer)'))
       return;
     if(event.key==='Escape'){event.preventDefault();setOpen(false);return;}
     if(event.key!=='Tab')return;
     const nodes=[...(drawerRef.current?.querySelectorAll<HTMLElement>(
       'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]'
     )??[])].filter(node=>node.getClientRects().length>0);
     const first=nodes[0],last=nodes[nodes.length-1];
     if(!first||!last)return;
     if(event.shiftKey&&document.activeElement===first){
       event.preventDefault();last.focus();
     }else if(!event.shiftKey&&document.activeElement===last){
       event.preventDefault();first.focus();
     }else if(!drawerRef.current?.contains(document.activeElement)){
       event.preventDefault();first.focus();
     }
   };
   document.addEventListener('keydown',onKey);
   return ()=>{document.body.style.overflow=original;
     document.removeEventListener('keydown',onKey);};
 },[open]);
 return <div className={'workspace mobile-workspace'+
    (open?' mobile-workspace-open':'')}>
   {open&&<button className="workspace-mobile-backdrop" type="button"
     aria-label={locale==='fr'?'Fermer le menu de navigation':'Close navigation menu'}
     onClick={()=>setOpen(false)}/>}
   <div className="workspace-drawer-host" id="workspace-mobile-drawer"
     ref={drawerRef} role={open?'dialog':undefined}
     aria-modal={open?true:undefined}
     aria-label={open?(locale==='fr'?'Navigation de l’espace de travail':
       'Workspace navigation'):undefined}
     onClickCapture={event=>{
       const target=event.target;
       if(target instanceof Element&&target.closest('a[href]'))setOpen(false);
     }}>
     <button className="workspace-drawer-close" type="button" ref={closeRef}
       aria-label={locale==='fr'?'Fermer le menu':'Close menu'}
       onClick={()=>setOpen(false)}>×</button>
     {sidebar}
   </div>
   <button className="workspace-mobile-toggle" type="button" ref={triggerRef}
     aria-label={locale==='fr'?'Afficher les options à gauche':
       'Show left navigation options'}
     aria-controls="workspace-mobile-drawer" aria-expanded={open}
     onClick={()=>setOpen(v=>!v)}>
     <span aria-hidden="true" className="workspace-hamburger">
       <i/><i/><i/>
     </span>
   </button>
   {children}
 </div>;
}
