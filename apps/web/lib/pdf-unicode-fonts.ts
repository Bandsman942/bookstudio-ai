import {createRequire} from 'node:module';
import type PDFKit from 'pdfkit';

const nodeRequire=createRequire(import.meta.url);

/** Bundled OFL IBM Plex Sans font files: no runtime network font fetching. */
const fontFiles={
  'latin-400':nodeRequire.resolve('@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff'),
  'latin-700':nodeRequire.resolve('@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-700-normal.woff'),
  'latin-400i':nodeRequire.resolve('@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-italic.woff'),
  'latin-700i':nodeRequire.resolve('@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-700-italic.woff'),
  'latin-ext-400':nodeRequire.resolve('@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-ext-400-normal.woff'),
  'latin-ext-700':nodeRequire.resolve('@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-ext-700-normal.woff'),
  'greek-400':nodeRequire.resolve('@fontsource/ibm-plex-sans/files/ibm-plex-sans-greek-400-normal.woff'),
  'cyrillic-400':nodeRequire.resolve('@fontsource/ibm-plex-sans/files/ibm-plex-sans-cyrillic-400-normal.woff'),
  'cyrillic-ext-400':nodeRequire.resolve('@fontsource/ibm-plex-sans/files/ibm-plex-sans-cyrillic-ext-400-normal.woff'),
  'vietnamese-400':nodeRequire.resolve('@fontsource/ibm-plex-sans/files/ibm-plex-sans-vietnamese-400-normal.woff')
} as const;
type FontName=keyof typeof fontFiles;
export type FontStyle='regular'|'bold'|'italic'|'boldItalic';
export type UnicodeRun={font:FontName;text:string};

const fallbacks:Record<FontStyle,FontName[]>={
  regular:['latin-400','latin-ext-400','greek-400','cyrillic-400','cyrillic-ext-400','vietnamese-400'],
  bold:['latin-700','latin-ext-700','latin-ext-400','greek-400','cyrillic-400','cyrillic-ext-400','vietnamese-400'],
  italic:['latin-400i','latin-400','latin-ext-400','greek-400','cyrillic-400','cyrillic-ext-400','vietnamese-400'],
  boldItalic:['latin-700i','latin-400i','latin-700','latin-ext-700','latin-ext-400','greek-400','cyrillic-400','cyrillic-ext-400','vietnamese-400']
};

export class UnsupportedPdfGlyph extends Error{
  readonly codepoints:string;
  constructor(grapheme:string){super('EXPORT_UNSUPPORTED_GLYPHS');this.name='UnsupportedPdfGlyph';
    // Numeric codepoints only: do not log or expose manuscript excerpts.
    this.codepoints=[...grapheme].map(c=>'U+'+c.codePointAt(0)!.toString(16).toUpperCase()).join(',');
  }
}

type FontKitFace={hasGlyphForCodePoint?:(codepoint:number)=>boolean};
type FontContext=PDFKit.PDFDocument&{_font?:{font?:FontKitFace}};
const segmenter=new Intl.Segmenter('und',{granularity:'grapheme'});
const allowedControls=new Set([9,10,13]);

export function registerUnicodeFonts(doc:PDFKit.PDFDocument){
  for(const [name,path] of Object.entries(fontFiles))doc.registerFont(name,path);
}

function canRender(doc:PDFKit.PDFDocument,fontName:FontName,grapheme:string){
  doc.font(fontName);
  const face=(doc as FontContext)._font?.font;
  if(!face||typeof face.hasGlyphForCodePoint!=='function')throw new Error('EXPORT_FONT_UNAVAILABLE');
  return [...grapheme].every(c=>{
    const point=c.codePointAt(0)!;
    return allowedControls.has(point)||face.hasGlyphForCodePoint!(point);
  });
}

/**
 * FontKit verified grapheme-aware runs. No destructive substitution or silent
 * '?' glyphs: missing characters cause an explicit failure instead.
 */
export function unicodeRuns(doc:PDFKit.PDFDocument,text:string,style:FontStyle,
  cache:Map<string,FontName>):UnicodeRun[]{
  const runs:UnicodeRun[]=[];
  for(const {segment} of segmenter.segment(text)){
    let chosen:FontName|undefined;
    if([...segment].every(c=>allowedControls.has(c.codePointAt(0)!))){
      chosen=runs.at(-1)?.font??fallbacks[style][0];
    }else{
      const key=style+'|'+segment;
      chosen=cache.get(key);
      if(!chosen){
        chosen=fallbacks[style].find(name=>canRender(doc,name,segment));
        if(!chosen)throw new UnsupportedPdfGlyph(segment);
        cache.set(key,chosen);
      }
    }
    if(runs.at(-1)?.font===chosen)runs[runs.length-1].text+=segment;
    else runs.push({font:chosen!,text:segment});
  }
  return runs;
}
