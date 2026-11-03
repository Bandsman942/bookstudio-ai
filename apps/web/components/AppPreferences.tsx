'use client';

import {createContext,useContext,useState} from 'react';
import type {ReactNode} from 'react';
import type {ActionMenuItem} from './ActionMenu';
import {LOCALE_COOKIE,THEME_COOKIE,parseLocale,parseTheme,translate} from '@/lib/i18n';
import type {Locale,MessageKey,ThemePreference} from '@/lib/i18n';

type PreferencesContext={
 locale:Locale;
 theme:ThemePreference;
 t:(key:MessageKey,args?:Record<string,string|number>)=>string;
 setLocale:(value:Locale)=>void;
 setTheme:(value:ThemePreference)=>void;
};
const Context=createContext<PreferencesContext|null>(null);

function persistCookie(key:string,value:string){
  const secure=window.location.protocol==='https:'?'; Secure':'';
  document.cookie=key+'='+encodeURIComponent(value)+'; Path=/; Max-Age=31536000; SameSite=Lax'+secure;
}

/** Only stores non-sensitive display preferences; never book content or user tokens. */
export function AppPreferencesProvider({initialLocale,initialTheme,children}:{
  initialLocale:Locale;initialTheme:ThemePreference;children:ReactNode;
}){
  const [locale,setLocaleValue]=useState<Locale>(()=>parseLocale(initialLocale));
  const [theme,setThemeValue]=useState<ThemePreference>(()=>parseTheme(initialTheme));
  const setLocale=(value:Locale)=>{
    const next=parseLocale(value);
    setLocaleValue(next);
    document.documentElement.lang=next;
    persistCookie(LOCALE_COOKIE,next);
    // Do not force router.refresh() while an editor may have an unsaved local draft.
    // Server components pick up the preference at the next normal navigation.
  };
  const setTheme=(value:ThemePreference)=>{
    const next=parseTheme(value);
    setThemeValue(next);
    document.documentElement.dataset.theme=next;
    persistCookie(THEME_COOKIE,next);
  };
  return <Context.Provider value={{
    locale,theme,setLocale,setTheme,
    t:(key,args)=>translate(locale,key,args)
  }}>{children}</Context.Provider>;
}
export function useAppPreferences(){
  const ctx=useContext(Context);
  if(!ctx)throw new Error('AppPreferencesProvider is required');
  return ctx;
}

/** Shared menu entries: callers add these to their existing ⋯ instead of extra buttons. */
export function usePreferenceActions():ActionMenuItem[]{
  const {t,locale,theme,setLocale,setTheme}=useAppPreferences();
  return [
    {label:(theme==='system'?'✓ ':'')+t('prefs.system'),group:t('common.theme'),separatorBefore:true,onSelect:()=>setTheme('system')},
    {label:(theme==='light'?'✓ ':'')+t('prefs.light'),onSelect:()=>setTheme('light')},
    {label:(theme==='dark'?'✓ ':'')+t('prefs.dark'),onSelect:()=>setTheme('dark')},
    {label:(locale==='fr'?'✓ ':'')+t('prefs.fr'),group:t('common.language'),separatorBefore:true,onSelect:()=>setLocale('fr')},
    {label:(locale==='en'?'✓ ':'')+t('prefs.en'),onSelect:()=>setLocale('en')}
  ];
}
