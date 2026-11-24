# Keep the repository simple

- Preserve the plain HTML, CSS, and JavaScript site and its existing GitHub Pages publishing process.
- Prefer straightforward edits and duplicated HTML over new dependencies, frameworks, template engines, code generation, or build tooling. Use the existing shared CSS to keep pages visually consistent.
- Before adding any new dependency or changing the architecture, package management, local preview, build, CI, or deployment process, explain the added setup and maintenance, describe a simpler alternative, and wait for explicit user approval for that specific change. A request to reuse code or make pages consistent is not approval to add tooling.
- Keep the site previewable with a static HTTP server and publishable without installing site dependencies or running a custom build.
- Existing Python dependencies are for validation only. Do not make them site or publishing requirements.
