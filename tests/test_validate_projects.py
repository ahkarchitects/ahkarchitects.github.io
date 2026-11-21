import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from scripts.validate_projects import MAX_COVER_BYTES, validate_projects


class ProjectValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.projects = self.root / "projects"
        self.folder = self.projects / "01-house"
        self.folder.mkdir(parents=True)
        self.index = self.projects / "index.json"
        self.index.write_text('["01-house"]', encoding="utf-8")
        self.metadata = self.folder / "metadata.json"
        self.data = {
            "title": "House",
            "type": "Concept",
            "description": "A quiet home.",
            "location": "Bengaluru",
            "scope": [],
            "cover": {"file": "cover.png", "alt": "House exterior"},
        }
        self.write_metadata()
        self.cover = self.folder / "cover.png"
        Image.new("RGB", (4, 4)).save(self.cover)

    def write_metadata(self):
        self.metadata.write_text(json.dumps(self.data), encoding="utf-8")

    def errors(self):
        return "\n".join(validate_projects(self.root))

    def test_valid_project_ignores_additional_images(self):
        (self.folder / "extra.jpg").write_bytes(b"not an image")
        self.assertEqual(validate_projects(self.root), [])

    def test_invalid_catalogue(self):
        for value in ({}, ["../house"], ["House"], [1], ["01-house", "01-house"]):
            with self.subTest(value=value):
                self.index.write_text(json.dumps(value), encoding="utf-8")
                self.assertIn("index.json:", self.errors())

    def test_catalogue_matches_directories(self):
        self.index.write_text('["missing-house"]', encoding="utf-8")
        errors = self.errors()
        self.assertIn("project folder is not listed: 01-house", errors)
        self.assertIn("missing-house: listed project must be an existing directory", errors)

    def test_missing_or_malformed_metadata(self):
        self.metadata.unlink()
        self.assertIn("metadata.json:", self.errors())
        for text in ("{", "[]", '{"title":"one","title":"two"}'):
            with self.subTest(text=text):
                self.metadata.write_text(text, encoding="utf-8")
                self.assertIn("metadata.json:", self.errors())

    def test_unsupported_and_missing_metadata_fields(self):
        self.data["order"] = 1
        del self.data["location"]
        self.data["title"] = " "
        self.write_metadata()
        errors = self.errors()
        self.assertIn("only these required fields", errors)
        self.assertIn("location must be nonempty text", errors)
        self.assertIn("title must be nonempty text", errors)

    def test_supported_scopes_only(self):
        for scope in (["Random"], ["Interior design", "Interior design"], [{}], "Interior design"):
            with self.subTest(scope=scope):
                self.data["scope"] = scope
                self.write_metadata()
                self.assertIn("unique supported services only", self.errors())

    def test_invalid_cover_metadata(self):
        for cover in (
            {"file": "../cover.png", "alt": "House"},
            {"file": "cover.png", "alt": ""},
            {"file": "cover.png", "alt": "House", "random": True},
        ):
            with self.subTest(cover=cover):
                self.data["cover"] = cover
                self.write_metadata()
                self.assertIn("cover", self.errors())

    def test_missing_corrupt_and_mislabeled_cover(self):
        self.cover.unlink()
        self.assertIn("invalid cover", self.errors())
        self.cover.write_bytes(b"not an image")
        self.assertIn("invalid cover", self.errors())
        Image.new("RGB", (4, 4)).save(self.cover, format="JPEG")
        self.assertIn("do not match the filename extension", self.errors())
        Image.new("RGB", (40, 40)).save(self.cover)
        self.cover.write_bytes(self.cover.read_bytes()[:45])
        self.assertIn("invalid cover", self.errors())

    def test_exact_cover_size_boundary(self):
        original = self.cover.read_bytes()
        self.cover.write_bytes(original + b"\0" * (MAX_COVER_BYTES - len(original)))
        self.assertEqual(validate_projects(self.root), [])
        self.cover.write_bytes(self.cover.read_bytes() + b"\0")
        self.assertIn("maximum is 256000 bytes", self.errors())

    def test_symlink_cover_is_rejected(self):
        target = self.root / "outside.png"
        self.cover.rename(target)
        self.cover.symlink_to(target)
        self.assertIn("not a symbolic link", self.errors())

    def add_gallery(self):
        self.gallery_image = self.folder / "bedroom.png"
        Image.new("RGB", (4, 4)).save(self.gallery_image)
        self.data["gallery"] = ["bedroom.png"]
        self.write_metadata()

    def test_valid_optional_gallery(self):
        self.add_gallery()
        self.assertEqual(validate_projects(self.root), [])
        self.data["gallery"] = []
        self.write_metadata()
        self.assertEqual(validate_projects(self.root), [])

    def test_invalid_gallery_metadata(self):
        self.add_gallery()
        for gallery in (
            None,
            {},
            [None],
            [1],
            [""],
            ["../bedroom.png"],
            [{"file": "bedroom.png"}],
            ["bedroom.png", "bedroom.png"],
            ["cover.png"],
        ):
            with self.subTest(gallery=gallery):
                self.data["gallery"] = gallery
                self.write_metadata()
                self.assertIn("gallery", self.errors())

    def test_missing_corrupt_mislabeled_and_symlink_gallery_images(self):
        self.add_gallery()
        self.gallery_image.unlink()
        self.assertIn("invalid gallery[0]", self.errors())
        self.gallery_image.write_bytes(b"not an image")
        self.assertIn("invalid gallery[0]", self.errors())
        Image.new("RGB", (4, 4)).save(self.gallery_image, format="JPEG")
        self.assertIn("do not match the filename extension", self.errors())
        target = self.root / "outside.png"
        self.gallery_image.rename(target)
        self.gallery_image.symlink_to(target)
        self.assertIn("not a symbolic link", self.errors())

    def test_exact_gallery_size_boundary(self):
        self.add_gallery()
        original = self.gallery_image.read_bytes()
        self.gallery_image.write_bytes(original + b"\0" * (MAX_COVER_BYTES - len(original)))
        self.assertEqual(validate_projects(self.root), [])
        self.gallery_image.write_bytes(self.gallery_image.read_bytes() + b"\0")
        self.assertIn("maximum is 256000 bytes", self.errors())


if __name__ == "__main__":
    unittest.main()
