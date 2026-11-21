# AHK Interiors

Official static portfolio website for AHK Interiors (Arishella Harish Kumar), built with plain HTML, CSS, and a small JavaScript project-detail view for GitHub Pages. Project content lives in repository folders; no CMS, private credentials, or separate project HTML pages are required.

## Local development

Edit project content in `projects/<project-name>/metadata.json`, the manual folder list in `projects/index.json`, shared layout in `index.html`, and appearance in `styles.css`. No build script, package installation, or custom GitHub Actions workflow is required.

Preview the repository over HTTP using any static web server. If Python is already installed, this optional command starts a local preview server; Python is not a site or deployment dependency:

```sh
python -m http.server 4321 --bind 127.0.0.1
```

Visit `http://127.0.0.1:4321/` and stop the server with Ctrl+C when finished. Use HTTP rather than opening the file directly: browsers restrict fetching project metadata from `file://` URLs.

Content edits take effect after refreshing the preview. There are no generated files to update.

## GitHub Pages deployment

In the repository, open **Settings → Pages** and set **Build and deployment → Source** to **Deploy from a branch**, then select **main** and **/ (root)** and save. If you switched the source to GitHub Actions while trying the earlier build-based approach, switch it back.

Merge the website changes into `main`. GitHub Pages publishes the repository's static files at `https://ahkdesign.github.io/`; subsequent commits to `main` update the site automatically. This project does not need a Python build script or a custom publishing workflow. GitHub may show its own managed Pages deployment in the Actions tab; that does not mean you need to maintain an Actions workflow.

To use a custom domain you own, configure it in GitHub Pages and add the corresponding DNS records. That makes the custom domain the address of this site, not a separate production deployment alongside staging.

## Branding and link previews

The north-arrow logo is drawn as vector paths in `assets/ahk-logo.svg`, shared by the page and SVG-capable browser tabs so it stays sharp at any size. `assets/favicon-32.png` is a fallback for browsers without SVG favicon support. The 1200-by-630 `assets/social-preview.png` is a raster sharing card referenced by Open Graph and Twitter card metadata; many sharing services do not accept SVG preview images.

There is no Apple-specific home-screen icon. Without one, iOS may use a page snapshot or generic icon depending on the browser/version; the PNG favicon is not a guaranteed home-screen fallback. The website itself is unaffected.

When changing the public domain, update the canonical URL, Open Graph URL, and absolute preview-image URLs in `index.html`. Sharing services and browsers may cache old previews and icons; new assets must be deployed before external services can retrieve them.

## Portfolio images

The five existing illustrations are AI-generated concepts, each stored as `cover.jpg` in its project folder. No additional images or galleries have been added. These illustrations are not photographs of completed client work; the project labels and page disclaimer identify the sample content.

When replacing a cover, update its descriptive `alt` text in the project's metadata. No width or height fields are required. Cards and detail views use the same CSS-controlled 4:3 image frame, reserving space before images load and cropping differently shaped photos with `object-fit: cover`. Change `--project-image-ratio` in `styles.css` to adjust that ratio everywhere. Upload optimized images rather than full-resolution originals; nothing automatically resizes or compresses photos. Keep the concept disclosure unless the sample content is replaced with an actual project.

## Updating projects without editing HTML

Each project is a folder containing `metadata.json` and one cover image:

```text
projects/
  index.json
  01-courtyard-house/
    metadata.json
    cover.jpg
```

To add a project, copy an existing project folder on your computer, rename it with lowercase letters, numbers, and hyphens, replace its cover, and edit `metadata.json` with a plain-text editor. In GitHub, open the repository's `projects` folder, choose **Add file → Upload files**, and upload the new project folder. Then edit `projects/index.json` to include that folder's exact name and commit both changes to `main` (or open a pull request). No HTML editing is needed.

`projects/index.json` is the only manual discovery list:

```json
[
  "01-courtyard-house",
  "02-the-still-house",
  "03-house-by-the-grove",
  "04-little-city-home",
  "05-sunday-house"
]
```

When adding, renaming, or removing a project folder, update this list too. Unlisted folders are not displayed. Keep the JSON quotes and commas intact, with no trailing comma after the last entry. Folder names must be unique.

Listed projects are sorted alphabetically by their full folder names, regardless of the list's entry order. There are no hardcoded project names in the JavaScript. Keep numeric prefixes zero-padded to the same width: `02-...` sorts before `10-...`. To insert between `01-...` and `02-...` without renaming everything, use `01a-new-project`; to append, use `06-new-project`. Renaming a folder changes its position and its project URL, so previously shared links using the old name will no longer open that project. The display name comes from metadata `title` and does not need the numeric prefix. Card numbers and totals are calculated from the resulting order.

Metadata fields:

| Field | Content |
| --- | --- |
| `title` | Project name. |
| `type` | Existing category/status, such as `Private residence · Concept`. |
| `description` | Plain-text project description; use `\n` for line breaks. |
| `location` | City and country. |
| `scope` | Included services from `Architecture & planning`, `Interior design`, and `Turnkey execution`. Use `[]` if none apply. |
| `cover` | Object with `file` and descriptive `alt`. Image dimensions are handled by CSS. |

Keep JSON quotation marks and commas intact. Cover filenames must be lowercase letters, numbers, and hyphens with a `.jpg`, `.jpeg`, `.png`, `.webp`, or `.avif` extension, and must refer to a file in that same project folder. Invalid list entries show a project-list error; missing or malformed metadata shows an error on the affected card with a retry button. Missing covers show an image-loading error. These errors are detected in the browser, not before publishing, so check the site after content updates. There is no `order` field to maintain.

The main page's layout and hero load immediately. JavaScript fetches the small folder list and each listed project's metadata to render cards; covers use native lazy loading. Metadata is cached for the visit, and **View project** opens an accessible same-page dialog with location and scope, reusing that metadata and the same cover. There are no galleries or additional detail images yet. Links such as `/?project=01-courtyard-house` support direct opening, refresh, and browser Back/Forward. JavaScript and a working HTTP connection are required for project cards and details; the rest of the page remains available without JavaScript.

All content and uploaded files are public. The site keeps its homepage SEO and sharing metadata, but projects now render client-side, so project indexing is less reliable and details do not provide project-specific WhatsApp/Open Graph previews. Automatic folder discovery with a build script and custom GitHub Actions publishing can be added later if maintaining the manual list becomes inconvenient.

## WhatsApp contact

The header and footer link directly to the business WhatsApp chat using `wa.me` with the Indian country code (`91`). Both icons load from the Simple Icons CDN using `https://cdn.simpleicons.org/whatsapp/25D366`, which explicitly colors the logo WhatsApp green (`#25D366`). The contact text uses the same color in all link states. Icon updates follow the CDN's releases and caching, but are not guaranteed to appear immediately.

There is no hosted widget or third-party script. Loading the icon makes a request to the Simple Icons CDN, exposing the visitor's IP address to the CDN; `referrerpolicy="no-referrer"` prevents sending the page URL. If the CDN is unavailable or changes the icon path, the text contact links remain usable. The CDN does not manage or update the contact number.

The phone number is not displayed as text, but it is public in the link and available to chat recipients. This does not hide or protect a personal number. To change the contact, update both WhatsApp links in `index.html`; use a dedicated business number if personal-number privacy is required.
