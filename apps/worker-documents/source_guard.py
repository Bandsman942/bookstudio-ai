"""Fail-closed offline antivirus adapter for an ISOLATED BookStudio worker.

Only scans bytes already downloaded into a private worker directory. This module
does not download from Supabase, grant access, update Neon, or quarantine Storage
objects. A clean result is NOT yet a trusted application attestation.

The executable must be a real, locally installed ClamAV binary on a separately
isolated host. Never run this on Vercel or accept a scanner path from HTTP input.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import stat
import subprocess
import sys
import tempfile
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

MAX_SOURCE_BYTES = 20 * 1024 * 1024
SCAN_TIMEOUT_SECONDS = 120
CLAMAV_BINARY = Path('/usr/bin/clamscan')
SIGNATURES_DIR = Path('/var/lib/clamav')
MAX_SIGNATURE_AGE_SECONDS = 48 * 60 * 60
SHA256_PATTERN = re.compile(r'^[a-fA-F0-9]{64}$')
CHUNK_BYTES = 1024 * 1024


@dataclass(frozen=True)
class ScanVerdict:
    status: str
    code: str
    byteSize: int | None = None
    sha256: str | None = None
    scannerVersion: str | None = None
    scannedAt: str | None = None

    def public_dict(self) -> dict:
        """Contains no source path, manuscript bytes or scanner raw output."""
        return {key: value for key, value in asdict(self).items() if value is not None}


class SourceRejected(Exception):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def _copy_immutable(source: Path, destination: Path) -> tuple[int, str]:
    """Copy bytes to a private exclusive snapshot before invoking ClamAV.

    A file changed during the copy is rejected; ClamAV scans the exact copy
    whose digest is returned rather than a mutable external source path.
    """
    if not hasattr(os, 'O_NOFOLLOW'):
        raise SourceRejected('PLATFORM_UNSUPPORTED')
    try:
        # Reject symlinks in parent components too, not only the final file.
        if source.absolute() != source.resolve(strict=True):
            raise SourceRejected('SOURCE_INVALID')
        source_fd = os.open(source, os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC)
    except (OSError, RuntimeError):
        raise SourceRejected('SOURCE_INVALID') from None

    with os.fdopen(source_fd, 'rb') as src:
        before = os.fstat(src.fileno())
        if not stat.S_ISREG(before.st_mode) or before.st_size < 1:
            raise SourceRejected('SOURCE_INVALID')
        if before.st_size > MAX_SOURCE_BYTES:
            raise SourceRejected('SOURCE_TOO_LARGE')
        flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC
        target_fd = os.open(destination, flags, 0o600)
        sha = hashlib.sha256()
        count = 0
        with os.fdopen(target_fd, 'wb') as out:
            while chunk := src.read(CHUNK_BYTES):
                count += len(chunk)
                if count > MAX_SOURCE_BYTES:
                    raise SourceRejected('SOURCE_TOO_LARGE')
                sha.update(chunk)
                out.write(chunk)
            out.flush()
            os.fsync(out.fileno())
        after = os.fstat(src.fileno())
        if (count != before.st_size or after.st_size != before.st_size or
                before.st_mtime_ns != after.st_mtime_ns or
                before.st_ctime_ns != after.st_ctime_ns):
            raise SourceRejected('SOURCE_CHANGED')
    return count, sha.hexdigest()


def _digest(path: Path) -> str:
    sha = hashlib.sha256()
    with path.open('rb') as handle:
        while chunk := handle.read(CHUNK_BYTES):
            sha.update(chunk)
    return sha.hexdigest()


def _clamav_version(scanner: Path) -> str | None:
    """Use an absolute, non-symlink executable; never a browser supplied path."""
    if not scanner.is_absolute():
        return None
    try:
        info = scanner.lstat()
        if not stat.S_ISREG(info.st_mode) or not os.access(scanner, os.X_OK):
            return None
        result = subprocess.run([str(scanner), '--version'], check=False,
                                stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                text=True, timeout=10)
    except (OSError, subprocess.TimeoutExpired):
        return None
    line = result.stdout.splitlines()[0].strip() if result.stdout else ''
    if result.returncode != 0 or not line.startswith('ClamAV '):
        return None
    if len(line) > 100 or not re.fullmatch(r'[\x20-\x7e]+', line):
        return None
    return line


def _signatures_fresh(directory: Path) -> bool:
    """Require a recently updated official daily database in the selected dir.

    The isolated host must additionally verify signature authenticity, control
    filesystem ownership and monitor `freshclam`; mtime alone is not an
    attestation of authentic signatures.
    """
    try:
        if not directory.is_absolute() or directory.is_symlink() or not directory.is_dir():
            return False
        now = time.time()
        for name in ('daily.cvd', 'daily.cld'):
            path = directory / name
            try:
                info = path.lstat()
            except OSError:
                continue
            if (stat.S_ISREG(info.st_mode) and info.st_size > 1024 and
                    0 <= now - info.st_mtime <= MAX_SIGNATURE_AGE_SECONDS):
                return True
    except OSError:
        return False
    return False


def scan_source(source: Path, *, expected_size: int | None = None,
                expected_sha256: str | None = None,
                scanner: Path = CLAMAV_BINARY,
                signature_dir: Path = SIGNATURES_DIR,
                timeout_seconds: int = SCAN_TIMEOUT_SECONDS) -> ScanVerdict:
    """Scan exact snapshotted bytes, without touching application state.

    All operational errors fail closed. `SCANNED_CLEAN` means only that this
    offline ClamAV process returned clean on these bytes; the application MUST
    still verify worker identity, storage immutability and persistence.
    """
    if (expected_size is not None and
            (type(expected_size) is not int or not 1 <= expected_size <= MAX_SOURCE_BYTES)):
        return ScanVerdict('REJECTED', 'EXPECTED_SIZE_INVALID')
    if expected_sha256 is not None and not SHA256_PATTERN.fullmatch(expected_sha256):
        return ScanVerdict('REJECTED', 'EXPECTED_SHA256_INVALID')
    if type(timeout_seconds) is not int or not 1 <= timeout_seconds <= 300:
        return ScanVerdict('SCAN_UNAVAILABLE', 'SCANNER_CONFIGURATION_INVALID')

    try:
        with tempfile.TemporaryDirectory(prefix='bookstudio-source-guard-') as work:
            snapshot = Path(work) / 'source.bin'
            try:
                size, digest = _copy_immutable(Path(source), snapshot)
            except SourceRejected as exc:
                return ScanVerdict('REJECTED', exc.code)
            except OSError:
                return ScanVerdict('SCAN_UNAVAILABLE', 'SOURCE_COPY_FAILED')

            if ((expected_size is not None and size != expected_size) or
                    (expected_sha256 is not None and digest != expected_sha256.lower())):
                return ScanVerdict('REJECTED', 'SOURCE_MISMATCH', size, digest)

            if not _signatures_fresh(signature_dir):
                return ScanVerdict('SCAN_UNAVAILABLE', 'SIGNATURES_STALE_OR_MISSING', size, digest)

            version = _clamav_version(scanner)
            if version is None:
                return ScanVerdict('SCAN_UNAVAILABLE', 'SCANNER_UNAVAILABLE', size, digest)
            try:
                # Without these options ClamAV may skip oversized, deeply nested
                # or encrypted content while returning success. Never silently
                # classify such a partial inspection as clean.
                result = subprocess.run([
                    str(scanner), '--no-summary', '--alert-exceeds-max=yes',
                    '--alert-encrypted=yes', '--max-filesize=32M',
                    '--max-scansize=160M', '--max-recursion=16',
                    '--max-scantime=0', '--database='+str(signature_dir),
                    '--', str(snapshot)],
                                        check=False, stdout=subprocess.DEVNULL,
                                        stderr=subprocess.DEVNULL, timeout=timeout_seconds)
            except subprocess.TimeoutExpired:
                return ScanVerdict('SCAN_UNAVAILABLE', 'SCANNER_TIMEOUT', size, digest)
            except OSError:
                return ScanVerdict('SCAN_UNAVAILABLE', 'SCANNER_UNAVAILABLE', size, digest)

            # Unexpected modification of the private scan copy invalidates any
            # positive verdict, including an exit-0 response.
            try:
                if _digest(snapshot) != digest:
                    return ScanVerdict('SCAN_UNAVAILABLE', 'SNAPSHOT_CHANGED', size, digest)
            except OSError:
                return ScanVerdict('SCAN_UNAVAILABLE', 'SNAPSHOT_LOST', size, digest)

            stamp = datetime.now(timezone.utc).isoformat()
            if result.returncode == 0:
                return ScanVerdict('SCANNED_CLEAN', 'CLEAN', size, digest, version, stamp)
            if result.returncode == 1:
                # ClamAV exit 1 includes signature detections AND policy alerts
                # (encrypted/limits exceeded); do not falsely label all as malware.
                return ScanVerdict('REJECTED', 'THREAT_OR_POLICY_REJECTED', size, digest, version, stamp)
            return ScanVerdict('SCAN_UNAVAILABLE', 'SCANNER_ERROR', size, digest)
    except OSError:
        return ScanVerdict('SCAN_UNAVAILABLE', 'ISOLATED_TEMP_UNAVAILABLE')


def main() -> int:
    parser = argparse.ArgumentParser(description='BookStudio isolated source scanner (not a web endpoint)')
    parser.add_argument('--source', required=True, type=Path,
                        help='Local private input path, provisioned by the isolated worker')
    parser.add_argument('--expected-size', type=int)
    parser.add_argument('--expected-sha256')
    args = parser.parse_args()
    verdict = scan_source(args.source, expected_size=args.expected_size,
                          expected_sha256=args.expected_sha256)
    print(json.dumps(verdict.public_dict(), sort_keys=True))
    return {'SCANNED_CLEAN': 0, 'REJECTED': 2, 'SCAN_UNAVAILABLE': 3}[verdict.status]


if __name__ == '__main__':
    sys.exit(main())
