(() => {
  const dialog = document.getElementById("project-dialog");
  const title = document.getElementById("project-dialog-title");
  const loading = document.getElementById("project-loading");
  const errorMessage = document.getElementById("project-error");
  const retry = document.getElementById("project-retry");
  const content = document.getElementById("project-detail-content");
  const projectList = document.getElementById("project-list");
  const projectSource = projectList.dataset.source || "./projects";
  const simpleMetadata = projectList.dataset.metadata === "simple";
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
  let navigateGallery = null;

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function validImageFile(file) {
    return typeof file === "string" && /^[a-z0-9][a-z0-9-]*\.(jpg|jpeg|png|webp|avif)$/.test(file);
  }

  function validateMetadata(data) {
    if (!data || typeof data !== "object") throw new Error("Invalid project metadata.");
    if (simpleMetadata) {
      if (
        Object.keys(data).length !== 3 ||
        typeof data.title !== "string" || !data.title.trim() ||
        typeof data.location !== "string" || !data.location.trim() ||
        !Array.isArray(data.images) || !data.images.length ||
        data.images.some((file) => !validImageFile(file)) ||
        new Set(data.images).size !== data.images.length
      ) {
        throw new Error("Project metadata must contain only title, location, and a nonempty list of unique image filenames.");
      }
      return {
        title: data.title,
        location: data.location,
        cover: { file: data.images[0], alt: imageAlt(data.title, data.images[0]) },
        gallery: data.images.slice(1)
      };
    }
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
      !validImageFile(cover.file) ||
      typeof cover.alt !== "string" ||
      !cover.alt.trim()
    ) {
      throw new Error("Invalid project cover.");
    }
    if (
      data.gallery !== undefined &&
      (
        !Array.isArray(data.gallery) ||
        data.gallery.some((file) => !validImageFile(file)) ||
        new Set([cover.file, ...data.gallery]).size !== data.gallery.length + 1
      )
    ) {
      throw new Error("Invalid project gallery.");
    }
    return data;
  }

  function imageAlt(projectTitle, file) {
    return `${projectTitle}: ${file.replace(/\.[^.]+$/, "").replace(/-/g, " ")} concept illustration`;
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
      const request = readJson(`${projectSource}/${slug}/metadata.json`)
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
    const caption = element(
      "figcaption",
      `${number ? `${number} / ` : ""}${data.title} · Concept illustration`
    );
    image.addEventListener("error", () => {
      caption.textContent = `${data.title}: cover image could not be loaded.`;
      caption.setAttribute("role", "status");
      console.error(`Could not load the cover for project "${slug}".`);
    });
    image.src = new URL(`${projectSource}/${slug}/${data.cover.file}`, window.location.href).href;
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
    info.append(count);
    if (!simpleMetadata) info.append(element("p", data.type, "project-type"));
    info.append(element("h3", data.title));
    info.append(simpleMetadata
      ? element("p", data.location, "project-description")
      : element("p", data.description, "project-description"));
    info.append(link);
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
      const folders = await readJson(`${projectSource}/index.json`);
      if (
        !Array.isArray(folders) ||
        folders.some((slug) => typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) ||
        new Set(folders).size !== folders.length
      ) {
        throw new Error(`${projectSource}/index.json must list unique lowercase, hyphen-separated folder names.`);
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
      catalogueError.textContent = `Projects could not be loaded. Check ${projectSource}/index.json or try again.`;
      catalogueError.hidden = false;
      catalogueRetry.hidden = false;
    } finally {
      projectList.setAttribute("aria-busy", "false");
    }
  }

  function renderDetails(slug, data) {
    title.textContent = data.title;
    const details = element("div", undefined, "detail-copy");
    if (!simpleMetadata) {
      details.append(
        element("p", data.type, "project-type"),
        element("p", data.description, "project-description")
      );
    }
    const facts = element("dl", undefined, "project-facts");
    const location = element("div");
    location.append(element("dt", "Location"), element("dd", data.location));
    facts.append(location);
    details.append(facts);
    if (!simpleMetadata) {
      details.append(element("h3", "Scope"));
      const list = element("ul", undefined, "scope-list");
      list.setAttribute("aria-label", "Project scope");
      for (const scope of scopes) {
        list.append(element("li", scope, data.scope.includes(scope) ? "included" : undefined));
      }
      details.append(list);
    }

    content.replaceChildren(
      details,
      data.gallery?.length ? renderGallery(slug, data) : coverFigure(slug, data, "detail-cover")
    );
    content.hidden = false;
  }

  function renderGallery(slug, data) {
    const files = [data.cover.file, ...data.gallery];
    const gallery = element("section", undefined, "detail-gallery");
    gallery.setAttribute("aria-label", `${data.title} image gallery`);
    gallery.setAttribute("aria-roledescription", "carousel");
    const figure = element("figure", undefined, "detail-cover");
    const stage = element("div", undefined, "gallery-stage");
    const imageSlot = element("div", undefined, "gallery-image");
    imageSlot.id = "project-gallery-image";
    const caption = element("figcaption", `${data.title} · Concept illustration`);
    const count = element("p", undefined, "gallery-count");
    count.setAttribute("role", "status");
    count.setAttribute("aria-atomic", "true");
    const dots = element("div", undefined, "gallery-dots");
    dots.setAttribute("role", "group");
    dots.setAttribute("aria-label", "Choose an image");
    const status = element("p", undefined, "detail-message");
    status.setAttribute("role", "status");
    const retryImage = element("button", "Retry image", "text-link");
    retryImage.type = "button";
    retryImage.hidden = true;
    let index = 0;

    function showImage(destination) {
      if (destination < 0 || destination >= files.length) return;
      index = destination;
      const file = files[index];
      const image = element("img");
      image.alt = index === 0 ? data.cover.alt : imageAlt(data.title, file);
      image.decoding = "async";
      image.loading = "eager";
      imageSlot.replaceChildren(image);
      imageSlot.setAttribute("aria-busy", "true");
      count.textContent = `Image ${index + 1} of ${files.length}`;
      for (const { button, offset } of arrows) {
        button.disabled = offset < 0 ? index === 0 : index === files.length - 1;
      }
      for (const [position, dot] of [...dots.children].entries()) {
        if (position === index) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      }
      status.textContent = "Loading image...";
      status.hidden = false;
      retryImage.hidden = true;
      image.addEventListener("load", () => {
        if (!imageSlot.isConnected || !imageSlot.contains(image)) return;
        imageSlot.setAttribute("aria-busy", "false");
        status.hidden = true;
      });
      image.addEventListener("error", () => {
        if (!imageSlot.isConnected || !imageSlot.contains(image)) return;
        imageSlot.setAttribute("aria-busy", "false");
        status.textContent = "This image could not be loaded. Retry it or choose another image.";
        retryImage.hidden = false;
        console.error(`Could not load gallery image "${file}" for project "${slug}".`);
      });
      image.src = new URL(`${projectSource}/${slug}/${file}`, window.location.href).href;
    }

    const arrows = [
      { offset: -1, text: "\u2039", className: "gallery-arrow gallery-arrow-previous" },
      { offset: 1, text: "\u203a", className: "gallery-arrow gallery-arrow-next" }
    ].map((control) => {
      const button = element("button", control.text, control.className);
      button.type = "button";
      button.setAttribute("aria-label", control.offset < 0 ? "Previous image" : "Next image");
      button.setAttribute("aria-controls", imageSlot.id);
      button.addEventListener("click", () => showImage(index + control.offset));
      stage.append(button);
      return { button, offset: control.offset };
    });
    for (const [position, file] of files.entries()) {
      const dot = element("button", undefined, "gallery-dot");
      dot.type = "button";
      dot.setAttribute("aria-label", `Show image ${position + 1} of ${files.length}: ${file.replace(/\.[^.]+$/, "").replace(/-/g, " ")}`);
      dot.setAttribute("aria-controls", imageSlot.id);
      dot.addEventListener("click", () => {
        if (position !== index) showImage(position);
      });
      dots.append(dot);
    }
    stage.prepend(imageSlot);
    stage.append(dots);
    figure.append(stage, caption);
    gallery.append(figure, count, status, retryImage);
    navigateGallery = (offset) => showImage(index + offset);
    retryImage.addEventListener("click", () => showImage(index));
    showImage(0);
    return gallery;
  }

  async function loadDetails(slug) {
    const request = ++detailRequest;
    navigateGallery = null;
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
    navigateGallery = null;
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
  dialog.addEventListener("keydown", (event) => {
    if (
      !navigateGallery ||
      event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
      event.target.closest("input, textarea, select, [contenteditable]") ||
      !["ArrowLeft", "ArrowRight"].includes(event.key)
    ) return;
    event.preventDefault();
    navigateGallery(event.key === "ArrowLeft" ? -1 : 1);
  });
  retry.addEventListener("click", () => loadDetails(activeSlug));
  catalogueRetry.addEventListener("click", loadCatalogue);
  window.addEventListener("popstate", syncWithUrl);
  loadCatalogue();
})();
