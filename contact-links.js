(() => {
  const source = document.querySelector("[data-contact-links-source]");
  for (const slot of document.querySelectorAll("[data-contact-links-copy]")) {
    const copy = source.cloneNode(true);
    copy.removeAttribute("data-contact-links-source");
    slot.replaceChildren(copy);
  }
})();
