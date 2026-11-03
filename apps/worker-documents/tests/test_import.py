import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from import_processor import inspect_document,ImportRejected

class ImportTests(unittest.TestCase):
    def test_extract_docx_and_heading(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'test.docx'
            with ZipFile(path,'w') as z:
                z.writestr('[Content_Types].xml','<Types/>')
                z.writestr('word/document.xml','''<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Introduction</w:t></w:r></w:p><w:p><w:r><w:t>Premier texte.</w:t></w:r></w:p></w:body></w:document>''')
            out=inspect_document(path)
            self.assertEqual(out['blocks'][0]['kind'],'heading')
            self.assertEqual(out['blocks'][1]['text'],'Premier texte.')
    def test_reject_not_docx(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'bad.docx';path.write_bytes(b'MZ'+b'0'*20)
            with self.assertRaisesRegex(ImportRejected,'UNSUPPORTED_MIME'):inspect_document(path)
    def test_pdf_not_misrepresented_as_imported(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'test.pdf';path.write_bytes(b'%PDF-1.5\n')
            with self.assertRaisesRegex(ImportRejected,'PDF_PARSER_NOT_IMPLEMENTED'):inspect_document(path)

if __name__=='__main__':unittest.main()
