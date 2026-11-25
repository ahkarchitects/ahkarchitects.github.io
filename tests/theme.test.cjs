const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");

const source = readFileSync(require.resolve("../theme.js"), "utf8");

function appearance({ storage = new Map(), blocked = false } = {}) {
  const root = { dataset: {}, removeAttribute: () => delete root.dataset.theme };
  const select = { value: "" };
  const toolbar = { hidden: true };
  const listeners = new Map();
  const warnings = [];
  const control = {
    querySelector: () => select,
    closest: () => toolbar,
    addEventListener: (name, listener) => listeners.set(name, listener),
  };
  const meta = { style: { removeProperty() {} } };
  const access = (callback) => {
    if (blocked) throw new Error("Storage blocked");
    return callback();
  };
  let ready;
  runInNewContext(source, {
    document: {
      documentElement: root,
      querySelector: (selector) => selector === ".theme-control" ? control : meta,
      addEventListener: (_, listener) => { ready = listener; },
    },
    window: {
      matchMedia: () => ({ addEventListener() {} }),
      localStorage: {
        getItem: (key) => access(() => storage.get(key)),
        setItem: (key, value) => access(() => storage.set(key, value)),
        removeItem: (key) => access(() => storage.delete(key)),
      },
    },
    getComputedStyle: () => ({ backgroundColor: "#f4f1eb" }),
    console: { warn: (...args) => warnings.push(args) },
  });
  ready();
  return {
    root, select, toolbar, warnings,
    change(value) {
      select.value = value;
      listeners.get("change")();
    },
  };
}

test("appearance dropdown defaults to System and restores an explicit preference", () => {
  const initial = appearance();
  assert.equal(initial.select.value, "system");
  assert.equal(initial.root.dataset.theme, undefined);
  assert.equal(initial.toolbar.hidden, false);
  const saved = appearance({ storage: new Map([["ahk-theme", "dark"]]) });
  assert.equal(saved.select.value, "dark");
  assert.equal(saved.root.dataset.theme, "dark");
});

test("dropdown changes persist across pages and System clears the override", () => {
  const storage = new Map();
  const page = appearance({ storage });
  for (const value of ["dark", "light"]) {
    page.change(value);
    assert.equal(page.root.dataset.theme, value);
    assert.equal(appearance({ storage }).select.value, value);
  }
  page.change("system");
  assert.equal(page.root.dataset.theme, undefined);
  assert.equal(storage.has("ahk-theme"), false);
  assert.equal(appearance({ storage }).select.value, "system");
});

test("dropdown remains usable when preference storage is blocked", () => {
  const page = appearance({ blocked: true });
  page.change("dark");
  assert.equal(page.root.dataset.theme, "dark");
  assert.equal(page.warnings.length, 2);
});
