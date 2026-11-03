"""Offline DOCX extraction prototype; NOT a public upload server."""
from __future__ import annotations
import json
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

MAX_SOURCE_BYTES = 30 * 1024 * 1024
MAX_UNCOMPRESSED_BYTES = 150 * 1024 * 1024
MAX_ENTRIES = 5000
WORD_NS = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

class ImportRejected(ValueError):
    pass

def inspect_document(path: str | Path) -> dict:
    p = Path(path)
    if not p.is_file(): raise ImportRejected('FILE_NOT_FOUND')
    if p.stat().st_size > MAX_SOURCE_BYTES: raise ImportRejected('SOURCE_TOO_LARGE')
    with p.open('rb') as handle: magic=handle.read(8)
    if magic.startswith(b'%PDF-'): raise ImportRejected('PDF_PARSER_NOT_IMPLEMENTED')
    if magic[:4] != bytes([80,75,3,4]): raise ImportRejected('UNSUPPORTED_MIME')
    return extract_docx(p)

def extract_docx(path: Path) -> dict:
    warnings=[]
    with zipfile.ZipFile(path) as archive:
        infos=archive.infolist()
        if len(infos)>MAX_ENTRIES or sum(x.file_size for x in infos)>MAX_UNCOMPRESSED_BYTES:
            raise ImportRejected('ZIP_LIMIT_EXCEEDED')
        if any(x.filename.startswith('/') or '..' in Path(x.filename).parts for x in infos):
            raise ImportRejected('UNSAFE_ARCHIVE_ENTRY')
        names={x.filename for x in infos}
        if 'word/document.xml' not in names or '[Content_Types].xml' not in names:
            raise ImportRejected('NOT_A_DOCX')
        if any('vbaProject' in x or x.endswith('.bin') for x in names):
            raise ImportRejected('ACTIVE_CONTENT_REJECTED')
        if any(x.flag_bits & 1 for x in infos): raise ImportRejected('ENCRYPTED_ARCHIVE_REJECTED')
        entry=archive.getinfo('word/document.xml')
        if entry.file_size>MAX_UNCOMPRESSED_BYTES: raise ImportRejected('DOCUMENT_XML_TOO_LARGE')
        document=ET.fromstring(archive.read('word/document.xml'))
        blocks=[]
        for paragraph in document.iter(WORD_NS+'p'):
            fragments=[t.text or '' for t in paragraph.iter(WORD_NS+'t')]
            text=''.join(fragments)
            if not text.strip(): continue
            props=paragraph.find(WORD_NS+'pPr')
            style=props.find(WORD_NS+'pStyle') if props is not None else None
            style_id=style.attrib.get(WORD_NS+'val','') if style is not None else ''
            heading=style_id.lower().startswith(('heading','titre'))
            blocks.append({'kind':'heading' if heading else 'paragraph','text':text,'style':style_id})
        if 'word/footnotes.xml' in names: warnings.append('FOOTNOTES_PRESENT_REVIEW_REQUIRED')
        if any(n.startswith('word/media/') for n in names): warnings.append('IMAGES_PRESENT_REVIEW_REQUIRED')
        if document.find('.//'+WORD_NS+'tbl') is not None: warnings.append('TABLES_PRESENT_REVIEW_REQUIRED')
    return {'format':'docx','status':'PROOF_OF_CONCEPT','blocks':blocks,'warnings':warnings,'sourceRetained':False}

if __name__=='__main__':
    if len(sys.argv)!=2:
        print('usage: python import_processor.py manuscrit.docx',file=sys.stderr);sys.exit(2)
    try: print(json.dumps(inspect_document(sys.argv[1]),ensure_ascii=False,indent=2))
    except ImportRejected as exc:
        print(json.dumps({'status':'REJECTED','reason':str(exc)},ensure_ascii=False),file=sys.stderr);sys.exit(1)
