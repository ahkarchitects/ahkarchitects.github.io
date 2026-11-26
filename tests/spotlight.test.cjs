const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");

const source = readFileSync(require.resolve("../projects.js"), "utf8");

class Node {
  constructor(tag = "div") {
    this.tag = tag;
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.listeners = {};
    this.classes = new Set();
    this.classList = { toggle: (name, enabled) => {
      if (enabled) this.classes.add(name);
      else this.classes.delete(name);
    } };
  }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(name, value) { this.attributes[name] = value; }
  removeAttribute(name) { delete this.attributes[name]; }
  addEventListener(name, handler) { this.listeners[name] = handler; }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  querySelector(tag) {
    for (const child of this.children) {
      if (child.tag === tag || (tag.startsWith(".") && child.className === tag.slice(1))) return child;
      const match = child.querySelector(tag);
      if (match) return match;
    }
    return null;
  }
  remove() {}
}

async function portfolio({
  reduced = false, section = null, project = null,
  images = ["cover.jpg"], failures = new Set(), metadataReady = null,
  references = null,
} = {}) {
  const ids = Object.fromEntries([
    "project-list", "home-spotlight", "catalogue-loading", "catalogue-error",
    "catalogue-retry", "spotlight-indicators", "project-page", "project-catalogue",
    "project-page-title", "project-page-location", "project-loading",
    "project-error", "project-retry", "project-detail-content",
  ].map(id => [id, new Node()]));
  if (section) ids["project-list"].dataset.source = `./${section}`;
  else ids["project-list"].dataset.featured = "true";
  ids["project-page"].hidden = true;
  const hero = new Node();
  const controls = new Node();
  hero.append(ids["home-spotlight"], controls);
  const media = { matches: reduced, addEventListener() {} };
  const intervals = new Map();
  let nextTimer = 0;
  let now = 0;
  const document = {
    activeElement: null,
    hidden: false,
    listeners: {},
    getElementById: id => section && ["home-spotlight", "spotlight-indicators"].includes(id) ? null : ids[id] || null,
    querySelector: selector => selector === ".home-hero" ? hero : controls,
    createElement: tag => new Node(tag),
    addEventListener(name, handler) { this.listeners[name] = handler; },
  };
  references ??= section ? ["01-house", "02-house"] :
    ["architecture/01-house", "interiors/02-house", "landscape/03-house"];
  const requests = [];
  const errors = [];
  const url = new URL(section ? `https://example.com/${section}.html` : "https://example.com/");
  if (project !== null) url.searchParams.set("project", project);
  runInNewContext(source, {
    document,
    window: {
      location: { href: url.href },
      matchMedia: () => media,
      setTimeout: (handler, delay) => {
        if (delay <= 5000) intervals.set(++nextTimer, { handler, delay });
        else ++nextTimer;
        return nextTimer;
      },
      clearTimeout: id => intervals.delete(id),
    },
    fetch: async url => {
      requests.push(url.pathname);
      if (!url.pathname.endsWith("index.json")) await metadataReady;
      return {
        ok: !failures.has(url.pathname),
        status: failures.has(url.pathname) ? 503 : 200,
        json: async () => url.pathname.endsWith("index.json") ? references : {
          title: url.pathname.split("/")[2],
          location: "India",
          images,
        },
      };
    },
    AbortController, URL, console: { ...console, error: (...args) => errors.push(args) },
    performance: { now: () => now },
  });
  await new Promise(resolve => setImmediate(resolve));
  const active = () => ids["home-spotlight"].children.find(node => node.classes.has("is-active"));
  const indicators = () => ids["spotlight-indicators"].children;
  return { ids, hero, controls, document, intervals, active, requests, errors,
    toggle() { indicators().find(node => node.classes.has("is-active")).listeners.click(); },
    select(index) { indicators()[index].listeners.click(); },
    elapse(ms) { now += ms; },
    advance() {
      for (const [id, { handler, delay }] of [...intervals]) {
        intervals.delete(id);
        now += delay;
        handler();
      }
    },
  };
}

const homepage = reduced => portfolio({ reduced });

test("hero cycles original featured covers and links in order, then wraps", async () => {
  const page = await homepage();
  const slides = page.ids["home-spotlight"].children;
  assert.equal(slides.length, 3);
  assert.equal(page.intervals.size, 1);
  for (const [index, section] of ["architecture", "interiors", "landscape"].entries()) {
    const slug = `0${index + 1}-house`;
    assert.equal(page.active().href, `./${section}.html?project=${slug}`);
    assert.equal(page.active().querySelector("img").src, `https://example.com/${section}/${slug}/cover.jpg`);
    assert.equal(slides[index].querySelector(".project-number"), null);
    assert.equal(slides[index].querySelector("figcaption").className, undefined);
    assert.equal(slides.filter(slide => slide.tabIndex === 0).length, 1);
    page.advance();
  }
  assert.equal(page.active(), slides[0]);
});

test("featured cards use one image link with a top count and title/location caption", async () => {
  const page = await homepage();
  for (const [index, card] of page.ids["project-list"].children.entries()) {
    assert.equal(card.children.length, 1);
    const link = card.children[0];
    assert.equal(link.tag, "a");
    assert.equal(link.href, page.ids["home-spotlight"].children[index].href);
    assert.match(link.attributes["aria-label"], /^View project: .+, India$/);
    assert.equal(link.querySelector(".project-number").textContent, `0${index + 1} / 03`);
    const caption = link.querySelector("figcaption");
    assert.equal(caption.children[0].className, "project-title");
    assert.equal(caption.children[1].textContent, "India");
    assert.equal(link.querySelector("img").loading, "lazy");
  }
});

test("all six published projects appear in the autoplay loop and featured cards", async () => {
  const references = JSON.parse(readFileSync(require.resolve("../projects/index.json"), "utf8"));
  const page = await portfolio({ references });
  assert.equal(references.length, 6);
  assert.equal(page.ids["home-spotlight"].children.length, 6);
  assert.equal(page.ids["spotlight-indicators"].children.length, 6);
  assert.equal(page.ids["project-list"].children.length, 6);
  for (const [index, reference] of references.entries()) {
    const [section, slug] = reference.split("/");
    const href = `./${section}.html?project=${slug}`;
    assert.equal(page.active().href, href);
    const card = page.ids["project-list"].children[index];
    assert.equal(card.children[0].href, href);
    assert.equal(card.querySelector(".project-number").textContent, `0${index + 1} / 06`);
    assert.equal(page.intervals.size, 1);
    page.advance();
  }
  assert.equal(page.active(), page.ids["home-spotlight"].children[0]);
});

test("failed covers announce an explicit error inside the clickable image", async () => {
  const page = await homepage();
  const link = page.ids["project-list"].children[0].children[0];
  link.querySelector("img").listeners.error();
  assert.match(link.querySelector("figcaption").textContent, /cover image could not be loaded/);
  assert.equal(link.querySelector("figcaption").attributes.role, "status");
  assert.equal(page.errors.length, 1);
});

test("section cards navigate normally instead of intercepting clicks for a popup", async () => {
  const page = await portfolio({ section: "architecture" });
  const link = page.ids["project-list"].children[0].children[0];
  assert.equal(link.href, "?project=01-house");
  assert.equal(link.listeners.click, undefined);
  assert.equal(page.ids["project-page"].hidden, true);
});

test("project URLs show every original image in order without loading unrelated cards", async () => {
  const images = ["cover.jpg", "front.jpg", "floor-plan.jpg", "detail.jpg"];
  const page = await portfolio({ section: "architecture", project: "01-house", images });
  assert.equal(page.ids["project-catalogue"].hidden, true);
  assert.equal(page.ids["project-page"].hidden, false);
  assert.equal(page.ids["project-loading"].hidden, true);
  assert.equal(page.ids["project-page-title"].textContent, "01-house");
  assert.equal(page.ids["project-page-location"].textContent, "India");
  assert.deepEqual(page.requests, ["/architecture/index.json", "/architecture/01-house/metadata.json"]);
  const gallery = page.ids["project-detail-content"].children[0];
  assert.equal(gallery.children.length, images.length);
  gallery.children.forEach((figure, index) => {
    const image = figure.querySelector("img");
    assert.equal(image.src, `https://example.com/architecture/01-house/${images[index]}`);
    assert.equal(image.loading, index ? "lazy" : "eager");
    assert.match(image.alt, /^01-house:/);
  });
});

test("single-image projects still render an ordinary image list", async () => {
  const page = await portfolio({ section: "interiors", project: "01-house" });
  assert.equal(page.ids["project-detail-content"].children[0].children.length, 1);
});

test("the project loading status lasts only until its metadata is ready", async () => {
  let finishLoading;
  const metadataReady = new Promise(resolve => { finishLoading = resolve; });
  const page = await portfolio({ section: "architecture", project: "01-house", metadataReady });
  assert.equal(page.ids["project-page"].hidden, false);
  assert.equal(page.ids["project-loading"].hidden, false);
  assert.equal(page.ids["project-detail-content"].hidden, true);
  finishLoading();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(page.ids["project-loading"].hidden, true);
  assert.equal(page.ids["project-detail-content"].hidden, false);
});

test("invalid project URLs show an explicit error and never fetch unlisted metadata", async () => {
  const page = await portfolio({ section: "architecture", project: "../unknown" });
  assert.equal(page.ids["project-error"].hidden, false);
  assert.match(page.ids["project-error"].textContent, /could not be found/);
  assert.equal(page.ids["project-retry"].hidden, true);
  assert.deepEqual(page.requests, ["/architecture/index.json"]);
  assert.equal(page.errors.length, 1);
});

test("project catalogue and metadata failures can be retried on the page", async () => {
  for (const path of ["/architecture/index.json", "/architecture/01-house/metadata.json"]) {
    const failures = new Set([path]);
    const page = await portfolio({ section: "architecture", project: "01-house", failures });
    assert.equal(page.ids["project-loading"].hidden, true);
    assert.equal(page.ids["project-error"].hidden, false);
    assert.equal(page.ids["project-retry"].hidden, false);
    failures.clear();
    await page.ids["project-retry"].listeners.click();
    assert.equal(page.ids["project-error"].hidden, true);
    assert.equal(page.ids["project-detail-content"].hidden, false);
  }
});

test("gallery image failures show a retry that clears after the image loads", async () => {
  const page = await portfolio({ section: "architecture", project: "01-house" });
  const figure = page.ids["project-detail-content"].children[0].children[0];
  const image = figure.querySelector("img");
  const retry = figure.querySelector("button");
  const status = figure.querySelector("p");
  image.listeners.error();
  assert.equal(status.attributes.role, "alert");
  assert.equal(retry.hidden, false);
  retry.listeners.click();
  assert.equal(status.textContent, "Loading image...");
  assert.equal(figure.attributes["aria-busy"], "true");
  image.listeners.load();
  assert.equal(status.hidden, true);
  assert.equal(retry.hidden, true);
  assert.equal(figure.attributes["aria-busy"], "false");
});

test("active indicator toggles autoplay and inactive indicators select projects", async () => {
  const page = await homepage();
  page.toggle();
  assert.equal(page.intervals.size, 0);
  assert.match(page.ids["spotlight-indicators"].children[0].attributes["aria-label"], /^Play/);
  page.select(2);
  assert.equal(page.active(), page.ids["home-spotlight"].children[2]);
  page.select(0);
  assert.equal(page.active(), page.ids["home-spotlight"].children[0]);
  page.toggle();
  assert.equal(page.intervals.size, 1);
});

test("subtle indicators follow the active slide and only animate during autoplay", async () => {
  const page = await homepage();
  const indicators = page.ids["spotlight-indicators"];
  const current = () => indicators.children.findIndex(node => node.classes.has("is-active"));
  assert.equal(indicators.children.length, 3);
  assert.equal(current(), 0);
  assert.equal(indicators.dataset.running, "true");
  page.advance();
  assert.equal(current(), 1);
  page.toggle();
  assert.equal(indicators.dataset.running, "false");
  page.select(2);
  assert.equal(current(), 2);
  page.select(0);
  assert.equal(current(), 0);
  const reduced = await homepage(true);
  assert.equal(reduced.ids["spotlight-indicators"].dataset.running, "false");
});

test("pausing preserves partial progress and resumes the remaining countdown", async () => {
  const page = await homepage();
  const indicator = page.ids["spotlight-indicators"].children[0];
  const fill = indicator.children[0].children[0];
  page.elapse(2000);
  page.hero.listeners.mouseenter();
  assert.equal(indicator.children[0].children[0], fill);
  assert.equal(page.intervals.size, 0);
  page.elapse(10000);
  page.hero.listeners.mouseleave();
  assert.equal(indicator.children[0].children[0], fill);
  assert.equal([...page.intervals.values()][0].delay, 3000);
  page.advance();
  assert.equal(page.active(), page.ids["home-spotlight"].children[1]);
  assert.equal([...page.intervals.values()][0].delay, 5000);
});

test("hover, keyboard focus, and hidden tabs suspend autoplay; reduced motion starts paused", async () => {
  const page = await homepage();
  page.hero.listeners.mouseenter();
  assert.equal(page.intervals.size, 0);
  page.hero.listeners.mouseleave();
  assert.equal(page.intervals.size, 1);
  page.document.activeElement = page.active();
  page.hero.listeners.focusin();
  assert.equal(page.intervals.size, 0);
  page.document.activeElement = null;
  page.document.hidden = true;
  page.document.listeners.visibilitychange();
  assert.equal(page.intervals.size, 0);
  page.document.hidden = false;
  page.document.listeners.visibilitychange();
  assert.equal(page.intervals.size, 1);
  const reduced = await homepage(true);
  assert.equal(reduced.intervals.size, 0);
  reduced.select(1);
  assert.equal(reduced.active(), reduced.ids["home-spotlight"].children[1]);
});
