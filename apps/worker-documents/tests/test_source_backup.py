"""Synthetic-only backup and restoration tests; never use production manuscripts."""
from __future__ import annotations

import hashlib
import importlib.util
import os
import tempfile
import unittest
import uuid
from pathlib import Path

module = Path(__file__).resolve().parents[1] / "source_backup.py"
spec = importlib.util.spec_from_file_location("source_backup", module)
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)


class SourceBackupTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="bs-backup-")
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.vault = self.root / "vault"
        self.vault.mkdir(mode=0o700)
        self.source = self.root / "source.bin"
        self.data = b"synthetic private bytes\x00" * 390
        self.source.write_bytes(self.data)
        self.source.chmod(0o600)
        self.size = len(self.data)
        self.sha = hashlib.sha256(self.data).hexdigest()
        self.book_id = str(uuid.uuid4())
        self.source_id = str(uuid.uuid4())
        self.key = bytes.fromhex("f4" * 32)

    def create(self):
        return backup.create_backup(self.source, self.vault, self.book_id, self.source_id,
                                    expected_size=self.size, expected_sha256=self.sha, key=self.key)

    def test_roundtrip_exact_binary_bytes_and_inventory(self):
        first = self.create()
        second = self.create()
        self.assertNotEqual(first["backupId"], second["backupId"])
        versions = backup.inventory(self.vault, self.book_id, self.source_id, key=self.key)
        self.assertEqual(len(versions["versions"]), 2)
        destination = self.root / "restored.bin"
        result = backup.restore_backup(self.vault, first["backupId"], self.book_id,
                                       self.source_id, destination, confirm="RESTORE_NEW_COPY",
                                       key=self.key)
        self.assertEqual(result["status"], "RESTORED_NEW_COPY")
        self.assertEqual(destination.read_bytes(), self.data)
        self.assertEqual(destination.stat().st_mode & 0o777, 0o600)
        self.assertEqual((self.vault / first["backupId"] / "manifest.json").stat().st_mode & 0o777, 0o600)

    def test_rejects_wrong_book_source_and_wrong_key(self):
        row = self.create()
        with self.assertRaisesRegex(backup.BackupError, "BACKUP_SCOPE_MISMATCH"):
            backup.verify_backup(self.vault, row["backupId"], str(uuid.uuid4()),
                                 self.source_id, key=self.key)
        with self.assertRaisesRegex(backup.BackupError, "BACKUP_SCOPE_MISMATCH"):
            backup.verify_backup(self.vault, row["backupId"], self.book_id,
                                 str(uuid.uuid4()), key=self.key)
        with self.assertRaisesRegex(backup.BackupError, "MANIFEST_AUTH_FAILED"):
            backup.verify_backup(self.vault, row["backupId"], self.book_id,
                                 self.source_id, key=b"x" * 32)

    def test_corruption_and_manifest_modification_are_detected(self):
        row = self.create()
        binary = self.vault / row["backupId"] / "content.bin"
        binary.write_bytes(b"corrupted bytes")
        with self.assertRaisesRegex(backup.BackupError, "BACKUP_CHECKSUM_FAILED"):
            backup.verify_backup(self.vault, row["backupId"], self.book_id,
                                 self.source_id, key=self.key)
        binary.write_bytes(self.data)
        manifest = self.vault / row["backupId"] / "manifest.json"
        text = manifest.read_text().replace(self.sha, "a" * 64)
        manifest.write_text(text)
        with self.assertRaisesRegex(backup.BackupError, "MANIFEST_AUTH_FAILED"):
            backup.verify_backup(self.vault, row["backupId"], self.book_id,
                                 self.source_id, key=self.key)

    def test_restore_requires_consent_and_never_overwrites_existing(self):
        row = self.create()
        destination = self.root / "already-exists"
        destination.write_bytes(b"original remains unchanged")
        destination.chmod(0o600)
        with self.assertRaisesRegex(backup.BackupError, "RESTORE_CONSENT_REQUIRED"):
            backup.restore_backup(self.vault, row["backupId"], self.book_id,
                                  self.source_id, destination, confirm="", key=self.key)
        with self.assertRaisesRegex(backup.BackupError, "DESTINATION_EXISTS_OR_INVALID"):
            backup.restore_backup(self.vault, row["backupId"], self.book_id,
                                  self.source_id, destination, confirm="RESTORE_NEW_COPY", key=self.key)
        self.assertEqual(destination.read_bytes(), b"original remains unchanged")

    def test_rejects_symlinks_oversized_and_invalid_evidence(self):
        alias = self.root / "alias.bin"
        alias.symlink_to(self.source)
        with self.assertRaisesRegex(backup.BackupError, "SOURCE_INVALID"):
            backup.create_backup(alias, self.vault, self.book_id, self.source_id,
                                 expected_size=self.size, expected_sha256=self.sha, key=self.key)
        with self.assertRaisesRegex(backup.BackupError, "SOURCE_MISMATCH"):
            backup.create_backup(self.source, self.vault, self.book_id, self.source_id,
                                 expected_size=self.size, expected_sha256="a" * 64, key=self.key)
        with self.assertRaisesRegex(backup.BackupError, "EXPECTED_EVIDENCE_INVALID"):
            backup.create_backup(self.source, self.vault, self.book_id, self.source_id,
                                 expected_size=0, expected_sha256=self.sha, key=self.key)
        huge = self.root / "huge"
        with huge.open("wb") as f:
            f.truncate(backup.MAX_BYTES + 1)
        huge.chmod(0o600)
        with self.assertRaisesRegex(backup.BackupError, "SOURCE_SIZE_INVALID"):
            backup.create_backup(huge, self.vault, self.book_id, self.source_id,
                                 expected_size=self.size, expected_sha256=self.sha, key=self.key)

    def test_enforces_private_directories_and_incomplete_stage(self):
        public = self.root / "public"
        public.mkdir(mode=0o777)
        public.chmod(0o755)
        with self.assertRaisesRegex(backup.BackupError, "DIRECTORY_NOT_PRIVATE"):
            backup.create_backup(self.source, public, self.book_id, self.source_id,
                                 expected_size=self.size, expected_sha256=self.sha, key=self.key)
        (self.vault / ".pending-incomplete").mkdir(mode=0o700)
        with self.assertRaisesRegex(backup.BackupError, "INCOMPLETE_BACKUP_PRESENT"):
            backup.inventory(self.vault, self.book_id, self.source_id, key=self.key)

    def test_no_paths_or_manuscript_content_in_structured_response(self):
        row = self.create()
        self.assertNotIn(str(self.source), str(row))
        self.assertNotIn(str(self.vault), str(row))
        self.assertNotIn("synthetic private", str(row))


if __name__ == "__main__":
    unittest.main()
