"""Secure DOCX inspection worker — offline review, NOT a public upload endpoint.

This scanner deliberately does not execute macros, load remote URLs, save source
files, or claim publication-grade conversion. A separate job/storage/AV pipeline
is required before opening imports to customers.
"""
from __future__ import annotations

import json
import stat
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path, PurePosixPath

MAX_SOURCE_BYTES = 30 * 1024 * 1024
MAX_UNCOMPRESSED_BYTES = 150 * 1024 * 1024
MAX_DOC_XML_BYTES = 16 * 1024 * 1024
MAX_ENTRIES = 5000
MAX_RATIO = 400
MAX_PARAGRAPHS = 30000

WORD_NS = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
REL_NS = '{http://schemas.openxmlformats.org/package/2006/relationships}'


class ImportRejected(ValueError):
    """Machine-readable document validation failure."""


def inspect_document(path: str | Path) -> dict:
    p = Path(path)
    if not p.is_file():
        raise ImportRejected('FILE_NOT_FOUND')
    size = p.stat().st_size
    if size > MAX_SOURCE_BYTES or size < 4:
        raise ImportRejected('SOURCE_SIZE_INVALID')
    with p.open('rb') as handle:
        magic = handle.read(8)
    if magic.startswith(b'%PDF-'):
        raise ImportRejected('PDF_PARSER_NOT_IMPLEMENTED')
    if magic[:4] != b'PK\x03\x04':
        raise ImportRejected('UNSUPPORTED_MIME')
    return extract_docx(p)


def _safe_xml(blob: bytes, *, source: str):
    if len(blob) > MAX_DOC_XML_BYTES:
        raise ImportRejected('DOCUMENT_XML_TOO_LARGE')
    upper = blob.upper()
    if b'<!DOCTYPE' in upper or b'<!ENTITY' in upper:
        raise ImportRejected('XML_DTD_REJECTED')
    try:
        return ET.fromstring(blob)
    except ET.ParseError as exc:
        raise ImportRejected(f'INVALID_XML:{source}') from exc


def _validate_archive(infos: list[zipfile.ZipInfo]) -> set[str]:
    if not infos or len(infos) > MAX_ENTRIES:
        raise ImportRejected('ZIP_LIMIT_EXCEEDED')
    if sum(info.file_size for info in infos) > MAX_UNCOMPRESSED_BYTES:
        raise ImportRejected('ZIP_LIMIT_EXCEEDED')
    seen: set[str] = set()
    for info in infos:
        name = info.filename
        canonical = name.replace('\\', '/')
        path = PurePosixPath(canonical)
        if (not name or name.startswith(('/', '\\')) or
                '\x00' in name or ':' in name or
                path.is_absolute() or '..' in path.parts or
                canonical != name):
            raise ImportRejected('UNSAFE_ARCHIVE_ENTRY')
        lowered = canonical.casefold()
        if lowered in seen:
            raise ImportRejected('DUPLICATE_ARCHIVE_ENTRY')
        seen.add(lowered)
        if info.flag_bits & 1:
            raise ImportRejected('ENCRYPTED_ARCHIVE_REJECTED')
        if info.create_system == 3 and stat.S_ISLNK(info.external_attr >> 16):
            raise ImportRejected('ARCHIVE_SYMLINK_REJECTED')
        if info.file_size > MAX_DOC_XML_BYTES and info.filename.endswith('.xml'):
            raise ImportRejected('DOCUMENT_XML_TOO_LARGE')
        if info.file_size > 0 and (info.compress_size == 0 or
                                   info.file_size / info.compress_size > MAX_RATIO):
            raise ImportRejected('ZIP_EXPANSION_RATIO_EXCEEDED')
        if (info.compress_type not in (zipfile.ZIP_DEFLATED, zipfile.ZIP_STORED)):
            raise ImportRejected('ZIP_COMPRESSION_UNSUPPORTED')
    return {info.filename for info in infos}


def extract_docx(path: Path) -> dict:
    warnings: list[str] = []
    try:
        with zipfile.ZipFile(path) as archive:
            infos = archive.infolist()
            names = _validate_archive(infos)
            if 'word/document.xml' not in names or '[Content_Types].xml' not in names:
                raise ImportRejected('NOT_A_DOCX')
            if any('vbaproject' in name.lower() or name.lower().endswith(
                    ('.bin', '.exe', '.js', '.vbs', '.ps1')) for name in names):
                raise ImportRejected('ACTIVE_CONTENT_REJECTED')

            xml = archive.read('word/document.xml')
            doc = _safe_xml(xml, source='word/document.xml')
            if doc.tag != WORD_NS + 'document':
                raise ImportRejected('NOT_A_DOCX')

            # A Word XML package can contain external links; record for review,
            # but never follow or render them automatically.
            rels = 'word/_rels/document.xml.rels'
            if rels in names:
                relations = _safe_xml(archive.read(rels), source=rels)
                if any(node.attrib.get('TargetMode', '').lower() == 'external'
                       for node in relations.iter()):
                    warnings.append('EXTERNAL_LINKS_REVIEW_REQUIRED')

            blocks = []
            for paragraph in doc.iter(WORD_NS + 'p'):
                if len(blocks) >= MAX_PARAGRAPHS:
                    raise ImportRejected('PARAGRAPH_LIMIT_EXCEEDED')
                fragments = [text.text or '' for text in paragraph.iter(WORD_NS+'t')]
                content = ''.join(fragments)
                if not content.strip():
                    continue
                props = paragraph.find(WORD_NS + 'pPr')
                style = props.find(WORD_NS+'pStyle') if props is not None else None
                style_id = style.attrib.get(WORD_NS+'val', '') if style is not None else ''
                heading = style_id.lower().startswith(('heading', 'titre'))
                blocks.append({
                    'kind': 'heading' if heading else 'paragraph',
                    'text': content,
                    'style': style_id
                })

            if 'word/footnotes.xml' in names:
                warnings.append('FOOTNOTES_PRESENT_REVIEW_REQUIRED')
            if 'word/endnotes.xml' in names:
                warnings.append('ENDNOTES_PRESENT_REVIEW_REQUIRED')
            if any(name.startswith('word/media/') for name in names):
                warnings.append('IMAGES_PRESENT_REVIEW_REQUIRED')
            if doc.find('.//' + WORD_NS + 'tbl') is not None:
                warnings.append('TABLES_PRESENT_REVIEW_REQUIRED')
            if doc.find('.//' + WORD_NS + 'ins') is not None or doc.find('.//' + WORD_NS + 'del') is not None:
                warnings.append('TRACKED_CHANGES_PRESENT_REVIEW_REQUIRED')
            if doc.find('.//' + WORD_NS + 'fldChar') is not None:
                warnings.append('DYNAMIC_FIELDS_PRESENT_REVIEW_REQUIRED')

    except (zipfile.BadZipFile, EOFError, OSError) as exc:
        raise ImportRejected('CORRUPT_DOCX') from exc
    # Source never retained by this offline inspection worker.
    return {
        'format': 'docx',
        'status': 'PREVIEW_REVIEW_REQUIRED',
        'blocks': blocks,
        'warnings': sorted(set(warnings)),
        'sourceRetained': False,
        'verifiedFidelity': False,
        'readyForPublication': False
    }


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('usage: python import_processor.py manuscrit.docx', file=sys.stderr)
        sys.exit(2)
    try:
        print(json.dumps(inspect_document(sys.argv[1]), ensure_ascii=False, indent=2))
    except ImportRejected as exc:
        print(json.dumps({'status':'REJECTED','reason':str(exc)},ensure_ascii=False),file=sys.stderr)
        sys.exit(1)
