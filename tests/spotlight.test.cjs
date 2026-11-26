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
  addEventListener(name, handler) { this.listeners[name] = handler; }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  querySelector(tag) {
    for (const child of this.children) {
      if (child.tag === tag) return child;
      const match = child.querySelector(tag);
      if (match) return match;
    }
    return null;
  }
  remove() {}
}

async function homepage(reduced = false) {
  const ids = Object.fromEntries([
    "project-list", "home-spotlight", "catalogue-loading", "catalogue-error",
    "catalogue-retry", "spotlight-previous", "spotlight-pause", "spotlight-next",
  ].map(id => [id, new Node()]));
  ids["project-list"].dataset.featured = "true";
  const hero = new Node();
  const controls = new Node();
  hero.append(ids["home-spotlight"], controls);
  const media = { matches: reduced, addEventListener() {} };
  const intervals = new Map();
  let nextTimer = 0;
  const document = {
    activeElement: null,
    hidden: false,
    listeners: {},
    getElementById: id => ids[id] || null,
    querySelector: selector => selector === ".home-hero" ? hero : controls,
    createElement: tag => new Node(tag),
    addEventListener(name, handler) { this.listeners[name] = handler; },
  };
  const references = ["architecture/01-house", "interiors/02-house", "landscape/03-house"];
  runInNewContext(source, {
    document,
    window: {
      location: { href: "https://example.com/" },
      matchMedia: () => media,
      setTimeout: () => ++nextTimer,
      clearTimeout() {},
      setInterval: (handler, delay) => {
        assert.equal(delay, 5000);
        intervals.set(++nextTimer, handler);
        return nextTimer;
      },
      clearInterval: id => intervals.delete(id),
    },
    fetch: async url => ({
      ok: true,
      json: async () => url.pathname.endsWith("index.json") ? references : {
        title: url.pathname.split("/")[2],
        location: "India",
        images: ["cover.jpg"],
      },
    }),
    AbortController, URL, console,
  });
  await new Promise(resolve => setImmediate(resolve));
  const active = () => ids["home-spotlight"].children.find(node => node.classes.has("is-active"));
  return { ids, hero, controls, document, intervals, active,
    advance() { for (const handler of [...intervals.values()]) handler(); },
  };
}

test("hero cycles original featured covers and links in order, then wraps", async () => {
  const page = await homepage();
  const slides = page.ids["home-spotlight"].children;
  assert.equal(slides.length, 3);
  assert.equal(page.intervals.size, 1);
  for (const [index, section] of ["architecture", "interiors", "landscape"].entries()) {
    const slug = `0${index + 1}-house`;
    assert.equal(page.active().href, `./${section}.html?project=${slug}`);
    assert.equal(page.active().querySelector("img").src, `https://example.com/${section}/${slug}/cover.jpg`);
    assert.equal(slides.filter(slide => slide.tabIndex === 0).length, 1);
    page.advance();
  }
  assert.equal(page.active(), slides[0]);
});

test("Pause stops autoplay while manual controls wrap in both directions", async () => {
  const page = await homepage();
  page.ids["spotlight-pause"].listeners.click();
  assert.equal(page.intervals.size, 0);
  assert.equal(page.ids["spotlight-pause"].textContent, "Play");
  page.ids["spotlight-previous"].listeners.click();
  assert.equal(page.active(), page.ids["home-spotlight"].children[2]);
  page.ids["spotlight-next"].listeners.click();
  assert.equal(page.active(), page.ids["home-spotlight"].children[0]);
  page.ids["spotlight-pause"].listeners.click();
  assert.equal(page.intervals.size, 1);
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
  reduced.ids["spotlight-next"].listeners.click();
  assert.equal(reduced.active(), reduced.ids["home-spotlight"].children[1]);
});
