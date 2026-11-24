import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class SharedServiceBuildTests(unittest.TestCase):
    def test_shared_layout_renders_independent_data_and_service_assets(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory)
            shutil.copy(ROOT / "_config.yml", source)
            shutil.copytree(ROOT / "_layouts", source / "_layouts")
            shutil.copytree(ROOT / "services", source / "services")
            layout = source / "_layouts" / "service.html"
            layout.write_text(
                layout.read_text(encoding="utf-8").replace(
                    "</main>", '<p class="shared-layout-check">Shared layout</p></main>'
                ),
                encoding="utf-8",
            )
            architecture = source / "services" / "architecture" / "index.md"
            architecture.write_text(
                architecture.read_text(encoding="utf-8")
                .replace("title: Architecture", "title: Architecture & planning")
                .replace("Coming soon.\n", "Architecture content only.\n")
                + '\n![Courtyard]({{ page.assets | relative_url }}/courtyard.svg)\n',
                encoding="utf-8",
            )
            asset = source / "services" / "architecture" / "assets" / "courtyard.svg"
            asset.write_text(
                '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">'
                '<circle cx="5" cy="5" r="4"/></svg>',
                encoding="utf-8",
            )

            result = subprocess.run(
                ["bundle", "exec", "jekyll", "build", "--strict_front_matter",
                 "--source", str(source), "--destination", str(source / "_site")],
                cwd=source,
                env={**os.environ, "BUNDLE_GEMFILE": str(ROOT / "Gemfile")},
                capture_output=True, text=True, check=False,
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            for service in ("architecture", "interiors", "landscape"):
                with self.subTest(service=service):
                    page = (source / "_site" / (service + ".html")).read_text(encoding="utf-8")
                    self.assertIn('class="shared-layout-check"', page)
                    self.assertNotIn("{{", page)
                    self.assertIn(
                        f'href="https://ahkarchitects.github.io/{service}.html"', page
                    )
                    if service == "architecture":
                        self.assertIn(
                            '<h1 id="service-title">Architecture &amp; planning</h1>', page
                        )
                        self.assertIn("<p>Architecture content only.</p>", page)
                        self.assertIn('src="/services/architecture/assets/courtyard.svg"', page)
                    else:
                        self.assertIn("<p>Coming soon.</p>", page)
                        self.assertNotIn("Architecture content only.", page)
                        self.assertNotIn("courtyard.svg", page)
            self.assertEqual(
                (source / "_site/services/architecture/assets/courtyard.svg").read_bytes(),
                asset.read_bytes(),
            )


if __name__ == "__main__":
    unittest.main()
