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

## Future Sanity integration

The current site has no CMS integration and requires no credentials. Sanity integration and automated content updates would require a separate implementation and approved tooling. Never put private API keys or tokens in browser-delivered HTML or JavaScript, or commit them to the repository.
