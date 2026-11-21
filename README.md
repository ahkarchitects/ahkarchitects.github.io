# AHK Interiors

Official static portfolio website for AHK Interiors (Arishella Harish Kumar), built with plain HTML and CSS for GitHub Pages.

## Local development

Open `index.html` directly in your browser. Edit `index.html` for content and `styles.css` for appearance. No package installation or build step is required.

If Python 3 is already installed and allowed by your device policy, you can also preview over HTTP from the repository root:

```sh
python3 -m http.server 4321 --bind 127.0.0.1
```

Visit `http://127.0.0.1:4321/` and stop the server with Ctrl+C when finished.

## GitHub Pages deployment

In the repository, open **Settings → Pages** and set **Build and deployment → Source** to **Deploy from a branch**, then select **main** and **/ (root)** and save.

Merge the website changes into `main`. GitHub Pages publishes the root `index.html` at `https://ahkdesign.github.io/`; subsequent pushes to `main` update the site automatically. There is no custom deployment workflow or npm build.

To use a custom domain you own, configure it in GitHub Pages and add the corresponding DNS records. That makes the custom domain the address of this site, not a separate production deployment alongside staging.

## Branding and link previews

The north-arrow logo is drawn as vector paths in `assets/ahk-logo.svg`, shared by the page and SVG-capable browser tabs so it stays sharp at any size. `assets/favicon-32.png` is a fallback for browsers without SVG favicon support. The 1200-by-630 `assets/social-preview.png` is a raster sharing card referenced by Open Graph and Twitter card metadata; many sharing services do not accept SVG preview images.

There is no Apple-specific home-screen icon. Without one, iOS may use a page snapshot or generic icon depending on the browser/version; the PNG favicon is not a guaranteed home-screen fallback. The website itself is unaffected.

When changing the public domain, update the canonical URL, Open Graph URL, and absolute preview-image URLs in `index.html`. Sharing services and browsers may cache old previews and icons; new assets must be deployed before external services can retrieve them.

## Portfolio images

The five project illustrations are AI-generated concepts stored locally as optimized JPEGs in `assets/projects/`. The site does not load project images from Unsplash or another external image host. These illustrations are not photographs of completed client work; the project labels and page disclaimer identify the sample content.

When replacing an illustration, update its descriptive alt text and intrinsic image dimensions in `index.html`. Keep the concept disclosure unless the sample content is replaced with an actual project.

## WhatsApp contact

The header and footer link directly to the business WhatsApp chat using `wa.me` with the Indian country code (`91`). Both icons load from the Simple Icons CDN using `https://cdn.simpleicons.org/whatsapp/25D366`, which explicitly colors the logo WhatsApp green (`#25D366`). The contact text uses the same color in all link states. Icon updates follow the CDN's releases and caching, but are not guaranteed to appear immediately.

There is no hosted widget or third-party script. Loading the icon makes a request to the Simple Icons CDN, exposing the visitor's IP address to the CDN; `referrerpolicy="no-referrer"` prevents sending the page URL. If the CDN is unavailable or changes the icon path, the text contact links remain usable. The CDN does not manage or update the contact number.

The phone number is not displayed as text, but it is public in the link and available to chat recipients. This does not hide or protect a personal number. To change the contact, update both WhatsApp links in `index.html`; use a dedicated business number if personal-number privacy is required.

## Future Sanity integration

The current site has no CMS integration and requires no credentials. Sanity integration and automated content updates would require a separate implementation and approved tooling. Never put private API keys or tokens in browser-delivered HTML or JavaScript, or commit them to the repository.
