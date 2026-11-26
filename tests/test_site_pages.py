import json
import re
import unittest
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, filename):
        super().__init__()
        self.stack = []
        self.text = {"main": [], "footer": [], "h1": []}
        self.links = []
        self.menu = []
        self.ids = []
        self.scripts = []
        self.intro_count = 0
        self.feed((ROOT / filename).read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "script" and "src" in attrs:
            self.scripts.append(attrs["src"])
        if "site-intro" in attrs.get("class", "").split():
            self.intro_count += 1
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if tag == "a":
            self.links.append(attrs["href"])
            if self.stack and "menu-panel" in self.stack[-1][1].get("class", "").split():
                self.menu.append(attrs)
        if tag not in {"meta", "link", "img", "input", "br", "path"}:
            self.stack.append((tag, attrs))

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        if any("hidden" in attrs for _, attrs in self.stack):
            return
        tags = {tag for tag, _ in self.stack}
        for tag in self.text.keys() & tags:
            self.text[tag].append(data)

    def content(self, tag):
        return " ".join(" ".join(self.text[tag]).split())


class SitePageTests(unittest.TestCase):
    def setUp(self):
        self.pages = {
            name: Page(name) for name in (
                "index.html", "about.html", "contact.html",
                "architecture.html", "interiors.html", "landscape.html",
            )
        }

    def test_logo_extends_the_arrow_silhouette_without_clipping(self):
        svg = ET.parse(ROOT / "assets/ahk-logo.svg").getroot()
        namespace = {"svg": "http://www.w3.org/2000/svg"}
        self.assertEqual(svg.findall(".//svg:rect", namespace), [])
        outline, artwork = svg.findall("svg:path", namespace)[:2]
        self.assertEqual(outline.attrib["d"], artwork.attrib["d"])
        self.assertEqual(outline.attrib["fill"], "#000")
        self.assertEqual(outline.attrib["stroke"], "#000")
        self.assertEqual(artwork.attrib["fill"], "#fff")
        stroke = float(outline.attrib["stroke-width"])
        self.assertGreater(stroke, float(artwork.attrib["stroke-width"]))
        self.assertEqual(outline.attrib["stroke-linejoin"], "round")
        self.assertEqual(set(re.findall(r"[A-Za-z]", outline.attrib["d"])), {"M", "Z"})
        coordinates = [
            float(value) for value in re.findall(r"-?\d+(?:\.\d+)?", outline.attrib["d"])
        ]
        left, top, width, height = map(float, svg.attrib["viewBox"].split())
        self.assertGreaterEqual(min(coordinates[::2]) - stroke / 2, left)
        self.assertLessEqual(max(coordinates[::2]) + stroke / 2, left + width)
        self.assertGreaterEqual(min(coordinates[1::2]) - stroke / 2, top)
        self.assertLessEqual(max(coordinates[1::2]) + stroke / 2, top + height)

    def test_logo_styles_do_not_add_a_rectangular_backing(self):
        for filename in ("styles.css", "theme.css"):
            css = (ROOT / filename).read_text(encoding="utf-8")
            for rule in re.finditer(r"([^{}]+)\{([^{}]*)\}", css):
                selector, declarations = rule.groups()
                if not re.search(r"\.(?:brand|intro)-logo\b", selector):
                    continue
                with self.subTest(stylesheet=filename, selector=selector.strip()):
                    properties = re.findall(r"([\w-]+)\s*:", declarations)
                    for property_name in ("background", "background-color", "box-shadow", "border"):
                        self.assertNotIn(property_name, properties)

    def test_only_home_has_an_intro_and_all_pages_record_the_visit(self):
        for filename, page in self.pages.items():
            with self.subTest(page=filename):
                self.assertIn("./site-intro.js", page.scripts)
                self.assertEqual(page.intro_count, 1 if filename == "index.html" else 0)

    def test_home_starts_with_projects_without_moved_copy(self):
        home = self.pages["index.html"]
        self.assertEqual(home.content("h1"), "Featured projects")
        for text in ("Spaces that feel", "Thoughtful homes", "Have a space in mind?",
                     "Let’s make it", "Project enquiries", "Tell us about your space."):
            with self.subTest(text=text):
                self.assertNotIn(text, home.content("main") + home.content("footer"))
        self.assertNotIn("contact", home.ids)
        self.assertIn("AHK Architects", home.content("footer"))

    def test_about_contains_original_introduction(self):
        about = self.pages["about.html"]
        self.assertEqual(about.content("h1"), "Spaces that feel like you.")
        text = about.content("main")
        self.assertIn("Arishella Harish Kumar · Interior architect", text)
        self.assertIn("Thoughtful homes, shaped around the way you live.", text)
        self.assertIn("every space is made with clarity, warmth, and purpose.", text)

    def test_contact_merges_invitation_and_preserves_contact_methods(self):
        contact = self.pages["contact.html"]
        self.assertEqual(contact.content("h1"), "Contact us.")
        for text in ("Have a space in mind?", "Let’s make it feel like home.",
                     "Project enquiries Tell us about your space.", "Arishella Harish Kumar"):
            with self.subTest(text=text):
                self.assertIn(text, contact.content("main"))
        for link in ("tel:+917780412526", "https://wa.me/917780412526",
                     "mailto:arishellaharish@gmail.com"):
            self.assertIn(link, contact.links)
        self.assertEqual(contact.content("main").count("Tell us about your space."), 1)

    def test_services_have_separate_pages_not_home_sections(self):
        home = self.pages["index.html"]
        for service in ("architecture", "interiors", "landscape"):
            with self.subTest(service=service):
                page = self.pages[service + ".html"]
                self.assertEqual(page.content("h1"), service.title())
                self.assertNotIn(service, home.ids)
                self.assertNotIn(service.title(), home.content("main"))
                self.assertIn("./projects.js", page.scripts)
                self.assertIn("project-list", page.ids)
                self.assertIn("project-page", page.ids)
                self.assertIn("project-catalogue", page.ids)
                self.assertNotIn("project-dialog", page.ids)
                self.assertIn(f"./{service}.html", page.links)
                self.assertNotIn("Coming soon.", page.content("main"))

    def test_projects_live_only_in_their_sections_with_simple_metadata(self):
        home = json.loads((ROOT / "projects/index.json").read_text())
        expected = {
            "architecture": ["01-jessy-duplex-residence", "02-sudeep-duplex-residence"],
            "interiors": ["01-office-space", "02-mr-karuna-rao"],
            "landscape": ["01-shatam-lake", "02-banda-cheruvu"],
        }
        self.assertEqual(home, [
            f"{section}/{slugs[0]}" for section, slugs in expected.items()
        ])
        self.assertEqual(list((ROOT / "projects").iterdir()), [ROOT / "projects/index.json"])
        for section, slugs in expected.items():
            catalogue = json.loads((ROOT / section / "index.json").read_text())
            self.assertEqual(catalogue, slugs)
            for slug in slugs:
                with self.subTest(section=section, project=slug):
                    folder = ROOT / section / slug
                    metadata = json.loads((folder / "metadata.json").read_text())
                    self.assertEqual(set(metadata), {"title", "location", "images"})
                    self.assertTrue(metadata["images"])
                    for image in metadata["images"]:
                        self.assertTrue((folder / image).is_file())

    def test_all_menus_reach_separate_pages(self):
        for filename, page in self.pages.items():
            with self.subTest(page=filename):
                self.assertEqual(len(page.ids), len(set(page.ids)))
                self.assertEqual(len(page.menu), 6)
                self.assertEqual(
                    [link["href"] for link in page.menu if link.get("aria-current") == "page"],
                    ["./" if filename == "index.html" else "./" + filename],
                )
                self.assertIn("./about.html", [link["href"] for link in page.menu])
                self.assertIn("./contact.html", [link["href"] for link in page.menu])
                for service in ("architecture", "interiors", "landscape"):
                    self.assertIn("./" + service + ".html", [link["href"] for link in page.menu])
                for link in page.menu:
                    url = urlsplit(link["href"])
                    self.assertEqual(url.fragment, "")
                    target = url.path.removeprefix("./") or (
                        filename if url.fragment else "index.html"
                    )
                    if url.path == "./":
                        target = "index.html"
                    self.assertIn(target, self.pages)
                    if url.fragment:
                        self.assertIn(url.fragment, self.pages[target].ids)


if __name__ == "__main__":
    unittest.main()
