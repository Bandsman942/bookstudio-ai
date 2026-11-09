'use client';
import {useEffect,useMemo,useState} from 'react';
import type {useEditor} from '@tiptap/react';
import {useAppPreferences} from './AppPreferences';
import Link from 'next/link';
import {extractChapterSectionOutline,MAX_SECTION_RESULTS,
 type SectionHeading} from '@/lib/section-outline';

type Editor=NonNullable<ReturnType<typeof useEditor>>;

export default function ChapterSectionOutline({editor,onJump,bookId,onNavigate}:{
 editor:Editor|null;onJump:(heading:SectionHeading)=>void;
 bookId:string;onNavigate:(event:React.MouseEvent)=>void
}){
 const {locale}=useAppPreferences();
 const [filter,setFilter]=useState('');
 const [version,setVersion]=useState(0);
 const [selectionPos,setSelectionPos]=useState(0);
 useEffect(()=>{
   if(!editor)return;
   const changed=()=>setVersion(v=>v+1);
   const selected=()=>setSelectionPos(editor.state.selection.from);
   editor.on('update',changed);
   editor.on('selectionUpdate',selected);
   selected();
   return ()=>{
     editor.off('update',changed);
     editor.off('selectionUpdate',selected);
   };
 },[editor]);
 const outline=useMemo(()=>editor?
   extractChapterSectionOutline(editor.state.doc,filter):
   {headings:[],matches:0,hasMore:false},[editor,filter,version]);
 const active=outline.headings.reduce<number>((result,item,index)=>
   item.position<selectionPos?index:result,-1);
 return <section className="chapter-section-outline"
   role="region" id="studio-section-panel"
   aria-label={locale==='fr'?'Sections du chapitre courant':'Sections in current chapter'}>
   <label className="section-outline-search">
     <span>{locale==='fr'?'Filtrer les titres H1–H3':'Filter H1–H3 headings'}</span>
     <input type="search" value={filter} maxLength={100}
       placeholder={locale==='fr'?'Rechercher une section…':'Find a section…'}
       onChange={event=>setFilter(event.target.value)}/>
   </label>
   <div className="section-outline-count" role="status" aria-live="polite">
     {!editor?(locale==='fr'?'Chargement des sections…':'Loading sections…'):
       outline.matches===0?(filter?
         (locale==='fr'?'Aucun titre correspondant':'No matching headings'):
         (locale==='fr'?'Aucun titre de section H1–H3':'No H1–H3 section headings')):
       (locale==='fr'?String(outline.headings.length)+' sur '+
         String(outline.matches)+' sections':
         String(outline.headings.length)+' of '+String(outline.matches)+' sections')}
   </div>
   <div className="chapter-outline-list" role="navigation"
     aria-label={locale==='fr'?'Sommaire des sections':'Section outline'}>
     {editor&&outline.matches===0&&!filter&&<div className="section-outline-empty" role="note">
       <strong>{locale==='fr'?'Aucune section structurée dans ce chapitre':'No structured sections in this chapter'}</strong>
       <p>{locale==='fr'?
         'Le sommaire utilise les vrais styles « Titre 1 », « Titre 2 » et « Titre 3 ». Les paragraphes au style « Normal » n’apparaissent pas ici. Sélectionnez un intitulé dans le manuscrit et appliquez un style de titre depuis le ruban.':
         'The outline uses actual Heading 1, Heading 2 and Heading 3 styles. Normal paragraphs do not appear here. Select a heading in the manuscript and apply a heading style from the ribbon.'}</p>
       <Link href={'/books/'+bookId+'#book-outline'} onClick={onNavigate}>
         {locale==='fr'?'Consulter le sommaire global du livre':'Open the whole-book outline'}
       </Link>
     </div>}
     {outline.headings.map((heading,index)=>
       <button type="button" key={heading.position+'|'+heading.level}
         className={'chapter-outline-link'+(index===active?' selected':'')}
         title={heading.title}
         style={{paddingInlineStart:12+(heading.level-1)*17}}
         aria-label={(locale==='fr'?'Titre niveau ':'Heading level ')+heading.level+
           ' : '+heading.title}
         aria-current={index===active?'location':undefined}
         onClick={()=>onJump(heading)}>
         <span className="section-outline-level">H{heading.level}</span>
         <span className="chapter-outline-name">{heading.title}</span>
       </button>)}
     {outline.hasMore&&<p className="section-outline-limit" role="status">
       {locale==='fr'?
         'Plus de '+MAX_SECTION_RESULTS+' titres correspondent. Affinez le filtre pour afficher les sections suivantes sans masquer leur existence.':
         'Over '+MAX_SECTION_RESULTS+' headings match. Refine the filter to reveal later sections; none are silently discarded.'}
     </p>}
   </div>
   <p className="source-note section-outline-note">
     {locale==='fr'?
       'Sommaire calculé uniquement depuis le chapitre ouvert, y compris les brouillons locaux. Un clic déplace le curseur, sans modifier le texte ni créer de révision. Les autres chapitres restent accessibles sous « Chapitres ».':
       'Outline is derived only from the open chapter, including local drafts. Selecting a heading moves the caret without editing text or creating a revision. Other chapters remain under “Chapters”.'}
   </p>
 </section>;
}
