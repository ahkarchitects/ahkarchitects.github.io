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
      if (child.tag === tag || (tag.startsWith(".") && child.className === tag.slice(1))) return child;
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
    "catalogue-retry", "spotlight-indicators",
  ].map(id => [id, new Node()]));
  ids["project-list"].dataset.featured = "true";
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
      setTimeout: (handler, delay) => {
        if (delay <= 5000) intervals.set(++nextTimer, { handler, delay });
        else ++nextTimer;
        return nextTimer;
      },
      clearTimeout: id => intervals.delete(id),
    },
    fetch: async url => ({
      ok: true,
      json: async () => url.pathname.endsWith("index.json") ? references : {
        title: url.pathname.split("/")[2],
        location: "India",
        images: ["cover.jpg"],
      },
    }),
    AbortController, URL, console, performance: { now: () => now },
  });
  await new Promise(resolve => setImmediate(resolve));
  const active = () => ids["home-spotlight"].children.find(node => node.classes.has("is-active"));
  const indicators = () => ids["spotlight-indicators"].children;
  return { ids, hero, controls, document, intervals, active,
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

test("failed covers announce an explicit error inside the clickable image", async () => {
  const page = await homepage();
  const link = page.ids["project-list"].children[0].children[0];
  const originalError = console.error;
  const errors = [];
  console.error = message => errors.push(message);
  try {
    link.querySelector("img").listeners.error();
  } finally {
    console.error = originalError;
  }
  assert.match(link.querySelector("figcaption").textContent, /cover image could not be loaded/);
  assert.equal(link.querySelector("figcaption").attributes.role, "status");
  assert.equal(errors.length, 1);
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
