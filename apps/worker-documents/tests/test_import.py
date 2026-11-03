import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from import_processor import inspect_document, ImportRejected

WORD_XML = '''<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
  <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Introduction</w:t></w:r></w:p>
  <w:p><w:r><w:t>Premier texte.</w:t></w:r></w:p>
</w:body></w:document>'''

def make_docx(path, overrides=None, additional=None):
    files = {'[Content_Types].xml': '<Types/>', 'word/document.xml': WORD_XML}
    files.update(overrides or {})
    files.update(additional or {})
    with ZipFile(path, 'w', compression=ZIP_DEFLATED) as zip_file:
        for key, value in files.items():
            zip_file.writestr(key, value)

class ImportTests(unittest.TestCase):
    def test_extract_docx_and_heading(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'test.docx'
            make_docx(path)
            out=inspect_document(path)
            self.assertEqual(out['blocks'][0]['kind'], 'heading')
            self.assertEqual(out['blocks'][1]['text'], 'Premier texte.')
            self.assertEqual(out['status'], 'PREVIEW_REVIEW_REQUIRED')
            self.assertFalse(out['verifiedFidelity'])
            self.assertFalse(out['sourceRetained'])

    def test_reject_not_docx(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'bad.docx';path.write_bytes(b'MZ'+b'0'*20)
            with self.assertRaisesRegex(ImportRejected,'UNSUPPORTED_MIME'): inspect_document(path)

    def test_pdf_not_misrepresented_as_imported(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'test.pdf';path.write_bytes(b'%PDF-1.5\\n')
            with self.assertRaisesRegex(ImportRejected,'PDF_PARSER_NOT_IMPLEMENTED'): inspect_document(path)

    def test_reject_macro_and_script(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'macro.docx'
            make_docx(path, additional={'word/vbaProject.bin':'malicious'})
            with self.assertRaisesRegex(ImportRejected,'ACTIVE_CONTENT_REJECTED'): inspect_document(path)

    def test_reject_path_traversal(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'traversal.docx'
            make_docx(path, additional={'../outside.txt':'bad'})
            with self.assertRaisesRegex(ImportRejected,'UNSAFE_ARCHIVE_ENTRY'): inspect_document(path)

    def test_reject_malformed_xml(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'badxml.docx'
            make_docx(path, overrides={'word/document.xml':'<w:document>'})
            with self.assertRaisesRegex(ImportRejected,'INVALID_XML'): inspect_document(path)

    def test_reject_doctype_and_entities(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'doctype.docx'
            payload = '<!DOCTYPE root [<!ENTITY foo "bar">]>' + WORD_XML
            make_docx(path, overrides={'word/document.xml':payload})
            with self.assertRaisesRegex(ImportRejected,'XML_DTD_REJECTED'): inspect_document(path)

    def test_zip_ratio_limit(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'ratio.docx'
            make_docx(path, additional={'word/empty-text.txt':'A'*100000})
            with self.assertRaisesRegex(ImportRejected,'ZIP_EXPANSION_RATIO_EXCEEDED'): inspect_document(path)

    def test_detect_table_and_images(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'complex.docx'
            doc=WORD_XML.replace('</w:body>', '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Table cell</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body>')
            make_docx(path,overrides={'word/document.xml':doc},additional={'word/media/image1.png':'123'})
            out=inspect_document(path)
            self.assertIn('TABLES_PRESENT_REVIEW_REQUIRED',out['warnings'])
            self.assertIn('IMAGES_PRESENT_REVIEW_REQUIRED',out['warnings'])
            self.assertFalse(out['readyForPublication'])

    def test_external_links_warn_without_loading(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'external.docx'
            relations='''<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                <Relationship Id="rId1" TargetMode="External" Target="https://example.test/never-open" Type="hyperlink"/></Relationships>'''
            make_docx(path,additional={'word/_rels/document.xml.rels':relations})
            out=inspect_document(path)
            self.assertIn('EXTERNAL_LINKS_REVIEW_REQUIRED',out['warnings'])

    def test_archive_symlink_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'symlink.docx'
            symlink=ZipInfo('word/symlink.txt')
            symlink.create_system=3
            symlink.external_attr=0o120777<<16
            with ZipFile(path,'w',compression=ZIP_DEFLATED) as out:
                out.writestr('[Content_Types].xml','<Types/>')
                out.writestr('word/document.xml',WORD_XML)
                out.writestr(symlink,'../outside')
            with self.assertRaisesRegex(ImportRejected,'ARCHIVE_SYMLINK_REJECTED'): inspect_document(path)

    def test_duplicate_archive_entry_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'duplicate.docx'
            with ZipFile(path,'w',compression=ZIP_DEFLATED) as out:
                out.writestr('[Content_Types].xml','<Types/>')
                out.writestr('word/document.xml',WORD_XML)
                out.writestr('WORD/DOCUMENT.XML',WORD_XML)
            with self.assertRaisesRegex(ImportRejected,'DUPLICATE_ARCHIVE_ENTRY'): inspect_document(path)

if __name__=='__main__':unittest.main()
