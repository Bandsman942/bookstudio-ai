'use client';

import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {useAppPreferences} from './AppPreferences';
import AppIcon from './AppIcon';

export type ToastTone='success'|'error'|'warning'|'info';
export type ToastRequest={
  tone:ToastTone;
  title:string;
  detail:string;
  key?:string;
  durationMs?:number;
};
type ToastItem=ToastRequest&{id:number};
type Notifier={notify:(request:ToastRequest)=>number;dismiss:(id:number)=>void;clear:()=>void};
const Context=createContext<Notifier|null>(null);
const MAX_VISIBLE=3;
const defaultDuration:Record<ToastTone,number>={
  success:6500,info:7500,warning:9500,error:0
};
const iconName:Record<ToastTone,'check'|'shield'|'warning'|'info'>={
  success:'check',error:'warning',warning:'shield',info:'info'
};

/** All modules share one accessible notification queue; no portal/network dependency. */
export function ToastProvider({children}:{children:ReactNode}){
  const {locale}=useAppPreferences();
  const [items,setItems]=useState<ToastItem[]>([]);
  const itemsRef=useRef<ToastItem[]>([]);
  const seq=useRef(0);
  const timers=useRef(new Map<number,ReturnType<typeof setTimeout>>());
  const dismiss=useCallback((id:number)=>{
    const timer=timers.current.get(id);
    if(timer){clearTimeout(timer);timers.current.delete(id);}
    const next=itemsRef.current.filter(item=>item.id!==id);
    itemsRef.current=next;setItems(next);
  },[]);
  const clear=useCallback(()=>{
    for(const timer of timers.current.values())clearTimeout(timer);
    timers.current.clear();itemsRef.current=[];setItems([]);
  },[]);
  useEffect(()=>()=>{for(const timer of timers.current.values())clearTimeout(timer);timers.current.clear();},[]);
  const notify=useCallback((request:ToastRequest)=>{
    // Do not turn raw server responses or empty messages into notifications.
    const title=request.title.trim().slice(0,180);
    const detail=request.detail.trim().slice(0,500);
    if(!title||!detail)return -1;
    const id=++seq.current;
    const key=request.key??request.tone+'|'+title+'|'+detail;
    const tone=request.tone;
    // Use a ref as the synchronous source of truth for rapid events, avoiding
    // side effects inside React state updaters (which StrictMode may replay).
    const previous=itemsRef.current;
    const next=[...previous.filter(item=>item.key!==key),
      {...request,id,title,detail,key}].slice(-MAX_VISIBLE);
    for(const item of previous){
      if(!next.some(visible=>visible.id===item.id)){
        const timer=timers.current.get(item.id);
        if(timer){clearTimeout(timer);timers.current.delete(item.id);}
      }
    }
    itemsRef.current=next;setItems(next);
    const ms=request.durationMs===undefined?defaultDuration[tone]:
      Math.max(0,Math.min(30000,request.durationMs));
    if(ms>0)timers.current.set(id,setTimeout(()=>dismiss(id),ms));
    return id;
  },[dismiss]);
  const labels=locale==='fr'?{close:'Fermer la notification',area:'Notifications BookStudio AI'}:
    {close:'Dismiss notification',area:'BookStudio AI notifications'};
  return <Context.Provider value={{notify,dismiss,clear}}>
    {children}
    <aside className="app-toast-viewport" aria-label={labels.area}>
      {items.map(item=><div key={item.id}
        className={'app-toast app-toast-'+item.tone}
        role={item.tone==='error'||item.tone==='warning'?'alert':'status'}
        aria-live={item.tone==='error'||item.tone==='warning'?'assertive':'polite'}
        aria-atomic="true">
        <span className="app-toast-icon"><AppIcon name={iconName[item.tone]} size={20}/></span>
        <div className="app-toast-copy"><strong>{item.title}</strong><p>{item.detail}</p></div>
        <button className="app-toast-close" type="button" aria-label={labels.close}
          onClick={()=>dismiss(item.id)}><AppIcon name="x" size={18}/></button>
      </div>)}
    </aside>
  </Context.Provider>;
}

/** Reusable from all client modules; title and detail must identify the exact operation. */
export function useToast():Notifier{
  const context=useContext(Context);
  if(!context)throw new Error('ToastProvider is required at the app root');
  return context;
}
