"""Fail-closed contract tests. These DO NOT replace real ClamAV/EICAR E2E."""
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

MODULE = Path(__file__).resolve().parents[1] / 'source_guard.py'
spec = importlib.util.spec_from_file_location('source_guard', MODULE)
guard = importlib.util.module_from_spec(spec)
import sys
sys.modules[spec.name] = guard
spec.loader.exec_module(guard)


class SourceGuardTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='bs-test-source-guard-')
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.source = self.root / 'source.docx'
        self.data = b'private test manuscript sample' * 24
        self.source.write_bytes(self.data)
        self.sha = hashlib.sha256(self.data).hexdigest()
        self.scanner = self.root / 'clamscan'
        self.scanner.write_bytes(b'unit-test mock binary, NEVER execute')
        self.scanner.chmod(0o700)
        self.signatures = self.root / 'signatures'
        self.signatures.mkdir()
        (self.signatures / 'daily.cvd').write_bytes(b'fixture, not a real signature file' * 100)

    def fake_runner(self, scan_return=0, *, modify_snapshot=False, timeout=False):
        def runner(cmd, **kwargs):
            self.assertEqual(cmd[0], str(self.scanner))
            self.assertFalse(kwargs.get('shell', False))
            if '--version' in cmd:
                return subprocess.CompletedProcess(cmd, 0, stdout='ClamAV 1.4.3/mock-definitions\n')
            self.assertIn('--no-summary', cmd)
            self.assertIn('--alert-exceeds-max=yes', cmd)
            self.assertIn('--alert-encrypted=yes', cmd)
            self.assertIn('--max-scantime=0', cmd)
            self.assertIn('--database='+str(self.signatures), cmd)
            self.assertEqual(cmd[-2], '--')
            self.assertEqual(kwargs['stdout'], subprocess.DEVNULL)
            self.assertEqual(kwargs['stderr'], subprocess.DEVNULL)
            if modify_snapshot:
                Path(cmd[-1]).write_bytes(b'modified while scanning')
            if timeout:
                raise subprocess.TimeoutExpired(cmd, 1)
            return subprocess.CompletedProcess(cmd, scan_return)
        return runner

    def test_clean_exact_bytes_and_no_private_data_in_response(self):
        with patch.object(guard.subprocess, 'run', side_effect=self.fake_runner()):
            outcome = guard.scan_source(self.source, expected_size=len(self.data),
                                        expected_sha256=self.sha, scanner=self.scanner,
                                        signature_dir=self.signatures)
        self.assertEqual(outcome.status, 'SCANNED_CLEAN')
        self.assertEqual(outcome.code, 'CLEAN')
        self.assertEqual(outcome.sha256, self.sha)
        self.assertEqual(outcome.byteSize, len(self.data))
        self.assertTrue(outcome.scannedAt)
        serialized = json.dumps(outcome.public_dict())
        self.assertNotIn(str(self.source), serialized)
        self.assertNotIn('manuscript', serialized)

    def test_infected_is_rejected_and_raw_output_is_not_exposed(self):
        with patch.object(guard.subprocess, 'run', side_effect=self.fake_runner(scan_return=1)):
            outcome = guard.scan_source(self.source, scanner=self.scanner,
                                        signature_dir=self.signatures)
        self.assertEqual((outcome.status, outcome.code), ('REJECTED', 'THREAT_OR_POLICY_REJECTED'))
        self.assertTrue(outcome.scannerVersion.startswith('ClamAV '))

    def test_missing_or_invalid_scanner_never_produces_clean(self):
        self.assertEqual(guard.scan_source(self.source, scanner=self.root / 'absent',
                                            signature_dir=self.signatures).status,
                         'SCAN_UNAVAILABLE')
        with patch.object(guard.subprocess, 'run', return_value=subprocess.CompletedProcess(
                ['--version'], 0, stdout='not-a-scanner')):
            verdict = guard.scan_source(self.source, scanner=self.scanner,
                                        signature_dir=self.signatures)
        self.assertEqual(verdict.status, 'SCAN_UNAVAILABLE')

    def test_scanner_timeout_fails_closed(self):
        with patch.object(guard.subprocess, 'run', side_effect=self.fake_runner(timeout=True)):
            verdict = guard.scan_source(self.source, scanner=self.scanner,
                                        signature_dir=self.signatures, timeout_seconds=2)
        self.assertEqual((verdict.status, verdict.code), ('SCAN_UNAVAILABLE', 'SCANNER_TIMEOUT'))
        self.assertIsNone(verdict.scannedAt)

    def test_unexpected_return_code_fails_closed(self):
        with patch.object(guard.subprocess, 'run', side_effect=self.fake_runner(scan_return=2)):
            verdict = guard.scan_source(self.source, scanner=self.scanner,
                                        signature_dir=self.signatures)
        self.assertEqual((verdict.status, verdict.code), ('SCAN_UNAVAILABLE', 'SCANNER_ERROR'))

    def test_mutated_scanned_snapshot_never_counts_as_clean(self):
        with patch.object(guard.subprocess, 'run', side_effect=self.fake_runner(modify_snapshot=True)):
            verdict = guard.scan_source(self.source, scanner=self.scanner,
                                        signature_dir=self.signatures)
        self.assertEqual((verdict.status, verdict.code), ('SCAN_UNAVAILABLE', 'SNAPSHOT_CHANGED'))

    def test_expected_size_and_digest_must_match(self):
        for kwargs in ({'expected_size': len(self.data) - 1},
                       {'expected_sha256': 'f' * 64}):
            with self.subTest(kwargs=kwargs):
                with patch.object(guard.subprocess, 'run') as run:
                    verdict = guard.scan_source(self.source, scanner=self.scanner,
                                                signature_dir=self.signatures, **kwargs)
                self.assertEqual((verdict.status, verdict.code), ('REJECTED', 'SOURCE_MISMATCH'))
                run.assert_not_called()

    def test_untrusted_or_invalid_inputs_are_rejected_without_scan(self):
        with patch.object(guard.subprocess, 'run') as run:
            self.assertEqual(guard.scan_source(self.source, expected_size=0).status, 'REJECTED')
            self.assertEqual(guard.scan_source(self.source, expected_sha256='not-a-hash').status,
                             'REJECTED')
            self.assertEqual(guard.scan_source(self.source, scanner=self.scanner,
                                               signature_dir=self.signatures,
                                               timeout_seconds=0).status, 'SCAN_UNAVAILABLE')
            run.assert_not_called()

    def test_stale_or_missing_signatures_cannot_produce_clean(self):
        with patch.object(guard.subprocess, 'run') as run:
            missing = self.root / 'no-signatures'
            verdict = guard.scan_source(self.source, scanner=self.scanner,
                                        signature_dir=missing)
            self.assertEqual((verdict.status, verdict.code),
                             ('SCAN_UNAVAILABLE', 'SIGNATURES_STALE_OR_MISSING'))
            import time
            old = time.time() - guard.MAX_SIGNATURE_AGE_SECONDS - 60
            os.utime(self.signatures / 'daily.cvd', (old, old))
            verdict = guard.scan_source(self.source, scanner=self.scanner,
                                        signature_dir=self.signatures)
            self.assertEqual((verdict.status, verdict.code),
                             ('SCAN_UNAVAILABLE', 'SIGNATURES_STALE_OR_MISSING'))
            run.assert_not_called()

    def test_source_symlinks_and_oversized_sources_fail_closed(self):
        link = self.root / 'link.docx'
        link.symlink_to(self.source)
        self.assertEqual(guard.scan_source(link).code, 'SOURCE_INVALID')
        oversized = self.root / 'oversized.pdf'
        with oversized.open('wb') as handle:
            handle.truncate(guard.MAX_SOURCE_BYTES + 1)
        self.assertEqual(guard.scan_source(oversized).code, 'SOURCE_TOO_LARGE')

    def test_missing_source_fails_without_emitting_paths(self):
        target = self.root / 'does-not-exist-private-name.docx'
        verdict = guard.scan_source(target)
        self.assertEqual((verdict.status, verdict.code), ('REJECTED', 'SOURCE_INVALID'))
        self.assertNotIn(str(target), json.dumps(verdict.public_dict()))


if __name__ == '__main__':
    unittest.main()
