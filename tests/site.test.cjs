const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element {
  constructor() {
    this.events = {};
    this.attributes = {};
    this.hidden = true;
    this.textContent = '';
    this.classes = new Set();
    this.classList = {
      add: value => this.classes.add(value),
      contains: value => this.classes.has(value),
      toggle: (value, force) => {
        const enabled = force === undefined ? !this.classes.has(value) : force;
        if (enabled) this.classes.add(value); else this.classes.delete(value);
        return enabled;
      }
    };
  }
  addEventListener(type, callback) { (this.events[type] ||= []).push(callback); }
  async fire(type, event = {}) { for (const callback of this.events[type] || []) await callback(event); }
  setAttribute(name, value) { this.attributes[name] = value; }
  focus() { this.focused = true; }
  querySelector(selector) { return selector === 'i' ? this.icon : this.fallback; }
  querySelectorAll() { return this.children || []; }
  contains(target) { return [this, ...(this.children || [])].includes(target); }
  appendChild(element) { this.fallback = element; }
}

function setup(clipboard) {
  const document = new Element();
  const navbar = new Element();
  const toggle = new Element();
  toggle.icon = new Element();
  const links = new Element();
  const link = new Element();
  links.children = [link];
  navbar.children = [toggle, links, link];
  const status = new Element();
  const year = new Element();
  const button = new Element();
  const article = new Element();
  button.closest = () => article;
  button.dataset = { copy: 'deries.garment@gmail.com' };
  const ids = { 'dg-navbar': navbar, 'dg-mobile-toggle': toggle, 'dg-nav-links': links, 'copy-status': status };
  document.getElementById = id => ids[id];
  document.querySelectorAll = selector => selector === '[data-copy]' ? [button] : selector === '[data-current-year]' ? [year] : [];
  document.createElement = () => new Element();
  const media = new Element();
  const window = new Element();
  window.isSecureContext = true;
  window.scrollY = 0;
  window.matchMedia = () => media;
  vm.runInNewContext(fs.readFileSync('js/site.js', 'utf8'), { document, window, navigator: { clipboard }, Date });
  return { document, navbar, toggle, links, link, status, year, button, article, media };
}

test('mobile navigation opens, closes with Escape and restores keyboard focus', async () => {
  const ui = setup();
  assert.equal(ui.toggle.hidden, false);
  assert.equal(ui.navbar.classList.contains('is-enhanced'), true);
  await ui.toggle.fire('click');
  assert.equal(ui.toggle.attributes['aria-expanded'], 'true');
  assert.equal(ui.links.classList.contains('open'), true);
  await ui.document.fire('keydown', { key: 'Escape' });
  assert.equal(ui.toggle.attributes['aria-expanded'], 'false');
  assert.equal(ui.toggle.focused, true);
});

test('navigation closes on contact, outside click, keyboard exit and breakpoint change', async () => {
  const ui = setup();
  for (const close of [() => ui.link.fire('click'), () => ui.document.fire('click', { target: {} }), () => ui.navbar.fire('focusout', { relatedTarget: {} }), () => ui.media.fire('change')]) {
    await ui.toggle.fire('click');
    await close();
    assert.equal(ui.links.classList.contains('open'), false);
    assert.equal(ui.toggle.attributes['aria-expanded'], 'false');
  }
});

test('clipboard copies exact official contact and announces success', async () => {
  let copied;
  const ui = setup({ writeText: async value => { copied = value; } });
  await ui.button.fire('click');
  assert.equal(copied, 'deries.garment@gmail.com');
  assert.equal(ui.status.textContent, 'Copied: deries.garment@gmail.com');
  assert.equal(ui.year.textContent, String(new Date().getFullYear()));
});

test('denied or missing clipboard provides selectable contact without claiming success', async () => {
  for (const clipboard of [undefined, { writeText: async () => { throw new Error('denied'); } }]) {
    const ui = setup(clipboard);
    await ui.button.fire('click');
    assert.match(ui.status.textContent, /Copy unavailable/);
    assert.equal(ui.article.fallback.textContent, 'Select and copy: deries.garment@gmail.com');
    const original = ui.article.fallback;
    await ui.button.fire('click');
    assert.equal(ui.article.fallback, original);
  }
});
