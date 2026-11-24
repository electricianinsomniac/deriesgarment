// Optional local QA: requires a separately launched Chromium debugging endpoint.
// No packages, installation, or browser launch is performed by this script.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const origin = 'http://127.0.0.1:8000';
const pages = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const target = pages.find(page => page.type === 'page');
if (!target) throw new Error('No local browser page found');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let next = 0;
const pending = new Map();
const errors = [];
socket.onmessage = event => {
  const data = JSON.parse(event.data);
  if (data.id) {
    const handlers = pending.get(data.id);
    if (handlers) {
      pending.delete(data.id);
      if (data.error) handlers.reject(new Error(JSON.stringify(data.error)));
      else handlers.resolve(data.result);
    }
  }
  if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.text);
  if (data.method === 'Log.entryAdded' && data.params.entry.source === 'security' && data.params.entry.level === 'error') errors.push(data.params.entry.text);
};
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++next;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Timed out: ' + method)); }, 15000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function navigate(path) {
  await call('Page.navigate', { url: origin + path });
  for (let i = 0; i < 50; i++) {
    if (await evaluate(`location.pathname === ${JSON.stringify(path)} && document.readyState === 'complete'`)) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(await evaluate('document.readyState'), 'complete');
  await evaluate('document.fonts.ready.then(() => true)');
}
async function screenshot(file) {
  const shot = await call('Page.captureScreenshot', { format: 'png' });
  await writeFile('.preview/' + file, Buffer.from(shot.data, 'base64'));
}

try {
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Log.enable');
  await mkdir('.preview', { recursive: true });
  for (const path of ['/', '/verify/', '/verify/document/']) {
    for (const width of [1440, 1024, 768, 390, 320]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 500 });
      await navigate(path);
      assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, `${path} overflows at ${width}`);
      assert.equal(await evaluate('document.querySelectorAll("h1").length'), 1);
      if (width >= 992) {
        assert.equal(await evaluate('getComputedStyle(document.querySelector(".dg-nav-links")).display'), 'flex');
        assert.equal(await evaluate('document.querySelector(".dg-nav-links").getBoundingClientRect().right <= innerWidth'), true);
      } else {
        assert.equal(await evaluate('getComputedStyle(document.querySelector(".dg-mobile-toggle")).display'), 'block');
        await evaluate('document.querySelector(".dg-mobile-toggle").click()');
        assert.equal(await evaluate('document.querySelector(".dg-mobile-toggle").getAttribute("aria-expanded")'), 'true');
        assert.equal(await evaluate('getComputedStyle(document.querySelector(".dg-nav-links")).display'), 'flex');
        await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        assert.equal(await evaluate('document.querySelector(".dg-mobile-toggle").getAttribute("aria-expanded")'), 'false');
        assert.equal(await evaluate('document.activeElement.id'), 'dg-mobile-toggle');
      }
      if (path === '/verify/' && [1440, 390].includes(width)) await screenshot(`trust-${width}.png`);
      console.log(`PASS ${path} at ${width}px: layout and navigation`);
    }
  }
  await navigate('/verify/');
  await call('Page.bringToFront');
  await call('Browser.grantPermissions', { origin, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
  await call('Runtime.evaluate', { expression: 'document.querySelector("[data-copy]").click()', userGesture: true });
  // Clipboard write completion is asynchronous.
  for (let i = 0; i < 30; i++) {
    if ((await evaluate('document.querySelector("#copy-status").textContent')).startsWith('Copied:')) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.match(await evaluate('document.querySelector("#copy-status").textContent'), /^Copied:/);
  console.log('PASS browser clipboard write and accessible announcement');
  await call('Accessibility.enable');
  const tree = await call('Accessibility.getFullAXTree');
  assert.ok(tree.nodes.some(node => node.role?.value === 'heading' && node.name?.value === 'Deries Trust Center'));
  assert.ok(tree.nodes.some(node => node.role?.value === 'navigation' && node.name?.value === 'Primary navigation'));
  console.log('PASS accessibility tree: page heading and named navigation');
  await call('Emulation.setScriptExecutionDisabled', { value: true });
  await navigate('/verify/');
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".dg-nav-links")).display'), 'flex');
  assert.equal(await evaluate('document.querySelector("#identity").textContent.includes("PT Deries Garment Nusantara")'), true);
  console.log('PASS no-JavaScript mobile navigation and company identity');
  await call('Emulation.setScriptExecutionDisabled', { value: false });
  assert.deepEqual(errors, [], 'Browser runtime/CSP errors');
  console.log('PASS no browser runtime exceptions or CSP errors');
} finally {
  socket.close();
}
