(() => {
  const projectPage = document.getElementById("project-page");
  const catalogueSection = document.getElementById("project-catalogue");
  const title = document.getElementById("project-page-title");
  const location = document.getElementById("project-page-location");
  const loading = document.getElementById("project-loading");
  const errorMessage = document.getElementById("project-error");
  const retry = document.getElementById("project-retry");
  const content = document.getElementById("project-detail-content");
  const projectList = document.getElementById("project-list");
  const projectSource = projectList.dataset.source || "./projects";
  const featured = projectList.dataset.featured === "true";
  const requestedProject = featured ? null : new URL(window.location.href).searchParams.get("project");
  const spotlight = document.getElementById("home-spotlight");
  const spotlightSlides = new Map();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const spotlightIndicators = document.getElementById("spotlight-indicators");
  let spotlightIndex = 0;
  let spotlightTimer = null;
  let spotlightRemaining = 5000;
  let spotlightStarted = 0;
  let spotlightPaused = reducedMotion.matches;
  let spotlightHovered = false;
  const catalogueLoading = document.getElementById("catalogue-loading");
  const catalogueError = document.getElementById("catalogue-error");
  const catalogueRetry = document.getElementById("catalogue-retry");
  const knownProjects = new Set();
  const cache = new Map();
  const pendingMetadata = new Map();

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function validImageFile(file) {
    return typeof file === "string" && (
      /^[a-z0-9][a-z0-9-]*\.(jpg|jpeg|png|webp|avif)$/.test(file) ||
      /^\.\.\/\.\.\/interiors\/WhatsApp Image 2026-11-27 at 5\.35\.56 PM(?: \(1\))?\.jpeg$/.test(file)
    );
  }

  function imageUrl(slug, file) {
    return new URL(`${projectFolder(slug)}/${file}`, window.location.href).href;
  }

  function validateMetadata(data) {
    if (!data || typeof data !== "object") throw new Error("Invalid project metadata.");
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

  function imageAlt(projectTitle, file) {
    return `${projectTitle}: ${file.replace(/\.[^.]+$/, "").replace(/-/g, " ").replace(/^.*\//, "")}`;
  }

  function projectFolder(slug) {
    return `${featured ? "." : projectSource}/${slug}`;
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
      const request = readJson(`${projectFolder(slug)}/metadata.json`)
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
    const caption = element("figcaption", undefined, className === "spotlight-cover" ? undefined : "project-caption");
    caption.append(
      element("span", data.title, "project-title"),
      element("span", data.location, "project-location")
    );
    if (number) figure.append(element("p", number, "project-number"));
    image.addEventListener("error", () => {
      caption.textContent = `${data.title}: cover image could not be loaded.`;
      caption.setAttribute("role", "status");
      console.error(`Could not load the cover for project "${slug}".`);
    });
    image.src = imageUrl(slug, data.cover.file);
    figure.append(image, caption);
    return figure;
  }

  function spotlightStatus(message) {
    if (!spotlight) return;
    window.clearTimeout(spotlightTimer);
    spotlightTimer = null;
    spotlightSlides.clear();
    spotlightIndex = 0;
    spotlightRemaining = 5000;
    spotlightIndicators.hidden = true;
    spotlightIndicators.replaceChildren();
    const status = element("p", message, "spotlight-status");
    status.setAttribute("role", "status");
    spotlight.replaceChildren(status);
    spotlight.setAttribute("aria-busy", "false");
  }

  function renderSpotlight(slug, data, href) {
    if (!spotlight) return;
    const link = element("a", undefined, "spotlight-project");
    link.href = href;
    link.setAttribute("aria-label", `View project: ${data.title}`);
    const figure = coverFigure(slug, data, "spotlight-cover");
    figure.querySelector("img").fetchPriority = spotlightSlides.size ? "auto" : "high";
    figure.querySelector("figcaption").replaceChildren(
      element("span", data.title, "spotlight-title"),
      element("span", data.location, "spotlight-location")
    );
    link.append(figure);
    spotlightSlides.get(slug)?.remove();
    spotlightSlides.set(slug, link);
    const orderedSlides = [...knownProjects].flatMap(project => {
      const slide = spotlightSlides.get(project);
      return slide ? [slide] : [];
    });
    spotlight.replaceChildren(...orderedSlides);
    spotlight.setAttribute("aria-busy", "false");
    spotlightIndicators.hidden = orderedSlides.length < 2;
    spotlightIndicators.replaceChildren(...orderedSlides.map((slide, index) => {
      const button = element("button", undefined, "spotlight-indicator");
      button.type = "button";
      button.dataset.title = slide.querySelector(".spotlight-title").textContent;
      button.append(element("span", undefined, "spotlight-indicator-track"));
      button.addEventListener("click", () => {
        if (index === spotlightIndex) spotlightPaused = !spotlightPaused;
        else showSpotlight(index);
        scheduleSpotlight();
      });
      return button;
    }));
    showSpotlight(0);
    scheduleSpotlight();
  }

  function showSpotlight(index) {
    const slides = [...spotlight.children];
    if (!spotlightSlides.size) return;
    window.clearTimeout(spotlightTimer);
    spotlightTimer = null;
    spotlightIndex = (index + slides.length) % slides.length;
    spotlightRemaining = 5000;
    slides.forEach((slide, position) => {
      const active = position === spotlightIndex;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
      slide.tabIndex = active ? 0 : -1;
    });
    updateSpotlightIndicators();
  }

  function updateSpotlightIndicators() {
    if (!spotlightIndicators) return;
    [...spotlightIndicators.children].forEach((indicator, position) => {
      indicator.classList.toggle("is-active", position === spotlightIndex);
      indicator.querySelector("span").replaceChildren(element("span", undefined, "spotlight-indicator-fill"));
    });
    labelSpotlightIndicators();
  }

  function labelSpotlightIndicators() {
    if (!spotlightIndicators) return;
    [...spotlightIndicators.children].forEach((indicator, position) => {
      const active = position === spotlightIndex;
      indicator.setAttribute("aria-current", String(active));
      indicator.setAttribute("aria-label", active
        ? `${spotlightPaused ? "Play" : "Pause"} featured slideshow: ${indicator.dataset.title}`
        : `Show featured project: ${indicator.dataset.title}`);
    });
  }

  function scheduleSpotlight() {
    if (!spotlight) return;
    if (spotlightTimer !== null) {
      window.clearTimeout(spotlightTimer);
      spotlightRemaining = Math.max(0, spotlightRemaining - (performance.now() - spotlightStarted));
      spotlightTimer = null;
    }
    spotlightIndicators.dataset.running = "false";
    labelSpotlightIndicators();
    if (spotlightSlides.size < 2 || spotlightPaused || spotlightHovered ||
        document.hidden || document.querySelector(".home-hero").contains(document.activeElement)) return;
    spotlightStarted = performance.now();
    spotlightTimer = window.setTimeout(() => {
      spotlightTimer = null;
      showSpotlight(spotlightIndex + 1);
      scheduleSpotlight();
    }, spotlightRemaining);
    spotlightIndicators.dataset.running = "true";
  }

  function renderCard(card, slug, data, number, total) {
    const link = element("a", undefined, "project-details-link");
    link.setAttribute("aria-label", `View project: ${data.title}, ${data.location}`);
    if (featured) {
      const [section, project] = slug.split("/");
      link.href = `./${section}.html?project=${project}`;
    } else {
      link.href = `?project=${slug}`;
    }
    link.dataset.project = slug;
    link.append(coverFigure(slug, data, "project-image", `${number} / ${total}`));
    card.replaceChildren(link);
    if (featured) renderSpotlight(slug, data, link.href);
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
      if (featured && number === "01" && !spotlightSlides.size) spotlightStatus("The featured image could not be loaded. Retry the first project below.");
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
    if (requestedProject !== null) {
      loading.hidden = false;
      errorMessage.hidden = true;
      retry.hidden = true;
    }
    spotlightStatus("Loading featured image...");
    if (spotlight) spotlight.setAttribute("aria-busy", "true");
    catalogueLoading.textContent = "Loading projects...";
    catalogueLoading.hidden = false;
    catalogueError.hidden = true;
    catalogueRetry.hidden = true;
    projectList.setAttribute("aria-busy", "true");
    try {
      const folders = await readJson(`${projectSource}/index.json`);
      const folderPattern = featured
        ? /^(architecture|interiors|landscape)\/[a-z0-9]+(?:-[a-z0-9]+)*$/
        : /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (
        !Array.isArray(folders) ||
        folders.some((slug) => typeof slug !== "string" || !folderPattern.test(slug)) ||
        new Set(folders).size !== folders.length
      ) {
        throw new Error(`${projectSource}/index.json must list unique ${featured ? "section/project references" : "lowercase, hyphen-separated folder names"}.`);
      }
      if (!featured) folders.sort();
      knownProjects.clear();
      folders.forEach((slug) => knownProjects.add(slug));
      if (requestedProject !== null) {
        await loadDetails(requestedProject);
        return;
      }
      projectList.replaceChildren();
      const cards = folders.map((slug, index) => {
        const card = element("article", undefined, "project-card");
        card.id = `project-${String(index + 1).padStart(2, "0")}`;
        projectList.append(card);
        return loadCard(card, slug, String(index + 1).padStart(2, "0"), String(folders.length).padStart(2, "0"));
      });
      catalogueLoading.hidden = folders.length > 0;
      if (!folders.length) {
        catalogueLoading.textContent = "No projects published yet.";
        spotlightStatus("No featured projects published yet.");
      }
      await Promise.all(cards);
    } catch (error) {
      console.error("Could not load the project list.", error);
      spotlightStatus("The featured image could not be loaded. Try loading the projects below again.");
      catalogueLoading.hidden = true;
      catalogueError.textContent = `Projects could not be loaded. Check ${projectSource}/index.json or try again.`;
      catalogueError.hidden = false;
      catalogueRetry.hidden = false;
      if (requestedProject !== null) {
        loading.hidden = true;
        errorMessage.textContent = "Project details could not be loaded. Please try again.";
        errorMessage.hidden = false;
        retry.hidden = false;
      }
    } finally {
      projectList.setAttribute("aria-busy", "false");
    }
  }

  function renderDetails(slug, data) {
    title.textContent = data.title;
    location.textContent = data.location;
    document.title = `${data.title} | AHK Architects`;
    content.replaceChildren(renderGallery(slug, data));
    content.hidden = false;
  }

  function renderGallery(slug, data) {
    const files = [data.cover.file, ...data.gallery];
    const gallery = element("section", undefined, "detail-gallery");
    gallery.setAttribute("aria-label", `${data.title} image gallery`);
    files.forEach((file, index) => {
      const figure = element("figure", undefined, "project-gallery-item");
      const image = element("img");
      image.alt = index === 0 ? data.cover.alt : imageAlt(data.title, file);
      image.decoding = "async";
      image.loading = index === 0 ? "eager" : "lazy";
      const status = element("p", "Loading image...", "detail-message");
      status.setAttribute("role", "status");
      const retryImage = element("button", "Retry image", "text-link");
      retryImage.type = "button";
      retryImage.setAttribute("aria-label", `Retry image ${index + 1}`);
      retryImage.hidden = true;
      figure.setAttribute("aria-busy", "true");
      image.addEventListener("load", () => {
        figure.setAttribute("aria-busy", "false");
        status.hidden = true;
        retryImage.hidden = true;
      });
      image.addEventListener("error", () => {
        figure.setAttribute("aria-busy", "false");
        status.textContent = "This image could not be loaded. Please retry it.";
        status.setAttribute("role", "alert");
        status.hidden = false;
        retryImage.hidden = false;
        console.error(`Could not load gallery image "${file}" for project "${slug}".`);
      });
      function loadImage() {
        figure.setAttribute("aria-busy", "true");
        status.textContent = "Loading image...";
        status.setAttribute("role", "status");
        status.hidden = false;
        retryImage.hidden = true;
        image.removeAttribute("src");
        image.src = imageUrl(slug, file);
      }
      retryImage.addEventListener("click", loadImage);
      loadImage();
      figure.append(image, status, retryImage);
      gallery.append(figure);
    });
    return gallery;
  }

  async function loadDetails(slug) {
    content.hidden = true;
    content.replaceChildren();
    errorMessage.hidden = true;
    retry.hidden = true;
    loading.hidden = false;
    title.textContent = cache.get(slug)?.title || "Project details";
    try {
      if (!knownProjects.has(slug)) throw new Error("Project not found.");
      const data = await getMetadata(slug);
      renderDetails(slug, data);
    } catch (error) {
      console.error(`Could not load project "${slug}".`, error);
      errorMessage.textContent = !knownProjects.has(slug)
        ? "This project could not be found. Return to the project list to choose a project."
        : "Project details could not be loaded. Please try again.";
      errorMessage.hidden = false;
      retry.hidden = !knownProjects.has(slug);
    } finally {
      loading.hidden = true;
    }
  }

  if (spotlight) {
    const hero = document.querySelector(".home-hero");
    hero.addEventListener("mouseenter", () => {
      spotlightHovered = true;
      scheduleSpotlight();
    });
    hero.addEventListener("mouseleave", () => {
      spotlightHovered = false;
      scheduleSpotlight();
    });
    hero.addEventListener("focusin", scheduleSpotlight);
    hero.addEventListener("focusout", () => window.setTimeout(scheduleSpotlight, 0));
    document.addEventListener("visibilitychange", scheduleSpotlight);
    reducedMotion.addEventListener("change", () => {
      spotlightPaused = reducedMotion.matches;
      scheduleSpotlight();
    });
  }
  if (requestedProject !== null) {
    catalogueSection.hidden = true;
    projectPage.hidden = false;
    retry.addEventListener("click", loadCatalogue);
  }
  catalogueRetry.addEventListener("click", loadCatalogue);
  loadCatalogue();
})();
