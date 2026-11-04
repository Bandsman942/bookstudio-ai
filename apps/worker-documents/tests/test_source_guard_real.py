"""Opt-in REAL antivirus integration test in a sandbox with fresh signatures.

CI's mocked contract tests cannot prove real malware detection. This test must
be explicitly enabled on a separately isolated, disposable worker host.
"""
from __future__ import annotations

import importlib.util
import os
import sys
import tempfile
import unittest
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / 'source_guard.py'
spec = importlib.util.spec_from_file_location('source_guard_real', MODULE)
guard = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = guard
spec.loader.exec_module(guard)


@unittest.skipUnless(os.environ.get('BOOKSTUDIO_E2E_REAL_CLAMAV') == '1',
                     'requires isolated real ClamAV worker and fresh signatures')
class RealClamAVTests(unittest.TestCase):
    def test_real_clean_and_eicar_file(self):
        eicar = os.environ.get('BOOKSTUDIO_EICAR_TEST_FILE')
        if not eicar:
            self.fail('BOOKSTUDIO_EICAR_TEST_FILE must point to the official benign EICAR test file')
        with tempfile.TemporaryDirectory(prefix='bs-real-av-test-') as temp:
            clean = Path(temp) / 'test-clean.txt'
            clean.write_bytes(b'BookStudio antivirus integration test - clean fixture')
            verdict = guard.scan_source(clean)
            self.assertEqual(verdict.status, 'SCANNED_CLEAN', verdict.code)
            self.assertTrue(verdict.scannerVersion.startswith('ClamAV '))
            infected = guard.scan_source(Path(eicar))
            self.assertEqual((infected.status, infected.code),
                             ('REJECTED', 'THREAT_OR_POLICY_REJECTED'))


if __name__ == '__main__':
    unittest.main()
