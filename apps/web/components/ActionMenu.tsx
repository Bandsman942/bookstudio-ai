'use client';

import {useEffect,useId,useRef,useState} from 'react';
import type {KeyboardEvent} from 'react';

export type ActionMenuItem = {
  label:string;
  href?:string;
  onSelect?:()=>void;
  disabled?:boolean;
  destructive?:boolean;
  separatorBefore?:boolean;
  group?:string;
};

type Props={
  label:string;
  actions:ActionMenuItem[];
  disabled?:boolean;
  className?:string;
};

/** Shared overflow menu for book, chapter, snapshot, comment and account actions. */
export default function ActionMenu({label,actions,disabled=false,className=''}:Props){
  const [open,setOpen]=useState(false);
  const id=useId();
  const rootRef=useRef<HTMLDivElement>(null);
  const triggerRef=useRef<HTMLButtonElement>(null);
  const menuRef=useRef<HTMLDivElement>(null);
  const available=actions.some(item=>!item.disabled);

  useEffect(()=>{
    if(!open)return;
    // Focus an actual action when opened with mouse, touch or keyboard.
    const focusable=menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])');
    focusable?.focus();
    function outside(event:PointerEvent){
      if(rootRef.current&&!rootRef.current.contains(event.target as Node))setOpen(false);
    }
    function focusOutside(event:FocusEvent){
      if(rootRef.current&&!rootRef.current.contains(event.target as Node))setOpen(false);
    }
    document.addEventListener('pointerdown',outside);
    document.addEventListener('focusin',focusOutside);
    return ()=>{
      document.removeEventListener('pointerdown',outside);
      document.removeEventListener('focusin',focusOutside);
    };
  },[open]);

  function close(restoreFocus=false){
    setOpen(false);
    if(restoreFocus)triggerRef.current?.focus();
  }

  function keyboard(event:KeyboardEvent<HTMLDivElement>){
    if(event.key==='Escape'){
      event.preventDefault();event.stopPropagation();close(true);return;
    }
    if(event.key==='Tab'){close();return;}
    if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    event.preventDefault();
    const items=[...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')??[])];
    if(items.length===0)return;
    const current=items.findIndex(item=>item===document.activeElement);
    let next=0;
    if(event.key==='End')next=items.length-1;
    else if(event.key==='ArrowDown')next=(current+1)%items.length;
    else if(event.key==='ArrowUp')next=(current-1+items.length)%items.length;
    items[next]?.focus();
  }

  return <div className={'context-actions '+(open?'is-open ':'')+className} ref={rootRef}>
    <button
      ref={triggerRef}
      type="button"
      className="context-trigger"
      title={label}
      aria-label={label}
      aria-haspopup="menu"
      aria-controls={open?id:undefined}
      aria-expanded={open}
      disabled={disabled||!available}
      onClick={()=>setOpen(value=>!value)}
      onKeyDown={event=>{
        if(event.key==='ArrowDown'||event.key==='ArrowUp'){
          event.preventDefault();setOpen(true);
        } else if(event.key==='Escape'&&open){event.preventDefault();close(true);}
      }}
    >⋯</button>
    {open&&<div id={id} ref={menuRef} className="context-menu" role="menu" aria-label={label} onKeyDown={keyboard}>
      {actions.map((item,index)=><div key={index} role="none">
        {item.separatorBefore&&<div className="context-menu-separator" role="separator"/>}
        {item.group&&<div className="context-menu-group" role="presentation">{item.group}</div>}
        {item.href&&!item.disabled?
          <a role="menuitem" className={'context-menu-item'+(item.destructive?' is-danger':'')}
            href={item.href} onClick={()=>close()} tabIndex={-1}>{item.label}</a>:
          <button role="menuitem" className={'context-menu-item'+(item.destructive?' is-danger':'')}
            type="button" disabled={item.disabled} aria-disabled={item.disabled||undefined}
            tabIndex={item.disabled?-1:-1}
            onClick={()=>{if(item.disabled)return;close();item.onSelect?.();}}>
            {item.label}
          </button>}
      </div>)}
    </div>}
  </div>;
}
