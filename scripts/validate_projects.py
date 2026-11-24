"""Validate the portfolio's published project content without changing files."""

import json
import re
import sys
import warnings
from pathlib import Path

from PIL import Image, UnidentifiedImageError


MAX_COVER_BYTES = 250 * 1024
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
COVER_FILE = re.compile(r"[a-z0-9][a-z0-9-]*\.(jpg|jpeg|png|webp|avif)")
FIELDS = {"title", "type", "description", "location", "scope", "cover"}
SCOPES = {"Architecture & planning", "Interior design", "Turnkey execution"}
FORMATS = {"jpg": "JPEG", "jpeg": "JPEG", "png": "PNG", "webp": "WEBP", "avif": "AVIF"}


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def read_json(path):
    if path.is_symlink():
        raise ValueError("must be a regular file, not a symbolic link")
    return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=unique_object)


def nonempty_text(value):
    return isinstance(value, str) and bool(value.strip())


def validate_projects(root, directory="projects", simple=False):
    errors = []
    projects = root / directory

    def report(path, message):
        errors.append(f"{path.relative_to(root)}: {message}")

    def check_image(folder, filename, label):
        if not isinstance(filename, str) or not COVER_FILE.fullmatch(filename):
            field = "cover.file" if label == "cover" else label
            report(folder / "metadata.json", f"{field} must be a supported lowercase image filename in this folder")
            return
        image_path = folder / filename
        try:
            if image_path.is_symlink() or not image_path.is_file():
                raise ValueError(f"{label} must be an existing regular file, not a symbolic link")
            size = image_path.stat().st_size
            if size > MAX_COVER_BYTES:
                report(image_path, f"{label} is {size} bytes; maximum is {MAX_COVER_BYTES} bytes (250 KiB)")
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)
                with Image.open(image_path) as image:
                    if image.format != FORMATS[filename.rsplit(".", 1)[1]]:
                        raise ValueError("image contents do not match the filename extension")
                    image.verify()
                with Image.open(image_path) as image:
                    image.load()
        except (
            OSError,
            ValueError,
            SyntaxError,
            UnidentifiedImageError,
            Image.DecompressionBombError,
            Image.DecompressionBombWarning,
        ) as error:
            report(image_path, f"invalid {label}: {error}")

    if projects.is_symlink() or not projects.is_dir():
        report(projects, "must be a project directory, not a symbolic link")
        return errors

    index = projects / "index.json"
    try:
        slugs = read_json(index)
    except (OSError, ValueError) as error:
        report(index, str(error))
        return errors
    if not isinstance(slugs, list) or any(
        not isinstance(slug, str) or not SLUG.fullmatch(slug) for slug in slugs
    ):
        report(index, "must be an array of lowercase, hyphen-separated folder names")
        return errors
    if len(set(slugs)) != len(slugs):
        report(index, "folder names must be unique")

    folders = {path.name for path in projects.iterdir() if path.is_dir()}
    for slug in sorted(folders - set(slugs)):
        report(index, f"project folder is not listed: {slug}")

    for slug in sorted(set(slugs)):
        folder = projects / slug
        if folder.is_symlink() or not folder.is_dir():
            report(folder, "listed project must be an existing directory, not a symbolic link")
            continue
        metadata = folder / "metadata.json"
        try:
            data = read_json(metadata)
        except (OSError, ValueError) as error:
            report(metadata, str(error))
            continue
        if not isinstance(data, dict):
            report(metadata, "must be a JSON object")
            continue
        if simple:
            if set(data) != {"title", "location", "images"}:
                report(metadata, "must contain only title, location, and images")
            for field in ("title", "location"):
                if not nonempty_text(data.get(field)):
                    report(metadata, f"{field} must be nonempty text")
            images = data.get("images")
            if not isinstance(images, list) or not images:
                report(metadata, "images must be a nonempty array")
                continue
            seen = set()
            for position, filename in enumerate(images):
                if isinstance(filename, str):
                    if filename in seen:
                        report(metadata, f"images[{position}] must be unique")
                    seen.add(filename)
                check_image(folder, filename, f"images[{position}]")
            continue
        if not FIELDS.issubset(data) or set(data) - FIELDS - {"gallery"}:
            report(metadata, f"must contain only these required fields: {', '.join(sorted(FIELDS))}; gallery is optional")
        for field in ("title", "type", "description", "location"):
            if not nonempty_text(data.get(field)):
                report(metadata, f"{field} must be nonempty text")
        scope = data.get("scope")
        if (
            not isinstance(scope, list)
            or any(not isinstance(item, str) or item not in SCOPES for item in scope)
            or len(set(scope)) != len(scope)
        ):
            report(metadata, "scope must contain unique supported services only")
        cover = data.get("cover")
        if not isinstance(cover, dict) or set(cover) != {"file", "alt"}:
            report(metadata, "cover must contain only the required file and alt fields")
            continue
        if not nonempty_text(cover["alt"]):
            report(metadata, "cover.alt must be nonempty text")
        filename = cover["file"]
        check_image(folder, filename, "cover")
        if "gallery" not in data:
            continue
        gallery = data["gallery"]
        if not isinstance(gallery, list):
            report(metadata, "gallery must be an array")
            continue
        seen = {filename} if isinstance(filename, str) else set()
        for index, filename in enumerate(gallery):
            label = f"gallery[{index}]"
            if isinstance(filename, str):
                if filename in seen:
                    report(metadata, f"{label} must be unique and different from the cover")
                seen.add(filename)
            check_image(folder, filename, label)
    return errors


def main():
    root = Path(__file__).resolve().parents[1]
    errors = validate_projects(root) + validate_projects(root, "architecture", simple=True)
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1
    print("Home and Architecture project catalogues, metadata, and images are valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
