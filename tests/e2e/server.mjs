import http from 'node:http';

/**
 * @param {string} body
 * @param {string} [script]
 */
function page(body, script = '') {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Consent fixture</title></head><body>${body}<script>${script}</script></body></html>`;
}

const directBannerScript = `
function showBanner(storageKey = 'choice') {
  if (localStorage.getItem(storageKey) === 'rejected') return;
  const dialog = document.createElement('div');
  dialog.setAttribute('role', 'dialog');
  dialog.style.position = 'fixed';
  dialog.innerHTML = '<h2>Cookie privacy consent</h2><button id="accept">Accept all</button><button id="reject">Reject all</button>';
  dialog.querySelector('#accept').addEventListener('click', () => {
    const marker = document.createElement('div'); marker.id = 'accept-marker'; document.body.append(marker);
    localStorage.setItem(storageKey, 'accepted');
  });
  dialog.querySelector('#reject').addEventListener('click', () => {
    localStorage.setItem(storageKey, 'rejected'); dialog.remove();
  });
  document.body.append(dialog);
}`;

/** @type {Readonly<Record<string, string>>} */
const routes = {
  '/dynamic': page(
    '<main><h1>Dynamic fixture</h1></main>',
    `${directBannerScript} setTimeout(() => showBanner(), 100);`,
  ),
  '/settings': page(
    '<main><h1>Complex settings fixture</h1></main><div role="dialog" style="position:fixed"><h2>Cookie privacy choices</h2><button id="manage">Manage preferences</button><button id="accept">Accept all</button></div>',
    `
document.querySelector('#accept').addEventListener('click', () => localStorage.setItem('unsafe', 'accepted'));
document.querySelector('#manage').addEventListener('click', () => {
  const dialog = document.querySelector('[role="dialog"]');
  dialog.innerHTML = '<h2>Privacy preferences</h2>' +
    '<label>Required authentication <input id="required" type="checkbox" checked disabled></label>' +
    '<label>Optional analytics <input id="analytics" type="checkbox" checked></label>' +
    '<section id="vendors"><h3>Vendors and partners</h3><label>Optional vendor Alpha <span id="vendor" role="switch" aria-checked="true"></span></label></section>' +
    '<label>Legitimate interest for measurement <button id="li" role="switch" aria-checked="true">Object</button></label>' +
    '<button id="save">Save choices</button><button id="accept-selected">Accept selected</button>';
  for (const id of ['vendor', 'li']) {
    document.querySelector('#' + id).addEventListener('click', event => event.currentTarget.setAttribute('aria-checked', 'false'));
  }
  document.querySelector('#accept-selected').addEventListener('click', () => localStorage.setItem('unsafe', 'accepted-selected'));
  document.querySelector('#save').addEventListener('click', () => {
    localStorage.setItem('settings-result', JSON.stringify({
      required: document.querySelector('#required').checked,
      analytics: document.querySelector('#analytics').checked,
      vendor: document.querySelector('#vendor').getAttribute('aria-checked'),
      legitimateInterest: document.querySelector('#li').getAttribute('aria-checked')
    }));
    dialog.remove();
  });
});`,
  ),
  '/false-positives': page(
    '<main><form id="login"><h2>Login</h2><p>Read our privacy policy</p><label>Remember me <input id="remember" type="checkbox" checked></label><button>Agree and sign in</button></form><div role="dialog"><h2>Privacy-friendly newsletter</h2><button>Subscribe</button><button>No thanks</button></div><section role="dialog"><h2>Cookie Magazine age gate</h2><button>I am over 18</button><button>Leave</button></section></main>',
    `document.addEventListener('click', event => { if (event.target instanceof HTMLElement) localStorage.setItem('unexpected-click', event.target.textContent || 'unknown'); });`,
  ),
  '/shadow': page(
    '<main><h1>Shadow fixture</h1><div id="host"></div></main>',
    `${directBannerScript}
const shadow = document.querySelector('#host').attachShadow({ mode: 'open' });
const dialog = document.createElement('div');
dialog.setAttribute('role', 'dialog'); dialog.style.position = 'fixed';
dialog.innerHTML = '<h2>Cookie consent</h2><button id="accept">Accept all</button><button id="reject">Reject all</button>';
dialog.querySelector('#accept').addEventListener('click', () => localStorage.setItem('shadow-choice', 'accepted'));
dialog.querySelector('#reject').addEventListener('click', () => { localStorage.setItem('shadow-choice', 'rejected'); dialog.remove(); });
shadow.append(dialog);`,
  ),
  '/iframe': page(
    '<main><h1>Frame fixture</h1><iframe title="Consent frame" src="/iframe-inner"></iframe></main>',
  ),
  '/iframe-inner': page(
    '<main><h1>Inner frame</h1></main>',
    `${directBannerScript} showBanner('frame-choice');`,
  ),
  '/spa-delayed': page(
    '<main><h1>SPA fixture</h1></main>',
    `${directBannerScript}
setTimeout(() => history.pushState({}, '', '/spa-delayed/route'), 200);
setTimeout(() => showBanner('spa-choice'), 30500);`,
  ),
};

const server = http.createServer((request, response) => {
  const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
  const html = routes[path] ?? routes['/dynamic'] ?? '';
  response.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(html);
});
server.listen(4173, '127.0.0.1');
