(() => {
  const root = document.documentElement;
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  const storageKey = "ahk-theme";
  let preference = "system";

  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === "light" || saved === "dark") preference = saved;
  } catch (error) {
    console.warn("Theme preference could not be read; using the system theme.", error);
  }

  function applyTheme() {
    if (preference === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.dataset.theme = preference;
    }
    // Resolve light-dark() to a concrete color for the browser's toolbar.
    const toolbar = document.querySelector('meta[name="theme-color"]');
    toolbar.style.backgroundColor = "var(--paper)";
    toolbar.content = getComputedStyle(toolbar).backgroundColor;
    toolbar.style.removeProperty("background-color");
  }

  applyTheme();
  systemTheme.addEventListener("change", applyTheme);

  document.addEventListener("DOMContentLoaded", () => {
    const control = document.querySelector(".theme-control");
    const select = control.querySelector('select[name="theme"]');
    select.value = preference;
    control.closest(".theme-toolbar").hidden = false;
    control.addEventListener("change", () => {
      preference = select.value;
      applyTheme();
      try {
        if (preference === "system") {
          window.localStorage.removeItem(storageKey);
        } else {
          window.localStorage.setItem(storageKey, preference);
        }
      } catch (error) {
        console.warn("Theme preference could not be saved; it applies to this visit only.", error);
      }
    });
  });
})();
