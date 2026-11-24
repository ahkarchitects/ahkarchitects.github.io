(() => {
  const root = document.documentElement;
  const storageKey = "ahk-site-visited";
  let visited;

  try {
    visited = window.sessionStorage.getItem(storageKey);
    window.sessionStorage.setItem(storageKey, "true");
  } catch (error) {
    console.warn("Visit state could not be saved; skipping the opening animation.", error);
    return;
  }

  const navigation = performance.getEntriesByType("navigation")[0];
  const internalReferrer = document.referrer &&
    new URL(document.referrer).origin === window.location.origin;
  const isHomepage = /\/(?:index\.html)?$/.test(window.location.pathname);
  const isDeepLink = window.location.hash ||
    new URLSearchParams(window.location.search).has("project");

  if (visited || !isHomepage || isDeepLink || internalReferrer ||
      navigation?.type !== "navigate" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  root.classList.add("has-intro");
  window.addEventListener("pagehide", () => root.classList.remove("has-intro"));
})();
