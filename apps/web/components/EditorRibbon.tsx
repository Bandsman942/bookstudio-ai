'use client';

import {useId,useRef,useState} from 'react';
import type {ReactNode,FormEvent,KeyboardEvent} from 'react';
import {useEditorState} from '@tiptap/react';
import type {Editor} from '@tiptap/react';
import {useAppPreferences} from './AppPreferences';
import {normalizeEditorHref} from '@bookstudio/domain';

type Props={editor:Editor|null;canEdit:boolean};
type RibbonTab='home'|'insert';
type RibbonToolProps={
  label:string;icon:ReactNode;onActivate:()=>void;
  active?:boolean;disabled?:boolean;shortcut?:string;large?:boolean;
};


function RibbonTool({label,icon,onActivate,active=false,disabled=false,shortcut,large=false}:RibbonToolProps){
  return <button type="button" className={'ribbon-tool'+(active?' is-active':'')+(large?' is-large':'')}
    title={shortcut?label+' · '+shortcut:label}
    aria-label={label} aria-pressed={active}
    disabled={disabled}
    onMouseDown={event=>event.preventDefault()}
    onClick={onActivate}>{icon}</button>;
}

/** BookStudio's accessible, extensible ribbon; all commands operate on saved Tiptap JSON. */
export default function EditorRibbon({editor,canEdit}:Props){
  const {t,locale}=useAppPreferences();
  const [tab,setTab]=useState<RibbonTab>('home');
  const [showLink,setShowLink]=useState(false);
  const [href,setHref]=useState('');
  const [linkError,setLinkError]=useState('');
  const ribbonId=useId();
  const homeRef=useRef<HTMLButtonElement>(null);
  const insertRef=useRef<HTMLButtonElement>(null);
  const linkTrigger=useRef<HTMLButtonElement>(null);

  // Update the ribbon only when actual mark/selection state changes,
  // not on every keystroke in the main manuscript component.
  const state=useEditorState({
    editor,
    selector:({editor:current})=>({
      bold:current?.isActive('bold')??false,
      italic:current?.isActive('italic')??false,
      underline:current?.isActive('underline')??false,
      strike:current?.isActive('strike')??false,
      code:current?.isActive('code')??false,
      bullet:current?.isActive('bulletList')??false,
      ordered:current?.isActive('orderedList')??false,
      quote:current?.isActive('blockquote')??false,
      codeBlock:current?.isActive('codeBlock')??false,
      link:current?.isActive('link')??false,
      heading:current?.isActive('heading',{level:1})?1:
        current?.isActive('heading',{level:2})?2:
        current?.isActive('heading',{level:3})?3:0
    })
  });
  const enabled=!!editor&&canEdit;
  function switchTab(event:KeyboardEvent<HTMLButtonElement>){
    if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
    event.preventDefault();
    const target=tab==='home'?'insert':'home';
    setTab(target);
    (target==='home'?homeRef:insertRef).current?.focus();
  }
  function openLink(){
    if(!enabled||!editor)return;
    setHref(String(editor.getAttributes('link').href||''));
    setLinkError('');setShowLink(true);
  }
  function closeLink(){
    setShowLink(false);setLinkError('');
    linkTrigger.current?.focus();
  }
  function submitLink(event:FormEvent){
    event.preventDefault();
    if(!enabled||!editor)return;
    const normalized=normalizeEditorHref(href);
    if(!normalized){setLinkError(t('editor.toolbar.linkInvalid'));return;}
    editor.chain().focus().extendMarkRange('link').setLink({
      href:normalized,target:'_blank',rel:'noopener noreferrer nofollow'
    }).run();
    setShowLink(false);setLinkError('');
  }
  function chooseStyle(level:number){
    if(!editor||!enabled)return;
    if(level===0)editor.chain().focus().setParagraph().run();
    else editor.chain().focus().setHeading({level:level as 1|2|3}).run();
  }
  if(!canEdit)return null;

  return <div className="editor-ribbon" aria-label={t('editor.editorTitle')}>
    <div className="ribbon-tabs" role="tablist" aria-label={t('editor.editorTitle')}>
      <button ref={homeRef} type="button" role="tab" id={ribbonId+'-home'}
        aria-selected={tab==='home'} aria-controls={ribbonId+'-panel'} tabIndex={tab==='home'?0:-1}
        onKeyDown={switchTab} onClick={()=>setTab('home')}>{t('editor.toolbar.home')}</button>
      <button ref={insertRef} type="button" role="tab" id={ribbonId+'-insert'}
        aria-selected={tab==='insert'} aria-controls={ribbonId+'-panel'} tabIndex={tab==='insert'?0:-1}
        onKeyDown={switchTab} onClick={()=>setTab('insert')}>{t('editor.toolbar.insert')}</button>
      <span className="ribbon-hint" aria-hidden="true">{t('editor.toolbar.tip')}</span>
    </div>
    <div role="tabpanel" id={ribbonId+'-panel'}
      aria-labelledby={ribbonId+'-'+tab}
      className="ribbon-groups" key={tab}>
      {tab==='home'?<>
        <div className="ribbon-group ribbon-style-group" role="group" aria-label={t('editor.toolbar.styles')}>
          <label className="ribbon-select-label">{t('editor.toolbar.styles')}
            <select aria-label={t('editor.toolbar.styles')} value={state?.heading??0} disabled={!enabled}
              onChange={event=>chooseStyle(Number(event.target.value))}>
              <option value={0}>{t('editor.toolbar.normal')}</option>
              <option value={1}>{t('editor.toolbar.heading1')}</option>
              <option value={2}>{t('editor.toolbar.heading2')}</option>
              <option value={3}>{t('editor.toolbar.heading3')}</option>
            </select>
          </label>
        </div>
        <div className="ribbon-group" role="group" aria-label={t('editor.toolbar.font')}>
          <div className="ribbon-tools">
            <RibbonTool label={t('editor.toolbar.bold')} icon={<b>{locale==='fr'?'G':'B'}</b>} shortcut="Ctrl/Cmd+B" disabled={!enabled}
              active={state?.bold} onActivate={()=>editor?.chain().focus().toggleBold().run()}/>
            <RibbonTool label={t('editor.toolbar.italic')} icon={<em>I</em>} shortcut="Ctrl/Cmd+I" disabled={!enabled}
              active={state?.italic} onActivate={()=>editor?.chain().focus().toggleItalic().run()}/>
            <RibbonTool label={t('editor.toolbar.underline')} icon={<u>U</u>} shortcut="Ctrl/Cmd+U" disabled={!enabled}
              active={state?.underline} onActivate={()=>editor?.chain().focus().toggleUnderline().run()}/>
            <RibbonTool label={t('editor.toolbar.strike')} icon={<s>S</s>} disabled={!enabled}
              active={state?.strike} onActivate={()=>editor?.chain().focus().toggleStrike().run()}/>
            <RibbonTool label={t('editor.toolbar.code')} icon="〈/〉" disabled={!enabled}
              active={state?.code} onActivate={()=>editor?.chain().focus().toggleCode().run()}/>
          </div>
          <small>{t('editor.toolbar.font')}</small>
        </div>
        <div className="ribbon-group" role="group" aria-label={t('editor.toolbar.paragraph')}>
          <div className="ribbon-tools">
            <RibbonTool label={t('editor.toolbar.bullet')} icon="• ≡" disabled={!enabled}
              active={state?.bullet} onActivate={()=>editor?.chain().focus().toggleBulletList().run()}/>
            <RibbonTool label={t('editor.toolbar.ordered')} icon="1. ≡" disabled={!enabled}
              active={state?.ordered} onActivate={()=>editor?.chain().focus().toggleOrderedList().run()}/>
            <RibbonTool label={t('editor.toolbar.quote')} icon="❞" disabled={!enabled}
              active={state?.quote} onActivate={()=>editor?.chain().focus().toggleBlockquote().run()}/>
            <RibbonTool label={t('editor.toolbar.clear')} icon="Tx" disabled={!enabled}
              onActivate={()=>editor?.chain().focus().unsetAllMarks().clearNodes().run()}/>
          </div>
          <small>{t('editor.toolbar.paragraph')}</small>
        </div>
        <div className="ribbon-group" role="group" aria-label={t('editor.toolbar.history')}>
          <div className="ribbon-tools">
            <RibbonTool label={t('editor.toolbar.undo')} icon="↶" disabled={!enabled}
              onActivate={()=>editor?.chain().focus().undo().run()}/>
            <RibbonTool label={t('editor.toolbar.redo')} icon="↷" disabled={!enabled}
              onActivate={()=>editor?.chain().focus().redo().run()}/>
          </div>
          <small>{t('editor.toolbar.history')}</small>
        </div>
      </>:<>
        <div className="ribbon-group" role="group" aria-label={t('editor.toolbar.insert')}>
          <div className="ribbon-tools">
            <button ref={linkTrigger} type="button" className={'ribbon-tool is-large'+(state?.link?' is-active':'')}
              aria-label={t('editor.toolbar.link')} disabled={!enabled}
              onMouseDown={event=>event.preventDefault()} onClick={openLink}>
              <span aria-hidden="true">🔗</span><span>{t('editor.toolbar.link')}</span>
            </button>
            <RibbonTool label={t('editor.toolbar.unlink')} icon="⊘" disabled={!enabled||!state?.link}
              onActivate={()=>editor?.chain().focus().unsetLink().run()}/>
            <RibbonTool label={t('editor.toolbar.divider')} icon="⎯" disabled={!enabled}
              onActivate={()=>editor?.chain().focus().setHorizontalRule().run()}/>
            <RibbonTool label={t('editor.toolbar.codeBlock')} icon="⌘" disabled={!enabled}
              active={state?.codeBlock} onActivate={()=>editor?.chain().focus().toggleCodeBlock().run()}/>
            <RibbonTool label={t('editor.toolbar.quote')} icon="❞" disabled={!enabled}
              active={state?.quote} onActivate={()=>editor?.chain().focus().toggleBlockquote().run()}/>
          </div>
          <small>{t('editor.toolbar.insert')}</small>
        </div>
        <p className="ribbon-future" role="note">{t('editor.toolbar.notWord')}</p>
      </>}
    </div>
    {showLink&&<div className="modal-backdrop ribbon-modal-backdrop"
      onMouseDown={event=>{if(event.currentTarget===event.target)closeLink();}}>
      <form className="modal ribbon-link-dialog" onSubmit={submitLink}
        role="dialog" aria-modal="true" aria-label={t('editor.toolbar.link')}>
        <button type="button" className="close" aria-label={t('common.close')} onClick={closeLink}>×</button>
        <span className="eyebrow">{t('editor.toolbar.insert')}</span>
        <h2>{t('editor.toolbar.link')}</h2>
        <label>{t('editor.toolbar.linkUrl')}
          <input type="url" autoFocus required value={href} onChange={event=>setHref(event.target.value)}
            placeholder={t('editor.toolbar.linkPlaceholder')}/>
        </label>
        {linkError&&<p role="alert" className="form-error">{linkError}</p>}
        <button className="button full" disabled={!enabled}>{t('editor.toolbar.linkConfirm')}</button>
        <button type="button" className="text-button" onClick={closeLink}>{t('common.cancel')}</button>
      </form>
    </div>}
  </div>;
}
