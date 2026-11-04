"""Offline append-only binary backup verifier. Not connected to production Storage.

HMAC protects manifest integrity; SHA-256 verifies the copied bytes. Deployment
must provide a separate encrypted, replicated vault and independently held key.
Never log manuscript contents, paths or storage credentials.
"""
from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import re
import shutil
import stat
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path

MAX_BYTES = 20 * 1024 * 1024
BLOCK = 1024 * 1024
SHA_RE = re.compile(r"^[a-f0-9]{64}$")
KEY_ENV = "BOOKSTUDIO_BACKUP_HMAC_KEY"


class BackupError(Exception):
    pass


def _fail(code: str):
    raise BackupError(code)


def _identity(value: str) -> str:
    try:
        canonical = str(uuid.UUID(value))
    except (ValueError, AttributeError, TypeError):
        _fail("IDENTITY_INVALID")
    if value != canonical:
        _fail("IDENTITY_INVALID")
    return canonical


def _private_dir(path: Path) -> Path:
    if not path.is_absolute():
        _fail("DIRECTORY_INVALID")
    try:
        resolved = path.resolve(strict=True)
        meta = path.lstat()
    except OSError:
        _fail("DIRECTORY_INVALID")
    if (resolved != path or not stat.S_ISDIR(meta.st_mode) or
            meta.st_uid != os.getuid() or meta.st_mode & 0o077):
        _fail("DIRECTORY_NOT_PRIVATE")
    return path


def _private_file(path: Path) -> os.stat_result:
    if not path.is_absolute():
        _fail("SOURCE_INVALID")
    try:
        if path.resolve(strict=True) != path:
            _fail("SOURCE_INVALID")
        meta = path.lstat()
    except OSError:
        _fail("SOURCE_INVALID")
    if (not stat.S_ISREG(meta.st_mode) or meta.st_nlink != 1 or
            meta.st_uid != os.getuid() or meta.st_mode & 0o077):
        _fail("SOURCE_NOT_PRIVATE")
    if meta.st_size < 1 or meta.st_size > MAX_BYTES:
        _fail("SOURCE_SIZE_INVALID")
    return meta


def _key() -> bytes:
    encoded = os.getenv(KEY_ENV, "")
    if not re.fullmatch(r"[a-fA-F0-9]{64}", encoded):
        _fail("BACKUP_KEY_UNAVAILABLE")
    return bytes.fromhex(encoded)


def _canonical(doc: dict) -> bytes:
    return json.dumps(doc, sort_keys=True, ensure_ascii=True,
                      separators=(",", ":")).encode("ascii")


def _stamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def _copy(source: Path, dest: Path) -> tuple[int, str]:
    """Copy via exclusive 0600 fd, reject source mutation during copy."""
    _private_file(source)
    if not hasattr(os, "O_NOFOLLOW"):
        _fail("PLATFORM_UNSUPPORTED")
    try:
        fd = os.open(source, os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC)
    except OSError:
        _fail("SOURCE_INVALID")
    with os.fdopen(fd, "rb") as incoming:
        before = os.fstat(incoming.fileno())
        if (not stat.S_ISREG(before.st_mode) or before.st_nlink != 1 or
                before.st_uid != os.getuid() or before.st_mode & 0o077 or
                before.st_size < 1 or before.st_size > MAX_BYTES):
            _fail("SOURCE_INVALID")
        try:
            out_fd = os.open(dest, os.O_WRONLY | os.O_CREAT | os.O_EXCL |
                             os.O_NOFOLLOW | os.O_CLOEXEC, 0o600)
        except OSError:
            _fail("DESTINATION_EXISTS_OR_INVALID")
        digest = hashlib.sha256()
        count = 0
        try:
            with os.fdopen(out_fd, "wb") as out:
                while chunk := incoming.read(BLOCK):
                    count += len(chunk)
                    if count > MAX_BYTES:
                        _fail("SOURCE_SIZE_INVALID")
                    out.write(chunk)
                    digest.update(chunk)
                out.flush()
                os.fsync(out.fileno())
            after = os.fstat(incoming.fileno())
            if (count != before.st_size or after.st_size != before.st_size or
                    after.st_mtime_ns != before.st_mtime_ns or
                    after.st_ctime_ns != before.st_ctime_ns):
                _fail("SOURCE_CHANGED")
            return count, digest.hexdigest()
        except BaseException:
            dest.unlink(missing_ok=True)
            raise


def _digest(path: Path) -> tuple[int, str]:
    _private_file(path)
    sha = hashlib.sha256()
    size = 0
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC)
    with os.fdopen(fd, "rb") as inp:
        while chunk := inp.read(BLOCK):
            size += len(chunk)
            if size > MAX_BYTES:
                _fail("BACKUP_INVALID")
            sha.update(chunk)
    return size, sha.hexdigest()


def _write_manifest(path: Path, payload: dict, key: bytes):
    tag = hmac.new(key, _canonical(payload), hashlib.sha256).hexdigest()
    raw = _canonical({**payload, "hmacSha256": tag})
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL |
                 os.O_NOFOLLOW | os.O_CLOEXEC, 0o600)
    with os.fdopen(fd, "wb") as output:
        output.write(raw)
        output.flush()
        os.fsync(output.fileno())


def _read_manifest(folder: Path, key: bytes) -> dict:
    try:
        path = folder / "manifest.json"
        meta = path.lstat()
        if (not stat.S_ISREG(meta.st_mode) or meta.st_nlink != 1 or
                meta.st_uid != os.getuid() or meta.st_mode & 0o077 or
                meta.st_size < 1 or meta.st_size > 4096):
            _fail("MANIFEST_INVALID")
        payload = json.loads(path.read_text("ascii"))
        if not isinstance(payload, dict):
            _fail("MANIFEST_INVALID")
        tag = payload.pop("hmacSha256", None)
        keys = {"schema", "backupId", "bookId", "sourceId", "byteSize",
                "sha256", "createdAt"}
        if (set(payload) != keys or payload["schema"] != 1 or
                type(payload["byteSize"]) is not int or
                not 1 <= payload["byteSize"] <= MAX_BYTES or
                not isinstance(payload["sha256"], str) or
                not SHA_RE.fullmatch(payload["sha256"]) or
                not isinstance(payload["createdAt"], str) or
                not isinstance(tag, str) or not SHA_RE.fullmatch(tag)):
            _fail("MANIFEST_INVALID")
        for field in ("backupId", "bookId", "sourceId"):
            _identity(payload[field])
        expected = hmac.new(key, _canonical(payload), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, tag):
            _fail("MANIFEST_AUTH_FAILED")
        return payload
    except (OSError, UnicodeError, ValueError, TypeError, KeyError):
        _fail("MANIFEST_INVALID")


def _folder(vault: Path, backup_id: str) -> Path:
    _private_dir(vault)
    folder = vault / _identity(backup_id)
    _private_dir(folder)
    return folder


def create_backup(source: Path, vault: Path, book_id: str, source_id: str,
                  *, expected_size: int, expected_sha256: str, key: bytes) -> dict:
    _private_dir(vault)
    book_id, source_id = _identity(book_id), _identity(source_id)
    if (type(expected_size) is not int or not 1 <= expected_size <= MAX_BYTES or
            not isinstance(expected_sha256, str) or not SHA_RE.fullmatch(expected_sha256)):
        _fail("EXPECTED_EVIDENCE_INVALID")
    staging = Path(tempfile.mkdtemp(prefix=".pending-", dir=vault))
    try:
        os.chmod(staging, 0o700)
        length, digest = _copy(source, staging / "content.bin")
        if length != expected_size or digest != expected_sha256:
            _fail("SOURCE_MISMATCH")
        backup_id = str(uuid.uuid4())
        payload = {"schema": 1, "backupId": backup_id, "bookId": book_id,
                   "sourceId": source_id, "byteSize": length, "sha256": digest,
                   "createdAt": _stamp()}
        _write_manifest(staging / "manifest.json", payload, key)
        os.rename(staging, vault / backup_id)
        dir_fd = os.open(vault, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(dir_fd)
        finally:
            os.close(dir_fd)
        return {"status": "BACKUP_CREATED", **payload}
    finally:
        if staging.exists():
            shutil.rmtree(staging)


def verify_backup(vault: Path, backup_id: str, book_id: str,
                  source_id: str, *, key: bytes) -> dict:
    folder = _folder(vault, backup_id)
    payload = _read_manifest(folder, key)
    if (payload["backupId"] != backup_id or
            payload["bookId"] != _identity(book_id) or
            payload["sourceId"] != _identity(source_id)):
        _fail("BACKUP_SCOPE_MISMATCH")
    try:
        size, digest = _digest(folder / "content.bin")
    except (OSError, BackupError):
        _fail("BACKUP_INVALID")
    if size != payload["byteSize"] or not hmac.compare_digest(digest, payload["sha256"]):
        _fail("BACKUP_CHECKSUM_FAILED")
    return {"status": "BACKUP_VERIFIED", **payload}


def restore_backup(vault: Path, backup_id: str, book_id: str, source_id: str,
                   destination: Path, *, confirm: str, key: bytes) -> dict:
    if confirm != "RESTORE_NEW_COPY":
        _fail("RESTORE_CONSENT_REQUIRED")
    verified = verify_backup(vault, backup_id, book_id, source_id, key=key)
    if not destination.is_absolute():
        _fail("DESTINATION_INVALID")
    _private_dir(destination.parent)
    if destination == destination.parent:
        _fail("DESTINATION_INVALID")
    # The destination must not exist; copying must never alter an existing source.
    try:
        size, sha = _copy(vault / backup_id / "content.bin", destination)
        if size != verified["byteSize"] or sha != verified["sha256"]:
            _fail("RESTORE_CHECKSUM_FAILED")
        actual_size, actual_sha = _digest(destination)
        if actual_size != size or actual_sha != sha:
            _fail("RESTORE_CHECKSUM_FAILED")
        return {"status": "RESTORED_NEW_COPY", "backupId": backup_id,
                "bookId": book_id, "sourceId": source_id,
                "byteSize": size, "sha256": sha}
    except BaseException:
        # Never delete an already present user file on exclusive-open failure.
        if destination.is_file() and destination.stat().st_size == 0:
            destination.unlink(missing_ok=True)
        raise


def inventory(vault: Path, book_id: str, source_id: str, *, key: bytes) -> dict:
    _private_dir(vault)
    entries = []
    for path in vault.iterdir():
        if path.name.startswith(".pending-"):
            _fail("INCOMPLETE_BACKUP_PRESENT")
        if not path.name.startswith("."):
            if not re.fullmatch(r"[0-9a-f-]{36}", path.name):
                _fail("VAULT_ENTRY_INVALID")
            verified = verify_backup(vault, path.name, book_id, source_id, key=key)
            entries.append({k: verified[k] for k in ("backupId", "byteSize", "sha256", "createdAt")})
    return {"status": "INVENTORY_VERIFIED", "bookId": book_id,
            "sourceId": source_id, "versions": sorted(entries, key=lambda v: v["createdAt"])}


def main() -> int:
    parser = argparse.ArgumentParser(description="BookStudio isolated binary backup verifier")
    parser.add_argument("action", choices=("create", "verify", "restore", "inventory"))
    parser.add_argument("--vault", required=True, type=Path)
    parser.add_argument("--book-id", required=True)
    parser.add_argument("--source-id", required=True)
    parser.add_argument("--backup-id")
    parser.add_argument("--source", type=Path)
    parser.add_argument("--destination", type=Path)
    parser.add_argument("--expected-size", type=int)
    parser.add_argument("--expected-sha256")
    parser.add_argument("--confirm")
    args = parser.parse_args()
    try:
        key = _key()
        if args.action == "create":
            if args.source is None:
                _fail("SOURCE_REQUIRED")
            result = create_backup(args.source, args.vault, args.book_id, args.source_id,
                                   expected_size=args.expected_size,
                                   expected_sha256=args.expected_sha256, key=key)
        elif args.action == "inventory":
            result = inventory(args.vault, args.book_id, args.source_id, key=key)
        elif args.action == "verify":
            result = verify_backup(args.vault, args.backup_id, args.book_id, args.source_id, key=key)
        else:
            if args.destination is None:
                _fail("DESTINATION_REQUIRED")
            result = restore_backup(args.vault, args.backup_id, args.book_id, args.source_id,
                                    args.destination, confirm=args.confirm, key=key)
        print(json.dumps(result, sort_keys=True))
        return 0
    except BackupError as exc:
        print(json.dumps({"status": "REJECTED", "code": str(exc)}))
        return 2
    except (OSError, TypeError):
        print(json.dumps({"status": "UNAVAILABLE", "code": "BACKUP_IO_UNAVAILABLE"}))
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
