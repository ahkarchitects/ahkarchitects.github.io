# AHK Interiors

Official static portfolio website for AHK Interiors (Arishella Harish Kumar), built with Astro and hosted on GitHub Pages.

## Local development

Install dependencies and start the Astro development server:

```sh
npm ci
npm run dev
```

Create a production build with `npm run build`; the static site is generated in `dist/`.

## GitHub Pages deployment

The workflow in `.github/workflows/deploy.yml` builds and deploys the site when changes are pushed to `main`. It can also be started manually with **Actions → Deploy to GitHub Pages → Run workflow** or by sending a `repository_dispatch` event from an external integration.

In the repository, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**. The project site URL for `ahkdesign.github.io` is `https://ahkdesign.github.io/`. To use the future custom domain, configure `ahkdesign.in` in GitHub Pages and add the corresponding DNS records.

## Future Sanity integration

The current site is static and does not require Sanity credentials. When Sanity is integrated, store any required API keys or tokens as GitHub Actions repository secrets and reference them from the workflow or build environment; do not commit credentials to the repository. A Sanity webhook can trigger a rebuild using GitHub's `repository_dispatch` event.
