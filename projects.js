(() => {
  const dialog = document.getElementById("project-dialog");
  const title = document.getElementById("project-dialog-title");
  const loading = document.getElementById("project-loading");
  const errorMessage = document.getElementById("project-error");
  const retry = document.getElementById("project-retry");
  const content = document.getElementById("project-detail-content");
  const projectList = document.getElementById("project-list");
  const catalogueLoading = document.getElementById("catalogue-loading");
  const catalogueError = document.getElementById("catalogue-error");
  const catalogueRetry = document.getElementById("catalogue-retry");
  const knownProjects = new Set();
  const cache = new Map();
  const pendingMetadata = new Map();
  const scopes = ["Architecture & planning", "Interior design", "Turnkey execution"];
  let detailRequest = 0;
  let activeSlug = null;
  let opener = null;
  let catalogueReady = false;

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function validateMetadata(data) {
    if (!data || typeof data !== "object") throw new Error("Invalid project metadata.");
    for (const field of ["title", "type", "description", "location"]) {
      if (typeof data[field] !== "string" || !data[field].trim()) {
        throw new Error(`Missing project ${field}.`);
      }
    }
    if (
      !Array.isArray(data.scope) ||
      data.scope.some((scope) => !scopes.includes(scope)) ||
      new Set(data.scope).size !== data.scope.length
    ) {
      throw new Error("Invalid project scope.");
    }
    const cover = data.cover;
    if (
      !cover ||
      typeof cover.file !== "string" ||
      !/^[a-z0-9][a-z0-9-]*\.(jpg|jpeg|png|webp|avif)$/.test(cover.file) ||
      typeof cover.alt !== "string" ||
      !cover.alt.trim()
    ) {
      throw new Error("Invalid project cover.");
    }
    return data;
  }

  async function readJson(path) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(new URL(path, window.location.href), { signal: controller.signal });
      if (!response.ok) throw new Error(`Request failed (${response.status}): ${path}`);
      return await response.json();
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function getMetadata(slug) {
    if (cache.has(slug)) return Promise.resolve(cache.get(slug));
    if (!pendingMetadata.has(slug)) {
      const request = readJson(`./projects/${slug}/metadata.json`)
        .then(validateMetadata)
        .then((data) => {
          cache.set(slug, data);
          return data;
        })
        .finally(() => pendingMetadata.delete(slug));
      pendingMetadata.set(slug, request);
    }
    return pendingMetadata.get(slug);
  }

  function coverFigure(slug, data, className, number) {
    const figure = element("figure", undefined, className);
    const image = element("img");
    image.alt = data.cover.alt;
    image.decoding = "async";
    image.loading = className === "project-image" ? "lazy" : "eager";
    const caption = element("figcaption", number ? `${number} / ${data.title}` : data.title);
    image.addEventListener("error", () => {
      caption.textContent = `${data.title}: cover image could not be loaded.`;
      caption.setAttribute("role", "status");
      console.error(`Could not load the cover for project "${slug}".`);
    });
    image.src = new URL(`./projects/${slug}/${data.cover.file}`, window.location.href).href;
    figure.append(image, caption);
    return figure;
  }

  function renderCard(card, slug, data, number, total) {
    const info = element("div", undefined, "project-info");
    const count = element("p", `${number} `, "project-number");
    count.append(element("span", `/ ${total}`));
    const link = element("a", "View project ", "text-link project-details-link");
    link.href = `?project=${slug}`;
    link.dataset.project = slug;
    const arrow = element("span", "\u2192");
    arrow.setAttribute("aria-hidden", "true");
    link.append(arrow, element("span", `: ${data.title}`, "sr-only"));
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const url = new URL(window.location.href);
      url.searchParams.set("project", slug);
      window.history.pushState({ ...window.history.state, portfolioProject: true }, "", url);
      loadDetails(slug);
    });
    info.append(
      count,
      element("p", data.type, "project-type"),
      element("h3", data.title),
      element("p", data.description, "project-description"),
      link
    );
    card.replaceChildren(info, coverFigure(slug, data, "project-image", number));
    return link;
  }

  async function loadCard(card, slug, number, total) {
    const restoreFocus = card.contains(document.activeElement);
    const info = element("div", undefined, "project-info");
    const message = element("p", "Loading project...", "detail-message");
    message.setAttribute("role", "status");
    info.append(element("h3", slug), message);
    card.replaceChildren(info);
    try {
      const data = await getMetadata(slug);
      const link = renderCard(card, slug, data, number, total);
      if (restoreFocus) link.focus({ preventScroll: true });
    } catch (error) {
      console.error(`Could not load project card "${slug}".`, error);
      message.textContent = "This project's content could not be loaded. Check its metadata or try again.";
      message.setAttribute("role", "alert");
      const button = element("button", "Try again", "text-link");
      button.type = "button";
      button.addEventListener("click", () => loadCard(card, slug, number, total));
      info.append(button);
      if (restoreFocus) button.focus({ preventScroll: true });
    }
  }

  async function loadCatalogue() {
    catalogueReady = false;
    catalogueLoading.textContent = "Loading projects...";
    catalogueLoading.hidden = false;
    catalogueError.hidden = true;
    catalogueRetry.hidden = true;
    projectList.setAttribute("aria-busy", "true");
    try {
      const folders = await readJson("./projects/index.json");
      if (
        !Array.isArray(folders) ||
        folders.some((slug) => typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) ||
        new Set(folders).size !== folders.length
      ) {
        throw new Error("projects/index.json must list unique lowercase, hyphen-separated folder names.");
      }
      folders.sort();
      projectList.replaceChildren();
      knownProjects.clear();
      const cards = folders.map((slug, index) => {
        knownProjects.add(slug);
        const card = element("article", undefined, "project-card");
        card.id = `project-${String(index + 1).padStart(2, "0")}`;
        projectList.append(card);
        return loadCard(card, slug, String(index + 1).padStart(2, "0"), String(folders.length).padStart(2, "0"));
      });
      catalogueReady = true;
      catalogueLoading.hidden = folders.length > 0;
      if (!folders.length) catalogueLoading.textContent = "No projects published yet.";
      syncWithUrl();
      await Promise.all(cards);
    } catch (error) {
      console.error("Could not load the project list.", error);
      catalogueLoading.hidden = true;
      catalogueError.textContent = "Projects could not be loaded. Check projects/index.json or try again.";
      catalogueError.hidden = false;
      catalogueRetry.hidden = false;
    } finally {
      projectList.setAttribute("aria-busy", "false");
    }
  }

  function renderDetails(slug, data) {
    title.textContent = data.title;
    const details = element("div", undefined, "detail-copy");
    details.append(
      element("p", data.type, "project-type"),
      element("p", data.description, "project-description")
    );
    const facts = element("dl", undefined, "project-facts");
    const location = element("div");
    location.append(element("dt", "Location"), element("dd", data.location));
    facts.append(location);
    details.append(facts, element("h3", "Scope"));
    const list = element("ul", undefined, "scope-list");
    list.setAttribute("aria-label", "Project scope");
    for (const scope of scopes) {
      list.append(element("li", scope, data.scope.includes(scope) ? "included" : undefined));
    }
    details.append(list);

    content.replaceChildren(details, coverFigure(slug, data, "detail-cover"));
    content.hidden = false;
  }

  async function loadDetails(slug) {
    const request = ++detailRequest;
    activeSlug = slug;
    content.hidden = true;
    content.replaceChildren();
    errorMessage.hidden = true;
    retry.hidden = true;
    loading.hidden = false;
    title.textContent = cache.get(slug)?.title || "Project details";
    if (!dialog.open) {
      opener = document.activeElement;
      dialog.showModal();
      document.body.classList.add("project-open");
    }
    dialog.scrollTop = 0;
    try {
      if (!knownProjects.has(slug)) throw new Error("Project not found.");
      const data = await getMetadata(slug);
      if (request !== detailRequest) return;
      renderDetails(slug, data);
    } catch (error) {
      if (request !== detailRequest) return;
      console.error(`Could not load project "${slug}".`, error);
      errorMessage.textContent = !knownProjects.has(slug)
        ? "This project could not be found. Close this view and choose a project below."
        : "Project details could not be loaded. Please try again.";
      errorMessage.hidden = false;
      retry.hidden = !knownProjects.has(slug);
    } finally {
      if (request === detailRequest) loading.hidden = true;
    }
  }

  function hideDetails() {
    detailRequest++;
    activeSlug = null;
    if (dialog.open) dialog.close();
    document.body.classList.remove("project-open");
    content.replaceChildren();
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  }

  function syncWithUrl() {
    if (!catalogueReady) return;
    const slug = new URL(window.location.href).searchParams.get("project");
    if (slug !== null) {
      loadDetails(slug);
    } else {
      hideDetails();
    }
  }

  function closeDetails() {
    if (window.history.state?.portfolioProject) {
      window.history.back();
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete("project");
      window.history.replaceState(window.history.state, "", url);
      hideDetails();
    }
  }

  dialog.querySelector(".dialog-close").addEventListener("click", closeDetails);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDetails();
  });
  retry.addEventListener("click", () => loadDetails(activeSlug));
  catalogueRetry.addEventListener("click", loadCatalogue);
  window.addEventListener("popstate", syncWithUrl);
  loadCatalogue();
})();
