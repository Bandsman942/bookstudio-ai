import hashlib
import hmac
import importlib.util
import json
import os
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch
from urllib.request import Request

MODULE = Path(__file__).resolve().parents[1] / "clamav_worker.py"
sys.path.insert(0, str(MODULE.parent))
spec = importlib.util.spec_from_file_location("clamav_worker", MODULE)
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class FakeResponse:
    def __init__(self, body: bytes, headers=None):
        self.body = body
        self.status = 200
        self.headers = headers or {}
        self.position = 0

    def read(self, size=-1):
        if size < 0:
            size = len(self.body)
        chunk = self.body[self.position:self.position + size]
        self.position += len(chunk)
        return chunk

    def __enter__(self): return self
    def __exit__(self, *args): return False


class FakeTransport:
    def __init__(self, body, headers=None):
        self.body = body
        self.headers = headers or {}
        self.calls = []

    def open(self, request: Request, timeout):
        self.calls.append((request.full_url, request.get_method(), timeout))
        return FakeResponse(self.body, self.headers)


class ClamavWorkerTests(unittest.TestCase):
    def setUp(self):
        self.ticket = {
            "jobId": "0b2a95c0-b53a-4485-9b47-d4149011d561",
            "bookId": "b9f2ffae-9454-40bf-aeb6-743391110e02",
            "storageName": "b9f2ffae-9454-40bf-aeb6-743391110e02-manuscrit.docx",
            "sourceGeneration": "21f9b584-cd99-4b59-a2bb-3fd174e20531",
            "leaseToken": "33" * 32, "declaredByteSize": 30,
            "declaredMediaType": "application/pdf", "attempts": 1,
            "expiresAt": (datetime.now(timezone.utc) + timedelta(minutes=4)).isoformat(),
            "downloadUrl": "https://test-prod.supabase.co/storage/v1/object/sign/private/books/abcd/a.pdf?token=TEST"
        }
        self.api = "https://bookstudio-ai.dtsc-platform.com"
        self.storage = "https://test-prod.supabase.co"

    def test_signed_download_rejects_ssrf_and_redirects(self):
        original = self.ticket["downloadUrl"]
        self.assertEqual(worker.checked_download_url(original, self.storage), original)
        for malicious in [
            "http://test-prod.supabase.co/storage/v1/object/sign/a?token=ok",
            "https://evil.invalid/storage/v1/object/sign/a?token=ok",
            "https://test-prod.supabase.co.evil.invalid/storage/v1/object/sign/a?token=ok",
            "https://test-prod.supabase.co:8443/storage/v1/object/sign/a?token=ok",
            "https://test-prod.supabase.co/storage/v1/object/public/a?token=ok",
            "https://test-prod.supabase.co/storage/v1/object/sign/a",
            "https://user:pass@test-prod.supabase.co/storage/v1/object/sign/a?token=ok"
        ]:
            with self.subTest(malicious=malicious):
                with self.assertRaises(worker.WorkerFailure):
                    worker.checked_download_url(malicious, self.storage)
        with self.assertRaises(worker.WorkerFailure):
            worker.NoRedirect().redirect_request(None, None, 302, "", {}, "https://evil.invalid")

    def test_download_rejects_truncation_and_oversize(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "copy.bin"
            with self.assertRaisesRegex(worker.WorkerFailure, "DOWNLOAD_SIZE_MISMATCH"):
                worker.download_source(self.ticket["downloadUrl"], path, 30, self.storage,
                                       FakeTransport(b"only 12 bytes"))
            self.assertFalse(path.exists())
            bigger = FakeTransport(b"x" * 31)
            with self.assertRaisesRegex(worker.WorkerFailure, "DOWNLOAD_SIZE_MISMATCH"):
                worker.download_source(self.ticket["downloadUrl"], path, 30, self.storage,bigger)
            self.assertFalse(path.exists())
            result = worker.download_source(self.ticket["downloadUrl"], path, 30, self.storage,
                                            FakeTransport(b"x" * 30, {"Content-Length": "30"}))
            self.assertEqual(path.read_bytes(), b"x" * 30)
            self.assertEqual(result, hashlib.sha256(b"x" * 30).hexdigest())
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)

    def test_attestation_hmac_ascii_canonical(self):
        ev = {"status": "SCANNED_CLEAN", "sha256": "44" * 32,
              "scannerVersion": "ClamAV 1.4.3/28001/Wed Nov 4 2026"}
        key = bytes.fromhex("cd" * 32)
        with patch.object(worker.uuid, "uuid4",return_value="c664d053-ab09-4bea-94bb-93c811ee3552"),\
             patch.object(worker, "datetime") as stamp:
            stamp.now.return_value = datetime(2026, 11, 4, 17, 0, 0, tzinfo=timezone.utc)
            p = worker.sign_attestation(self.ticket, ev, key)
        wanted = dict(p)
        signature = wanted.pop("signature")
        calculated = hmac.new(key, json.dumps(wanted, sort_keys=True,
                              separators=(",", ":"),ensure_ascii=True).encode("ascii"),
                              hashlib.sha256).hexdigest()
        self.assertEqual(signature,calculated)
        self.assertEqual(set(p), {"bookId","byteSize","jobId","leaseToken","nonce","scannedAt",
                                 "scannerVersion","sha256","sourceGeneration","status","signature"})
        self.assertEqual(p["status"], "SCANNED_CLEAN")
        with self.assertRaises(worker.WorkerFailure):
            worker.sign_attestation(self.ticket,{"status":"SCANNED_CLEAN","sha256":None,
                                                   "scannerVersion":None},key)

    def test_invalid_identity_and_credentials_fail_closed(self):
        with self.assertRaises(worker.WorkerFailure):
            worker.validate_ticket({**self.ticket,"jobId":"bad"})
        with self.assertRaises(worker.WorkerFailure):
            worker.validate_ticket({**self.ticket,"attempts":4})
        with self.assertRaises(worker.WorkerFailure):
            worker.validate_ticket({**self.ticket,"expiresAt":"2020-01-01T00:00:00+00:00"})
        with patch.dict(os.environ,{"BOOKSTUDIO_SCAN_WORKER_TOKEN":"",
                                   "BOOKSTUDIO_SCAN_ATTESTATION_HMAC_KEY":""}):
            with self.assertRaises(worker.WorkerFailure):
                worker.config()

    def test_process_once_links_lease_download_scan_and_signed_report(self):
        from types import SimpleNamespace
        calls = []
        sha = hashlib.sha256(b"synthetic private bytes").hexdigest()
        def api_call(_api, endpoint, payload, _token):
            calls.append((endpoint, payload))
            if endpoint.endswith("/claim"):
                return {"job": dict(self.ticket)}
            if endpoint.endswith("/report"):
                self.assertEqual(payload["status"], "SCANNED_CLEAN")
                self.assertEqual(payload["sha256"], sha)
                return {"accepted": True, "sourceStatus": "SCAN_PENDING_PROMOTION"}
            raise AssertionError("Unexpected request")
        clean = SimpleNamespace(status="SCANNED_CLEAN", sha256=sha,
                                scannerVersion="ClamAV 1.4.3/28001")
        with patch.object(worker, "json_call", side_effect=api_call), \
             patch.object(worker, "download_source", return_value=sha), \
             patch.object(worker, "scan_source", return_value=clean):
            output = worker.process_once(self.api, self.storage, bytes.fromhex("ab"*32),
                                          bytes.fromhex("cd"*32))
        self.assertEqual(output, "ATTESTED_SCANNED_CLEAN")
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[0][1], {})
        self.assertEqual(calls[1][1]["jobId"], self.ticket["jobId"])
        self.assertEqual(len(calls[1][1]["signature"]), 64)

    def test_failed_download_never_claims_source_clean(self):
        calls = []
        def api_call(_api, endpoint, payload, _token):
            calls.append((endpoint,payload))
            return {"job":dict(self.ticket)} if endpoint.endswith("/claim") else {"accepted":True}
        with patch.object(worker, "json_call", side_effect=api_call), \
             patch.object(worker, "download_source", side_effect=worker.WorkerFailure("DOWNLOAD_UNAVAILABLE")):
            result = worker.process_once(self.api, self.storage, bytes.fromhex("ab"*32),
                                         bytes.fromhex("cd"*32))
        self.assertEqual(result, "ATTESTED_SCAN_UNAVAILABLE")
        self.assertEqual(calls[1][1]["status"], "SCAN_UNAVAILABLE")
        self.assertIsNone(calls[1][1]["sha256"])


if __name__ == "__main__":
    unittest.main()
