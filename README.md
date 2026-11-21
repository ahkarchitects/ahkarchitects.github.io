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

The sharing card uses the logo, AHK Interiors name, services, and "By Arishella Harish Kumar" byline without contact links or the old coming-soon message. It is a manually maintained PNG, not a live rendering of the header, so it needs no image-generation pipeline. The `?v=3` query in both preview-image URLs distinguishes the updated image for caches; bump that version when replacing the card again. Sharing platforms can also cache the page metadata, so existing shares may still need a preview refresh after deployment.

There is no Apple-specific home-screen icon. Without one, iOS may use a page snapshot or generic icon depending on the browser/version; the PNG favicon is not a guaranteed home-screen fallback. The website itself is unaffected.

When changing the public domain, update the canonical URL, Open Graph URL, and absolute preview-image URLs in `index.html`. Sharing services and browsers may cache old previews and icons; new assets must be deployed before external services can retrieve them.

## Portfolio images

The five covers are original cartoon-style vector illustrations, each stored as `cover.svg` in its project folder. They use pastel colors, outlined forms, and dollhouse cutaways to be visibly non-photographic; no stock photos or externally sourced project images are used. No additional images or galleries have been added. Every card and detail cover is captioned "Concept illustration"; project types also identify the sample content as concepts, not completed client work. There is no separate disclaimer paragraph beneath the projects.

When replacing a cover, update its descriptive `alt` text in the project's metadata. No width or height fields are required. Cards and detail views use the same CSS-controlled 4:3 image frame, reserving space before images load and cropping differently shaped images with `object-fit: cover`. Change `--project-image-ratio` in `styles.css` to adjust that ratio everywhere. Upload optimized images rather than full-resolution originals; nothing automatically resizes or compresses images. Use self-contained SVGs without scripts, embedded external images, or external fonts. Keep the concept disclosure unless the sample content is replaced with an actual project; when publishing real work, also update the shared caption in `projects.js`.

## Updating projects without editing HTML

Each project is a folder containing `metadata.json` and one cover image:

```text
projects/
  index.json
  01-courtyard-house/
    metadata.json
    cover.svg
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

Keep JSON quotation marks and commas intact. Cover filenames must be lowercase letters, numbers, and hyphens with a `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, or `.svg` extension, and must refer to a file in that same project folder. Invalid list entries show a project-list error; missing or malformed metadata shows an error on the affected card with a retry button. Missing covers show an image-loading error. These errors are detected in the browser, not before publishing, so check the site after content updates. There is no `order` field to maintain.

The main page's layout and hero load immediately. JavaScript fetches the small folder list and each listed project's metadata to render cards; covers use native lazy loading. Metadata is cached for the visit, and **View project** opens an accessible same-page dialog with location and scope, reusing that metadata and the same cover. There are no galleries or additional detail images yet. Links such as `/?project=01-courtyard-house` support direct opening, refresh, and browser Back/Forward. JavaScript and a working HTTP connection are required for project cards and details; the rest of the page remains available without JavaScript.

All content and uploaded files are public. The site keeps its homepage SEO and sharing metadata, but projects now render client-side, so project indexing is less reliable and details do not provide project-specific WhatsApp/Open Graph previews. Automatic folder discovery with a build script and custom GitHub Actions publishing can be added later if maintaining the manual list becomes inconvenient.

## Header and contact links

The header contains the larger AHK logo and wordmark, with Architecture, Interiors, and Turnkey spaces on one line beneath the name. The hero no longer repeats the logo, services, or a shortcut to the project section immediately below it.

The footer defines a single contact group in `index.html` under `data-contact-links-source`. The small local `contact-links.js` script copies that group into the header, so both locations use the same links, labels, icons, and styles. Edit the source group once to update both locations. On mobile, the header stacks the compact WhatsApp and Email links alongside the brand, while the services remain on one line. Without JavaScript, the header's Contact link leads to the footer, where both contact links still work.

WhatsApp links directly to the business chat using `wa.me` with the Indian country code (`91`). Email uses `mailto:arishellaharish@gmail.com` and opens the visitor's configured email application, not necessarily Gmail. The supplied dotted address reaches the same inbox: [Google confirms that dots do not matter in personal `gmail.com` addresses](https://support.google.com/mail/answer/7436150?hl=en). This does not apply to custom-domain Google Workspace addresses.

The WhatsApp and Gmail icons load from the Simple Icons CDN using `https://cdn.simpleicons.org/whatsapp/25D366` and `https://cdn.simpleicons.org/gmail/EA4335`. Links use the matching green and red colors. Icon updates follow the CDN's releases and caching, but are not guaranteed to appear immediately.

There is no hosted contact widget or third-party script. Loading an icon makes a request to the Simple Icons CDN, exposing the visitor's IP address to the CDN; `referrerpolicy="no-referrer"` prevents sending the page URL. If the CDN is unavailable or changes an icon path, the text contact links remain usable. The CDN does not manage the contact details.

The phone number and email address are public in the links even though they are not displayed as text. Use dedicated business contact details if personal-contact privacy is required.
