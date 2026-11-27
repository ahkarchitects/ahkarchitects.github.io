# AHK Architects

Public website: **[ahkarchitects.in](https://ahkarchitects.in/)**.

Official static portfolio website for AHK Architects (Arishella Harish Kumar), built with plain HTML, CSS, and a small JavaScript project-detail view for GitHub Pages. The organization is `ahkarchitects` and the repository is `ahkarchitects/ahkarchitects.github.io`. Project content lives in repository folders; no CMS, private credentials, or separate project HTML pages are required.

## Local development

Edit project content in `<section>/<project-name>/metadata.json`, the section's manual folder list in `<section>/index.json`, and homepage featured references in `projects/index.json`. Sections are `architecture`, `interiors`, and `landscape`. Layout and typography live in `styles.css`, and theme colors in `theme.css`. No build script or package installation is required to preview or publish the site. A GitHub Actions workflow validates project submissions separately.

Preview the repository over HTTP using any static web server. If Python is already installed, this optional command starts a local preview server; Python is not a site or deployment dependency:

```sh
python -m http.server 4321 --bind 127.0.0.1
```

Visit `http://127.0.0.1:4321/` and stop the server with Ctrl+C when finished. Use HTTP rather than opening the file directly: browsers restrict fetching project metadata from `file://` URLs.

Content edits take effect after refreshing the preview. There are no generated files to update.

## Section projects and homepage features

The projects and their images live in their own sections: Architecture has Sadaaramam - V3, Jessy - Duplex Residence, and Sudeep - Duplex Residence; Interiors has Office Space and Mr Karuna Rao; Landscape has Banda Cheruvu.

All sections use the same `projects.js`, CSS, cards, and full-page image gallery. Each reads its own `<section>/index.json` and project folders. Every project's `metadata.json` contains only:

```json
{
  "title": "Jessy - Duplex Residence",
  "location": "Karimnagar, Telangana",
  "images": [
    "01-aerial-view.jpg",
    "02-front-view.jpg"
  ]
}
```

The first image is the card cover; the remaining filenames follow in gallery order. All images live beside that project's metadata. Titles and locations must be nonempty; `images` must be a nonempty list of unique supported image filenames. No type, description, scope, cover object, or per-image metadata is needed. Accessible image labels are derived from the project title and filename.

Home and section cards are borderless image links, with a project counter at the top and the project title and location overlaid at the bottom. Tap anywhere on the image or activate its link with the keyboard to navigate to a regular project page, not a popup. The project page shows the existing title and location followed by every image in metadata order, including the cover. Desktop alternates paired images and full-width rows; mobile uses one vertical column. Images retain their natural proportions without cropping, including floor plans. Direct links use the owning section, for example `architecture.html?project=02-jessy-duplex-residence` or `interiors.html?project=01-office-space`. These existing URLs render the project view in the page's main content instead of the catalogue, so there is no separate HTML file to maintain per project.

Home shows **Featured projects** using references only. `projects/index.json` includes all six published projects in both the background slideshow and the Featured projects cards:

```json
[
  "architecture/01-sadaaramam-v3",
  "architecture/02-jessy-duplex-residence",
  "architecture/03-sudeep-duplex-residence",
  "interiors/01-office-space",
  "interiors/02-mr-karuna-rao",
  "landscape/01-banda-cheruvu"
]
```

The list order is the display order. To change the selection, edit these references; nothing is copied or synchronized. Titles, locations, and cover URLs come directly from the section's metadata and original images, so edits there immediately affect the homepage too. Homepage image links open the owning section's project page. The `projects/` folder contains only this reference list, never duplicate metadata or images.

Home starts with an image-led spotlight cycling through the featured projects' covers, titles, locations, and section links in reference-list order. It advances every five seconds, crossfades, and loops back to the first project. The hero shows only the image, title, location, and bottom indicators; no exploration prompt, arrows, or separate Pause button. Rotation pauses while hovering, while keyboard focus is inside the hero, and while the tab is hidden. Reduced-motion visitors start with autoplay off and no animated transition; they can navigate manually or explicitly choose Play. Failed metadata remains an explicit card error with retry, and only successfully loaded projects enter the slideshow.

Subtle indicators sit at the bottom center inside the hero image on mobile and desktop. Inactive projects are faded gray dots; the current project is a small, darker pill that fills over the five-second autoplay interval. Tap the active indicator to pause/play, or an inactive dot to select that project. Each has a 44px touch target, an accessible label, and keyboard support. Pausing, hovering, or focusing the hero freezes the partial fill and countdown; resuming continues where it stopped. Reduced motion disables the progress animation and shows a static current-project pill.

The image extends behind its compact header, fills most of the mobile viewport, and uses a shorter, width-capped frame on desktop. The same featured selections appear below as image-only cards, in three columns on desktop and a single column on mobile. No new image upload or separate hero content source is needed. Edit the existing featured references or their metadata to change the slideshow.

The existing validation command checks all three catalogues, featured references, and referenced images, including the 250 KiB limit. No new dependencies, build step, or publishing changes are required.

The standalone service pages intentionally duplicate HTML to avoid template engines, extra site dependencies, and a build step. Keep their markup consistent and use `styles.css` for shared visual changes. Repository AI guidance in `.github/copilot-instructions.md` requires explicit approval before adding dependencies or changing the development or publishing process.

## Opening animation

Only a first direct homepage visit in a browser-tab session starts with a centered logo, **AHK**, and **Architects** on the site's theme background. `site-intro.js` runs before rendering on all six pages and records the visit in session storage. Internal navigation, reloads, Back/Forward, direct section or project links, and all other pages skip the intro. Without JavaScript or session storage, content appears immediately.

The branding appears in staggered fades, holds until 2.4 seconds, then fades away over 0.6 seconds to reveal the homepage. Once enabled, the three-second intro dismisses using CSS and never waits for project images or external contact icons. The homepage and project metadata load behind it.

The decorative overlay is hidden from assistive technology. Reduced-motion visitors skip it entirely; keyboard focus also bypasses it immediately, and project pages never show it. Scrolling is locked only while the intro runs. Maintain its timing and typography in the `intro-*` rules in `styles.css`, and its stacked branding in `index.html`.

Run the opening-animation regression tests with `node --test tests/site-intro.test.cjs` (Node.js is only needed for these tests, not for the site).

## Light and dark themes

The site follows the visitor's system appearance by default. All six pages have a compact one-line header: logo and name on the left, an appearance icon and Menu on the right. The half-filled-circle appearance icon opens a native **System / Light / Dark** dropdown, labeled **Appearance** for assistive technology and usable with the keyboard. Explicit choices are saved in this site's browser local storage; choosing System clears the override and follows future system changes. If storage is unavailable, switching still works for the current visit and a warning appears in the browser console.

Maintain both palettes in `theme.css`: each `light-dark(light, dark)` value pairs the original warm light appearance with a darker earth-toned equivalent. This uses the native CSS `light-dark()` function supported by current Chrome, Edge, Firefox, and Safari. Layout, fonts, and image sizing stay in `styles.css`; photographs and contact icon brand colors are not recolored. The logo keeps its black-and-white artwork in both modes, with an extended black north-arrow silhouette in the SVG and transparent space around it instead of a rectangular backing. The shared artwork applies to every page header and the homepage intro.

`theme.js` applies a saved preference before the page renders and keeps the browser toolbar color in sync with the background. Without JavaScript, the selector stays hidden and CSS still follows the system theme.

Run appearance and intro regression tests with `node --test tests/*.test.cjs`.

## GitHub Pages deployment

In the repository, open **Settings → Pages** and set **Build and deployment → Source** to **Deploy from a branch**, then select **main** and **/ (root)** and save. If you switched the source to GitHub Actions while trying the earlier build-based approach, switch it back.

Merge the website changes into `main`. GitHub Pages publishes the repository's static files at `https://ahkarchitects.in/`; subsequent commits to `main` update the site automatically. Keep the repository name `ahkarchitects.github.io` for the organization Pages repository; the public website uses the custom domain, not the repository address. This project does not need a Python build script or a custom publishing workflow. GitHub may show its own managed Pages deployment in the Actions tab; that does not mean you need to maintain an Actions workflow.

The root `CNAME` file contains `ahkarchitects.in`. Keep **Settings → Pages → Custom domain** set to `ahkarchitects.in` and **Enforce HTTPS** enabled, with the domain's DNS records pointing to GitHub Pages. This is the public production website, not a separate deployment alongside staging.

## Branding and link previews

Use **AHK Architects** as the public brand name, not AHK Design or AHK Studio. The GitHub organization display name should be **AHK Architects**, and both its profile website and the repository About website should link to `https://ahkarchitects.in/`. Keep the organization login and repository name unchanged.

The north-arrow logo is drawn as vector paths in `assets/ahk-logo.svg`, shared by the page and SVG-capable browser tabs so it stays sharp at any size. `assets/favicon-32.png` is a fallback for browsers without SVG favicon support. The 1200-by-630 `assets/social-preview.png` is a raster sharing card referenced by Open Graph and Twitter card metadata; many sharing services do not accept SVG preview images.

The sharing card uses the logo, AHK Architects name, Architecture, Interiors, and Landscape labels, and "By Arishella Harish Kumar" byline without contact links or the old coming-soon message. It is a manually maintained PNG, not a live rendering of the header, so it needs no image-generation pipeline. The `?v=5` query in all six pages' preview-image URLs distinguishes the updated image for caches; bump that version when replacing the card again. Sharing platforms can also cache the page metadata, so existing shares may still need a preview refresh after deployment.

There is no Apple-specific home-screen icon. Without one, iOS may use a page snapshot or generic icon depending on the browser/version; the PNG favicon is not a guaranteed home-screen fallback. The website itself is unaffected.

All six HTML pages use `https://ahkarchitects.in/` for canonical URLs, Open Graph URLs, and absolute preview-image URLs. When changing the public domain, update these URLs, `CNAME`, the GitHub Pages custom domain and DNS records, the repository About website, and the organization profile website together. Sharing services and browsers may cache old previews and icons; new assets must be deployed before external services can retrieve them.

## Portfolio images

The portfolio uses the supplied project images, including architectural views and plans, office interiors, and lake renderings. Each project folder contains its cover and gallery images as sequentially named JPEGs.

The first filename in `images` is the cover; accessible image labels come from the title and filename. No alt, width, or height metadata fields are required. Cards use a portrait 3:4 frame and the homepage spotlight fills its frame with `object-fit: cover`; detail images retain their natural proportions. Upload optimized images; nothing automatically resizes or compresses images.

The six project covers have light sharpening applied at their existing pixel dimensions, without changing their colors, composition, or layout. They remain within the 250 KiB per-image limit. Sharpening does not restore missing detail: the two architecture covers are only 904-by-444 and 876-by-444 pixels, so tall mobile crops can still look soft. For a genuine resolution improvement, replace those files with optimized exports from the original high-resolution renders rather than enlarging these JPEGs.

## Updating projects without editing HTML

Each section owns its catalogue and project folders:

```text
interiors/
  index.json
  01-office-space/
    metadata.json
    01-office-overview.jpg
    02-reception.jpg
```

To add a project, copy an existing project folder on your computer, rename it with lowercase letters, numbers, and hyphens, replace its images, and edit `metadata.json` with a plain-text editor. In GitHub, open the appropriate section folder, choose **Add file → Upload files**, and upload the new project folder. Then edit that section's `index.json` to include the folder's exact name and commit both changes to `main` (or open a pull request). No HTML editing is needed.

For example, `interiors/index.json` lists:

```json
[
  "01-office-space"
]
```

When adding, renaming, or removing a project folder, update its section list too. If featured on Home, update its reference in `projects/index.json` as well. Unlisted folders are not displayed. Keep JSON quotes and commas intact, with no trailing comma after the last entry. Folder names must be unique within a section.

Listed projects are sorted alphabetically by their full folder names, regardless of the list's entry order. There are no hardcoded project names in the JavaScript. Keep numeric prefixes zero-padded to the same width: `02-...` sorts before `10-...`. To insert between `01-...` and `02-...` without renaming everything, use `01a-new-project`; to append, use `06-new-project`. Renaming a folder changes its position and its project URL, so previously shared links using the old name will no longer open that project. The display name comes from metadata `title` and does not need the numeric prefix. Card numbers and totals are calculated from the resulting order.

Metadata fields:

| Field | Content |
| --- | --- |
| `title` | Project name. |
| `location` | City and country. |
| `images` | Nonempty ordered array of unique image filenames in this project folder; first is the cover. |

Keep JSON quotation marks and commas intact. Image filenames must be lowercase letters, numbers, and hyphens with a `.jpg`, `.jpeg`, `.png`, `.webp`, or `.avif` extension, and must refer to a file in that same project folder. Invalid list entries show a project-list error; missing or malformed metadata shows an error on the affected card with a retry button. Missing covers show an image-loading error. There is no `order` field to maintain.

### Automated project validation

`.github/workflows/validate-projects.yml` runs on every pull request targeting `main`, every push to `main`, and manual runs from the Actions tab. It checks all section lists against their project directories, validates the simple metadata, and ensures featured references point to published section projects. Duplicate references, copied project folders in `projects/`, unknown metadata fields, duplicate JSON keys, missing files, and symbolic links used for referenced project files or directories are rejected. No separate project HTML page is required.

Each referenced cover and gallery image must decode as its declared image format and be **at most 250 KiB (256,000 bytes)**. Unreferenced images are ignored. The workflow reports file-specific errors and never edits, compresses, or publishes content.

To run the same checks locally, use Python 3.12 or newer and install the validation-only dependency (preferably in a virtual environment):

```sh
python -m pip install -r scripts/requirements-validation.txt
python -m unittest discover -s tests
python scripts/validate_projects.py
```

The validator exits nonzero if content is invalid. To prevent invalid pull requests from merging, configure a `main` branch ruleset requiring the **Project content validation** status check. Push validation alone does not block direct pushes or GitHub Pages deployment.

The homepage heading and layout load immediately behind the opening animation. JavaScript fetches featured references and reads metadata from the owning sections; covers use native lazy loading. Homepage and section image links use normal browser navigation to a full-page project view with title, location, and all project images. No project page replays the branded opening animation: a loading status is shown only while metadata or images are loading. The first gallery image loads eagerly and later images use native lazy loading as visitors scroll. Catalogue cards are not rendered, and unrelated project metadata is not fetched, on a project URL. Failed metadata and images show explicit errors and retry buttons; unknown projects link back to the section list. A Back to section link, standard browser Back/Forward, direct opening, and refresh all work with existing section URLs such as `landscape.html?project=01-banda-cheruvu`. Standard `<img>` elements retain the browser's image context menu. JavaScript and HTTP are required for cards and details; navigation and the rest of the page remain available without JavaScript.

All content and uploaded files are public. The site keeps its homepage SEO and sharing metadata, but projects now render client-side, so project indexing is less reliable and details do not provide project-specific WhatsApp/Open Graph previews. Automatic folder discovery with a build script and custom GitHub Actions publishing can be added later if maintaining the manual list becomes inconvenient.

## Header and contact links

All six pages share the compact logo/name, appearance dropdown, and icon-only menu toggle. Home overlays the header on the spotlight image; other pages retain a sticky, theme-colored header. The toggle retains a screen-reader label. The native expandable menu lists Home, About Us (`./about.html`), Architecture (`./architecture.html`), Interiors (`./interiors.html`), Landscape (`./landscape.html`), and Contact Us (`./contact.html`) with full-width divided rows, contact shortcuts, and a close control. All three service pages load their own project catalogues. They are separate pages, not homepage sections, and there is no Turnkey page. The active page is identified with `aria-current="page"`. `site-navigation.js` adds Escape-to-close with focus restoration, outside-click dismissal, and dismissal when following a link. Opening, closing, and following links also work without JavaScript.

`about.html` introduces Arishella Harish Kumar as Founder and Principal Architect of AHK Architects. A small portrait (`assets/harish-kumar.jpg`) appears above his introduction, displayed at 12rem wide without cropping or enlargement. The biography describes his graduation from CSIIT, Hyderabad, and founding of the studio in 2015, his work across architecture, interiors, and landscape, and an approach that lets every project develop its own identity. The decorative "Spaces that feel like you" heading and Contact Us page's large "Contact us." heading are omitted. The homepage contains the image spotlight, Featured projects, and a compact copyright footer, without the introduction or large enquiry block.

`contact.html` merges the former homepage invitation ("Have a space in mind?", "Let's make it feel like home", and "Project enquiries / Tell us about your space") into the existing Contact Us layout. It preserves the Arishella Harish Kumar identity, clickable Indian phone number (**+91 77804 12526**), WhatsApp, and email. All non-home pages use the same theme storage as the homepage but never show an opening animation. Home and all three service pages load `projects.js`. Header markup is kept explicitly in all six HTML pages so branding and navigation remain available without a build step or JavaScript. When updating the shared header or menu, keep all six in sync and retain each page's own active-menu marker.

The header contains a small AHK logo and wordmark on one line, without a service subtitle or a separate row of controls. Service links remain in the menu.

Each page defines a single contact group under `data-contact-links-source`: in the main contact section on Contact Us and inside the header's menu on all other pages. Menu shortcuts use text links to keep the bar minimal. Only Contact Us loads `contact-links.js`, which copies its main group into the menu. Keep contact details consistent across all six source groups. Without JavaScript, Contact Us retains a menu fallback link and its main contact group; all other pages show their menu contact links directly.

`python -m unittest discover -s tests` also checks that the moved copy stays on the correct page, service placeholders are absent from Home, and every menu links to the correct separate page. Logo regression checks ensure the expanded black silhouette fits inside the SVG viewBox and shared logo styles do not reintroduce a rectangular backing.

WhatsApp links directly to the business chat using `wa.me` with the Indian country code (`91`). All email links use `mailto:ahk.architects.studio@gmail.com` and open the visitor's configured email application, not necessarily Gmail. Contact Us also displays this studio address.

On Contact Us, the WhatsApp and Gmail icons load from the Simple Icons CDN using `https://cdn.simpleicons.org/whatsapp/25D366` and `https://cdn.simpleicons.org/gmail/EA4335`. Link text uses theme-specific green and red shades for readability while the icons retain their brand colors. Icon updates follow the CDN's releases and caching, but are not guaranteed to appear immediately.

There is no hosted contact widget or third-party script. Loading an icon makes a request to the Simple Icons CDN, exposing the visitor's IP address to the CDN; `referrerpolicy="no-referrer"` prevents sending the page URL. If the CDN is unavailable or changes an icon path, the text contact links remain usable. The CDN does not manage the contact details.

The phone number and email address are public in the links even though they are not displayed as text. Use dedicated business contact details if personal-contact privacy is required.
