import unittest
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
        self.feed((ROOT / filename).read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if tag == "a":
            self.links.append(attrs["href"])
            if any("menu-panel" in entry.get("class", "").split() for _, entry in self.stack):
                self.menu.append(attrs)
        if tag not in {"meta", "link", "img", "input", "br", "path"}:
            self.stack.append((tag, attrs))

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        tags = {tag for tag, _ in self.stack}
        for tag in self.text.keys() & tags:
            self.text[tag].append(data)

    def content(self, tag):
        return " ".join(" ".join(self.text[tag]).split())


class SitePageTests(unittest.TestCase):
    def setUp(self):
        self.pages = {name: Page(name) for name in ("index.html", "about.html", "contact.html")}

    def test_home_starts_with_projects_without_moved_copy(self):
        home = self.pages["index.html"]
        self.assertEqual(home.content("h1"), "Selected projects")
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

    def test_all_menus_reach_pages_and_service_sections(self):
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
                for link in page.menu:
                    url = urlsplit(link["href"])
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
