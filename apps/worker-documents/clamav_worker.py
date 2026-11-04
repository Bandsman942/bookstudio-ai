"""BookStudio isolated Supabase/Neon scan worker (never execute on Vercel).

The only privileged credentials on this host are two M2M keys for BOOKSTUDIO API.
It cannot access the Supabase secret key or Neon database. Results are signed
but NEVER release an object as SCANNED_CLEAN until clean-bucket promotion is built.
"""
from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import re
import signal
import socket
import ssl
import sys
import tempfile
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

from source_guard import MAX_SOURCE_BYTES, scan_source

UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
HEX_RE = re.compile(r"^[0-9a-f]{64}$")
STOP = False


class WorkerFailure(Exception):
    """Expose only this non-sensitive error code in process output."""


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise WorkerFailure("DOWNLOAD_REDIRECT_BLOCKED")


def validate_origin(value: str, *, exact_hostname: str | None = None) -> str:
    try:
        u = urlsplit(value)
        if (u.scheme != "https" or not u.hostname or u.port is not None or
                u.username or u.password or u.path not in ("", "/") or u.query or u.fragment or
                not re.fullmatch(r"[a-z0-9.-]{6,150}", u.hostname)):
            raise ValueError()
        if exact_hostname and u.hostname != exact_hostname:
            raise ValueError()
        return "https://" + u.hostname
    except (ValueError, TypeError):
        raise WorkerFailure("ORIGIN_INVALID") from None


def checked_download_url(value: str, expected_origin: str) -> str:
    """Prevent arbitrary downloads, redirects, credentials, ports and internal IP SSRF."""
    if not isinstance(value, str) or len(value) > 2300:
        raise WorkerFailure("DOWNLOAD_URL_INVALID")
    try:
        u = urlsplit(value)
        expected = urlsplit(validate_origin(expected_origin))
        if (u.scheme != "https" or u.hostname != expected.hostname or
                u.netloc != expected.netloc or u.username or u.password or
                u.port is not None or not u.path.startswith("/storage/v1/object/sign/") or
                not u.query or u.fragment or not re.search(r"(?:^|&)token=[^&]+", u.query)):
            raise ValueError()
        return value
    except (ValueError, TypeError):
        raise WorkerFailure("DOWNLOAD_URL_INVALID") from None


def key(name: str) -> bytes:
    encoded = os.environ.get(name, "")
    if not HEX_RE.fullmatch(encoded):
        raise WorkerFailure("M2M_CREDENTIALS_UNAVAILABLE")
    return bytes.fromhex(encoded)


def config() -> tuple[str, str, bytes, bytes]:
    api = validate_origin(os.environ.get("BOOKSTUDIO_SCAN_API_ORIGIN", ""))
    storage = validate_origin(os.environ.get("BOOKSTUDIO_SCAN_STORAGE_ORIGIN", ""))
    worker_token = key("BOOKSTUDIO_SCAN_WORKER_TOKEN")
    hmac_key = key("BOOKSTUDIO_SCAN_ATTESTATION_HMAC_KEY")
    if hmac.compare_digest(worker_token, hmac_key):
        raise WorkerFailure("M2M_CREDENTIALS_INVALID")
    return api, storage, worker_token, hmac_key


def opener():
    # No inherited HTTP proxy; forbid 3xx and require TLS validation.
    return build_opener(ProxyHandler({}), NoRedirect())


def json_call(api: str, suffix: str, payload: dict, token: bytes, transport=None) -> dict:
    if suffix not in ("/api/internal/source-scans/claim", "/api/internal/source-scans/report"):
        raise WorkerFailure("WORKER_API_INVALID")
    data = json.dumps(payload, sort_keys=True, separators=(",", ":"),
                      ensure_ascii=True).encode("ascii")
    if len(data) > 4096:
        raise WorkerFailure("WORKER_REQUEST_TOO_LARGE")
    transport = transport or opener()
    request = Request(api + suffix, method="POST", data=data,
                      headers={"Content-Type": "application/json",
                               "Authorization": "Bearer " + token.hex(),
                               "Accept": "application/json"})
    try:
        with transport.open(request, timeout=20) as response:
            if response.status != 200:
                raise WorkerFailure("WORKER_API_UNAVAILABLE")
            raw = response.read(8193)
            if len(raw) > 8192:
                raise WorkerFailure("WORKER_RESPONSE_TOO_LARGE")
            parsed = json.loads(raw)
            if not isinstance(parsed, dict):
                raise ValueError()
            return parsed
    except (HTTPError, URLError, ValueError, json.JSONDecodeError, OSError, TimeoutError):
        raise WorkerFailure("WORKER_API_UNAVAILABLE") from None


def validate_ticket(job: dict) -> dict:
    if not isinstance(job, dict) or set(job) != {
        "jobId", "bookId", "storageName", "sourceGeneration",
        "declaredByteSize", "declaredMediaType", "leaseToken", "expiresAt",
        "attempts", "downloadUrl"
    }:
        raise WorkerFailure("JOB_INVALID")
    if not all(isinstance(job[name], str) and UUID_RE.fullmatch(job[name])
               for name in ("jobId", "bookId", "sourceGeneration")):
        raise WorkerFailure("JOB_INVALID")
    if not isinstance(job["leaseToken"], str) or not HEX_RE.fullmatch(job["leaseToken"]):
        raise WorkerFailure("JOB_INVALID")
    if not isinstance(job["storageName"], str) or not re.fullmatch(
            r"[0-9a-f-]{36}-[a-z0-9][a-z0-9._-]{0,95}", job["storageName"]):
        raise WorkerFailure("JOB_INVALID")
    if (type(job["declaredByteSize"]) is not int or not 1 <=
            job["declaredByteSize"] <= MAX_SOURCE_BYTES or
            not isinstance(job["declaredMediaType"], str) or
            not 1 <= len(job["declaredMediaType"]) <= 160):
        raise WorkerFailure("JOB_INVALID")
    if type(job["attempts"]) is not int or not 1 <= job["attempts"] <= 3:
        raise WorkerFailure("JOB_INVALID")
    try:
        expires = datetime.fromisoformat(job["expiresAt"].replace("Z", "+00:00"))
        if (expires.tzinfo is None or
                (expires - datetime.now(timezone.utc)).total_seconds() <= 1):
            raise ValueError()
    except (ValueError, TypeError, AttributeError):
        raise WorkerFailure("JOB_EXPIRED") from None
    return job


def download_source(url: str, path: Path, expected_size: int,
                    storage_origin: str, transport=None) -> str:
    checked_download_url(url, storage_origin)
    transport = transport or opener()
    try:
        with transport.open(Request(url, method="GET", headers={"Accept": "application/octet-stream"}),
                            timeout=45) as response:
            if response.status != 200:
                raise WorkerFailure("DOWNLOAD_UNAVAILABLE")
            length = response.headers.get("Content-Length")
            if length is not None and (not length.isdigit() or int(length) != expected_size):
                raise WorkerFailure("DOWNLOAD_SIZE_MISMATCH")
            size = 0
            sha = hashlib.sha256()
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL |
                         os.O_CLOEXEC | os.O_NOFOLLOW, 0o600)
            try:
                with os.fdopen(fd, "wb") as output:
                    while True:
                        chunk = response.read(1024 * 1024)
                        if not chunk:
                            break
                        size += len(chunk)
                        if size > MAX_SOURCE_BYTES or size > expected_size:
                            raise WorkerFailure("DOWNLOAD_SIZE_MISMATCH")
                        sha.update(chunk)
                        output.write(chunk)
                    output.flush()
                    os.fsync(output.fileno())
                if size != expected_size:
                    raise WorkerFailure("DOWNLOAD_SIZE_MISMATCH")
                return sha.hexdigest()
            except BaseException:
                path.unlink(missing_ok=True)
                raise
    except (HTTPError, URLError, TimeoutError, OSError, socket.timeout, ssl.SSLError):
        raise WorkerFailure("DOWNLOAD_UNAVAILABLE") from None


def sign_attestation(claim: dict, result: dict, hmac_key: bytes) -> dict:
    """Same ASCII/sorted JSON contract as apps/web/lib/scan-worker-auth.ts."""
    status = result["status"]
    if status not in ("SCANNED_CLEAN", "REJECTED", "SCAN_UNAVAILABLE"):
        raise WorkerFailure("SCAN_RESULT_INVALID")
    packet = {
        "jobId": claim["jobId"], "bookId": claim["bookId"],
        "sourceGeneration": claim["sourceGeneration"],
        "leaseToken": claim["leaseToken"], "nonce": str(uuid.uuid4()),
        "status": status, "byteSize": claim["declaredByteSize"],
        "sha256": result.get("sha256"), "scannerVersion": result.get("scannerVersion"),
        "scannedAt": datetime.now(timezone.utc).isoformat()
    }
    if status == "SCANNED_CLEAN" and (
            not isinstance(packet["sha256"], str) or
            not HEX_RE.fullmatch(packet["sha256"]) or
            not isinstance(packet["scannerVersion"], str) or
            not packet["scannerVersion"].startswith("ClamAV ")):
        raise WorkerFailure("SCAN_RESULT_INVALID")
    canonical = json.dumps(packet, sort_keys=True, separators=(",", ":"),
                           ensure_ascii=True).encode("ascii")
    packet["signature"] = hmac.new(hmac_key, canonical, hashlib.sha256).hexdigest()
    return packet


def process_once(api: str, storage: str, token: bytes, hmac_key: bytes) -> str:
    result = json_call(api, "/api/internal/source-scans/claim", {}, token)
    claim = result.get("job")
    if claim is None:
        return "IDLE"
    claim = validate_ticket(claim)
    try:
        with tempfile.TemporaryDirectory(prefix="bookstudio-scanner-") as folder:
            os.chmod(folder, 0o700)
            source = Path(folder) / "source.bin"
            sha = download_source(claim["downloadUrl"], source,
                                  claim["declaredByteSize"], storage)
            verdict = scan_source(source, expected_size=claim["declaredByteSize"],
                                  expected_sha256=sha)
            evidence = {"status": verdict.status, "sha256": verdict.sha256,
                        "scannerVersion": verdict.scannerVersion}
    except (WorkerFailure, OSError):
        evidence = {"status": "SCAN_UNAVAILABLE", "sha256": None, "scannerVersion": None}
    report = sign_attestation(claim, evidence, hmac_key)
    accepted = json_call(api, "/api/internal/source-scans/report", report, token)
    if accepted.get("accepted") is not True:
        raise WorkerFailure("REPORT_NOT_ACCEPTED")
    return "ATTESTED_" + evidence["status"]


def stop(_signum, _frame):
    global STOP
    STOP = True


def main() -> int:
    parser = argparse.ArgumentParser(description="BookStudio isolated ClamAV worker")
    parser.add_argument("--once", action="store_true", help="One cycle for E2E / supervisor")
    parser.add_argument("--interval", type=int, default=15)
    args = parser.parse_args()
    if not 5 <= args.interval <= 300:
        print('{"status":"CONFIGURATION_INVALID"}')
        return 2
    try:
        api, storage, token, hmac_key = config()
    except WorkerFailure as exc:
        print(json.dumps({"status": str(exc)}))
        return 2
    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    while not STOP:
        try:
            state = process_once(api, storage, token, hmac_key)
            # Only event codes. Never log signed URLs, tokens, titles or file text.
            print(json.dumps({"status": state}), flush=True)
        except WorkerFailure as exc:
            print(json.dumps({"status": str(exc)}), flush=True)
        if args.once:
            break
        time.sleep(args.interval)
    return 0


if __name__ == "__main__":
    sys.exit(main())
