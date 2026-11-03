'use client';

import {useEffect,useState} from 'react';
import {useEditorState} from '@tiptap/react';
import type {useEditor} from '@tiptap/react';
import {safeExternalHref} from '@bookstudio/domain';
import {useAppPreferences} from './AppPreferences';

type Editor=NonNullable<ReturnType<typeof useEditor>>;
type Props={editor:Editor|null;canEdit:boolean};
type RibbonTab='home'|'insert';
type Command='bold'|'italic'|'underline'|'strike'|'code'|
  'bullet'|'ordered'|'quote'|'codeBlock'|'divider'|'hardBreak'|
  'clear'|'undo'|'redo'|'unlink';

/** Word-inspired editing ribbon, using Tiptap v3 StarterKit only.
 * All commands preserve content through the existing autosave transaction.
 * No table/image controls until a matching storage and export pipeline exists.
 */
export default function EditorRibbon({editor,canEdit}:Props){
  const {t}=useAppPreferences();
  const [tab,setTab]=useState<RibbonTab>('home');
  const [linkDialog,setLinkDialog]=useState(false);
  const [linkValue,setLinkValue]=useState('');
  const [linkError,setLinkError]=useState('');
  const current=useEditorState({
    editor,
    selector:({editor:instance})=>({
      paragraph:instance?.isActive('paragraph')??false,
      h1:instance?.isActive('heading',{level:1})??false,
      h2:instance?.isActive('heading',{level:2})??false,
      h3:instance?.isActive('heading',{level:3})??false,
      bold:instance?.isActive('bold')??false,
      italic:instance?.isActive('italic')??false,
      underline:instance?.isActive('underline')??false,
      strike:instance?.isActive('strike')??false,
      code:instance?.isActive('code')??false,
      bullet:instance?.isActive('bulletList')??false,
      ordered:instance?.isActive('orderedList')??false,
      quote:instance?.isActive('blockquote')??false,
      codeBlock:instance?.isActive('codeBlock')??false,
      link:instance?.isActive('link')??false,
    })
  });
  const active=current??{
    paragraph:false,h1:false,h2:false,h3:false,bold:false,italic:false,
    underline:false,strike:false,code:false,bullet:false,ordered:false,
    quote:false,codeBlock:false,link:false
  };
  useEffect(()=>{
    if(!linkDialog)return;
    function onKey(event:KeyboardEvent){if(event.key==='Escape'){setLinkDialog(false);setLinkError('');}}
    document.addEventListener('keydown',onKey);
    return ()=>document.removeEventListener('keydown',onKey);
  },[linkDialog]);

  function setParagraphStyle(style:string){
    if(!editor||!canEdit)return;
    const chain=editor.chain().focus();
    if(style==='normal')chain.setParagraph().run();
    else if(style==='h1')chain.toggleHeading({level:1}).run();
    else if(style==='h2')chain.toggleHeading({level:2}).run();
    else if(style==='h3')chain.toggleHeading({level:3}).run();
  }
  function execute(command:Command){
    if(!editor||!canEdit)return;
    const chain=editor.chain().focus();
    switch(command){
      case 'bold':chain.toggleBold().run();break;
      case 'italic':chain.toggleItalic().run();break;
      case 'underline':chain.toggleUnderline().run();break;
      case 'strike':chain.toggleStrike().run();break;
      case 'code':chain.toggleCode().run();break;
      case 'bullet':chain.toggleBulletList().run();break;
      case 'ordered':chain.toggleOrderedList().run();break;
      case 'quote':chain.toggleBlockquote().run();break;
      case 'codeBlock':chain.toggleCodeBlock().run();break;
      case 'divider':chain.setHorizontalRule().run();break;
      case 'hardBreak':chain.setHardBreak().run();break;
      case 'clear':chain.unsetAllMarks().clearNodes().run();break;
      case 'undo':chain.undo().run();break;
      case 'redo':chain.redo().run();break;
      case 'unlink':chain.unsetLink().run();break;
    }
  }
  function openLink(){
    if(!editor||!canEdit)return;
    setLinkValue(String(editor.getAttributes('link')?.href??''));
    setLinkError('');setTab('insert');setLinkDialog(true);
  }
  function saveLink(event:React.FormEvent){
    event.preventDefault();
    const url=safeExternalHref(linkValue.trim());
    if(!url){setLinkError(t('editor.toolbar.linkInvalid'));return;}
    if(!editor||!canEdit)return;
    if(editor.state.selection.empty){
      // No selection: insert visible link text (rather than a zero-width mark).
      editor.chain().focus().insertContent({
        type:'text',text:url,marks:[{type:'link',attrs:{href:url}}]
      }).run();
    }else{
      editor.chain().focus().extendMarkRange('link').setLink({href:url}).run();
    }
    setLinkDialog(false);setLinkError('');
  }
  const item=(command:Command,label:string,glyph:string,pressed=false,extra?:string)=>
    <button type="button" className={'ribbon-tool'+(pressed?' is-active':'')}
      aria-label={label} title={label+(extra?' · '+extra:'')}
      aria-pressed={pressed} disabled={!editor||!canEdit}
      onMouseDown={event=>event.preventDefault()}
      onClick={()=>execute(command)}>{glyph}</button>;

  if(!canEdit)return null;
  return <div className="ribbon" aria-label={t('editor.editorTitle')}>
    <div className="ribbon-tabs" role="tablist" aria-label={t('editor.editorTitle')}>
      <button type="button" role="tab" id="ribbon-tab-home"
        aria-selected={tab==='home'} aria-controls="ribbon-panel-home"
        className={tab==='home'?'is-active':''}
        onClick={()=>setTab('home')}>{t('editor.toolbar.home')}</button>
      <button type="button" role="tab" id="ribbon-tab-insert"
        aria-selected={tab==='insert'} aria-controls="ribbon-panel-insert"
        className={tab==='insert'?'is-active':''}
        onClick={()=>setTab('insert')}>{t('editor.toolbar.insert')}</button>
      <span className="ribbon-hint">{t('editor.toolbar.tip')}</span>
    </div>
    {tab==='home'?<div className="ribbon-scroll" role="tabpanel" id="ribbon-panel-home" aria-labelledby="ribbon-tab-home">
      <div className="ribbon-group">
        <label className="ribbon-style-label">
          <span className="sr-only">{t('editor.toolbar.styles')}</span>
          <select disabled={!editor} className="ribbon-style"
            aria-label={t('editor.toolbar.styles')}
            value={active.h1?'h1':active.h2?'h2':active.h3?'h3':'normal'}
            onChange={event=>setParagraphStyle(event.target.value)}>
            <option value="normal">{t('editor.toolbar.normal')}</option>
            <option value="h1">{t('editor.toolbar.heading1')}</option>
            <option value="h2">{t('editor.toolbar.heading2')}</option>
            <option value="h3">{t('editor.toolbar.heading3')}</option>
          </select>
        </label>
        <small>{t('editor.toolbar.styles')}</small>
      </div>
      <div className="ribbon-group"><div className="ribbon-tools">
        {item('bold',t('editor.toolbar.bold'),'B',active.bold,'Ctrl/Cmd+B')}
        {item('italic',t('editor.toolbar.italic'),'I',active.italic,'Ctrl/Cmd+I')}
        {item('underline',t('editor.toolbar.underline'),'U',active.underline,'Ctrl/Cmd+U')}
        {item('strike',t('editor.toolbar.strike'),'S̶',active.strike)}
        {item('code',t('editor.toolbar.code'),'〈〉',active.code)}
      </div><small>{t('editor.toolbar.font')}</small></div>
      <div className="ribbon-group"><div className="ribbon-tools">
        {item('bullet',t('editor.toolbar.bullet'),'☷',active.bullet)}
        {item('ordered',t('editor.toolbar.ordered'),'1.',active.ordered)}
        {item('quote',t('editor.toolbar.quote'),'❝',active.quote)}
        {item('codeBlock',t('editor.toolbar.codeBlock'),'{ }',active.codeBlock)}
      </div><small>{t('editor.toolbar.paragraph')}</small></div>
      <div className="ribbon-group"><div className="ribbon-tools">
        {item('clear',t('editor.toolbar.clear'),'Tx')}
        {item('undo',t('editor.toolbar.undo'),'↶')}
        {item('redo',t('editor.toolbar.redo'),'↷')}
      </div><small>{t('editor.toolbar.history')}</small></div>
    </div>:<div className="ribbon-scroll" role="tabpanel" id="ribbon-panel-insert" aria-labelledby="ribbon-tab-insert">
      <div className="ribbon-group"><div className="ribbon-tools">
        <button type="button" className={'ribbon-tool'+(active.link?' is-active':'')}
          aria-label={t('editor.toolbar.link')} title={t('editor.toolbar.link')}
          disabled={!editor||!canEdit} onClick={openLink}>🔗</button>
        {item('unlink',t('editor.toolbar.unlink'),'×🔗',active.link)}
        {item('divider',t('editor.toolbar.divider'),'―')}
        {item('hardBreak',t('editor.toolbar.insertHelp'),'↵')}
      </div><small>{t('editor.toolbar.insertHelp')}</small></div>
      <p className="ribbon-explain">{t('editor.toolbar.notWord')}</p>
    </div>}
    {linkDialog&&<div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setLinkDialog(false);}}>
      <form className="modal" role="dialog" aria-modal="true" aria-label={t('editor.toolbar.link')}
        onSubmit={saveLink}>
        <button type="button" className="close" aria-label={t('common.close')} onClick={()=>setLinkDialog(false)}>×</button>
        <div className="eyebrow">{t('editor.toolbar.insert')}</div>
        <h2>{t('editor.toolbar.link')}</h2>
        <label>{t('editor.toolbar.linkUrl')}
          <input autoFocus value={linkValue} onChange={event=>setLinkValue(event.target.value)}
            maxLength={2048} type="url" placeholder={t('editor.toolbar.linkPlaceholder')}/>
        </label>
        {linkError&&<p role="alert" className="form-error">{linkError}</p>}
        <button type="submit" className="button full">{t('editor.toolbar.linkConfirm')}</button>
        <button type="button" className="text-button" onClick={()=>setLinkDialog(false)}>{t('common.cancel')}</button>
      </form>
    </div>}
  </div>;
}
