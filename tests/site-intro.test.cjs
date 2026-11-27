const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");

const source = readFileSync(require.resolve("../site-intro.js"), "utf8");

function visit({
  path = "/",
  storage = new Map(),
  type = "navigate",
  referrer = "",
  reducedMotion = false,
  storageBlocked = false,
} = {}) {
  const classes = new Set();
  const listeners = new Map();
  const warnings = [];
  runInNewContext(source, {
    document: {
      documentElement: { classList: {
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name),
      } },
      referrer,
    },
    window: {
      location: new URL(path, "https://example.com"),
      sessionStorage: {
        getItem: (key) => {
          if (storageBlocked) throw new Error("Storage blocked");
          return storage.get(key);
        },
        setItem: (key, value) => storage.set(key, value),
      },
      matchMedia: () => ({ matches: reducedMotion }),
      addEventListener: (name, listener) => listeners.set(name, listener),
    },
    performance: { getEntriesByType: () => [{ type }] },
    console: { warn: (...args) => warnings.push(args) },
    URL,
    URLSearchParams,
  });
  return { enabled: () => classes.has("has-intro"), listeners, warnings };
}

test("plays on the first direct homepage visit only", () => {
  const storage = new Map();
  assert.equal(visit({ storage }).enabled(), true);
  assert.equal(visit({ path: "/contact.html", storage }).enabled(), false);
  assert.equal(visit({ storage }).enabled(), false);
});

test("landing on either subpage also prevents an intro on a later homepage visit", () => {
  for (const path of ["/about.html", "/contact.html"]) {
    const storage = new Map();
    assert.equal(visit({ path, storage }).enabled(), false);
    assert.equal(visit({ storage }).enabled(), false);
  }
});

test("supports a direct index.html landing and an external referral", () => {
  assert.equal(visit({ path: "/index.html" }).enabled(), true);
  assert.equal(visit({ referrer: "https://external.example/" }).enabled(), true);
});

test("skips internal links, deep links, reloads, history, and reduced motion", () => {
  for (const options of [
    { referrer: "https://example.com/contact.html" },
    { path: "/#architecture" },
    { path: "/?project=02-jessy-duplex-residence" },
    { path: "/architecture.html?project=02-jessy-duplex-residence" },
    { path: "/interiors.html?project=01-office-space" },
    { path: "/landscape.html?project=01-shatam-lake" },
    { type: "reload" },
    { type: "back_forward" },
    { reducedMotion: true },
  ]) {
    assert.equal(visit(options).enabled(), false, JSON.stringify(options));
  }
});

test("skips the intro and warns when visit storage is blocked", () => {
  const result = visit({ storageBlocked: true });
  assert.equal(result.enabled(), false);
  assert.equal(result.warnings.length, 1);
});

test("leaving during the intro prevents it from reappearing from the back-forward cache", () => {
  const result = visit();
  assert.equal(result.enabled(), true);
  result.listeners.get("pagehide")();
  assert.equal(result.enabled(), false);
});
