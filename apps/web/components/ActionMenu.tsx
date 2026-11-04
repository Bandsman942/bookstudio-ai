'use client';
import {useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {KeyboardEvent as ReactKeyEvent} from 'react';
export type ActionMenuItem={label:string;href?:string;onSelect?:()=>void|boolean|Promise<void>;disabled?:boolean;destructive?:boolean;separatorBefore?:boolean;group?:string};
type Props={label:string;actions:ActionMenuItem[];disabled?:boolean;className?:string};
type Point={x:number;y:number}|null;
/** Shared accessible ⋯, desktop right-click and Shift+F10 menu. Portal prevents overflow clipping. */
export default function ActionMenu({label,actions,disabled=false,className=''}:Props){
 const [open,setOpen]=useState(false),[point,setPoint]=useState<Point>(null),[position,setPosition]=useState<Point>(null);
 const id=useId(),root=useRef<HTMLDivElement>(null),triggerRef=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null);
 const focusLast=useRef(false),available=actions.some(a=>!a.disabled);
 function close(restore=false){setOpen(false);setPosition(null);if(restore)triggerRef.current?.focus();}
 function show(at:Point=null,last=false){
   if(disabled||!available)return;
   document.dispatchEvent(new Event('bookstudio-context-close'));
   focusLast.current=last;setPoint(at);setPosition(null);setOpen(true);
 }
 useEffect(()=>{
   const other=()=>setOpen(false);
   document.addEventListener('bookstudio-context-close',other);
   return ()=>document.removeEventListener('bookstudio-context-close',other);
 },[]);
 useEffect(()=>{
   if(disabled||!available)return;
   const surface=root.current?.closest<HTMLElement>(
     '[data-context-surface],.chapter-item,.chapter-nav-row,.book-card,.version-row,.archive-item,.comment-card,.studio-topbar,.book-title-actions');
   if(!surface)return;
   const valid=(target:EventTarget|null)=>{
     const element=target instanceof Element?target:null;
     return !!element&&!element.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]');
   };
   const right=(event:MouseEvent)=>{if(!valid(event.target))return;event.preventDefault();event.stopPropagation();show({x:event.clientX,y:event.clientY});};
   const key=(event:globalThis.KeyboardEvent)=>{
     if(!event.shiftKey||event.key!=='F10'||!valid(event.target))return;
     event.preventDefault();event.stopPropagation();show();
   };
   surface.addEventListener('contextmenu',right);surface.addEventListener('keydown',key);
   return ()=>{surface.removeEventListener('contextmenu',right);surface.removeEventListener('keydown',key);};
 },[disabled,available]);
 useLayoutEffect(()=>{
   if(!open||!menu.current)return;
   const box=menu.current.getBoundingClientRect(),button=triggerRef.current?.getBoundingClientRect();
   const vv=window.visualViewport,l=vv?.offsetLeft??0,t=vv?.offsetTop??0;
   const w=vv?.width??window.innerWidth,h=vv?.height??window.innerHeight;
   const desiredX=point?point.x:(button?button.right-box.width:0);
   const desiredY=point?point.y:(button?.bottom??0)+6;
   const x=Math.max(l+8,Math.min(desiredX,l+w-box.width-8));
   const y=desiredY+box.height+8>t+h?
     Math.max(t+8,(point?.y??button?.top??desiredY)-box.height-6):desiredY;
   setPosition({x,y});
   const items=menu.current.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])');
   (focusLast.current?items.item(items.length-1):items.item(0))?.focus();
 },[open,point,actions.length]);
 useEffect(()=>{
   if(!open)return;
   const within=(target:EventTarget|null)=>!!target&&
     (root.current?.contains(target as Node)||menu.current?.contains(target as Node));
   const pointer=(event:PointerEvent)=>{if(!within(event.target))close();};
   const focus=(event:FocusEvent)=>{if(!within(event.target))close();};
   const scroll=(event:Event)=>{if(!menu.current?.contains(event.target as Node))close();};
   const resize=()=>close();
   document.addEventListener('pointerdown',pointer);
   document.addEventListener('focusin',focus);
   document.addEventListener('scroll',scroll,true);
   window.addEventListener('resize',resize);
   return ()=>{document.removeEventListener('pointerdown',pointer);document.removeEventListener('focusin',focus);
     document.removeEventListener('scroll',scroll,true);window.removeEventListener('resize',resize);};
 },[open]);
 function onKey(event:ReactKeyEvent<HTMLDivElement>){
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);return;}
   if(event.key==='Tab'){close();return;}
   if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
   event.preventDefault();
   const items=[...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')??[])];
   if(!items.length)return;const current=items.findIndex(e=>e===document.activeElement);
   const next=event.key==='Home'?0:event.key==='End'?items.length-1:
     event.key==='ArrowDown'?(current+1)%items.length:(current-1+items.length)%items.length;
   items[next]?.focus();
 }
 return <>
   <div className={'context-actions '+(open?'is-open ':'')+className} ref={root}>
     <button ref={triggerRef} type="button" className="context-trigger"
       title={label} aria-label={label} aria-haspopup="menu" aria-controls={open?id:undefined}
       aria-expanded={open} disabled={disabled||!available}
       onClick={()=>open?close(true):show()}
       onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){
         event.preventDefault();show(null,event.key==='ArrowUp');
       }else if(event.key==='Escape'&&open){event.preventDefault();close(true);}}}>⋯</button>
   </div>
   {open&&typeof document!=='undefined'&&createPortal(
     <div id={id} ref={menu} className="context-menu context-menu-portal"
       role="menu" aria-label={label} onKeyDown={onKey}
       style={{position:'fixed',left:position?.x??0,top:position?.y??0,
         visibility:position?'visible':'hidden',zIndex:2000}}>
       {actions.map((a,i)=><div role="none" key={i}>
         {a.separatorBefore&&<div className="context-menu-separator" role="separator"/>}
         {a.group&&<div className="context-menu-group" role="presentation">{a.group}</div>}
         {a.href&&!a.disabled?
           <a role="menuitem" className={'context-menu-item'+(a.destructive?' is-danger':'')}
             href={a.href} onClick={event=>{if(a.onSelect?.()===false){event.preventDefault();return;}close();}} tabIndex={-1}>{a.label}</a>:
           <button role="menuitem" className={'context-menu-item'+(a.destructive?' is-danger':'')}
             type="button" disabled={a.disabled} aria-disabled={a.disabled||undefined}
             tabIndex={-1} onClick={()=>{if(a.disabled)return;close();a.onSelect?.();}}>{a.label}</button>}
       </div>)}
     </div>,document.body)}
 </>;
}
