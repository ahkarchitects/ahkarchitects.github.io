(() => {
  const menu = document.querySelector(".site-menu");
  const toggle = menu.querySelector("summary");

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.open) {
      menu.open = false;
      toggle.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target)) menu.open = false;
  });

  menu.querySelector("nav").addEventListener("click", (event) => {
    if (event.target.closest("a")) menu.open = false;
  });
})();
