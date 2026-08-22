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
  '/usercentrics-layered': page(
    '<main><h1>Layered Usercentrics fixture</h1><div id="usercentrics-root"></div></main>',
    `
const host = document.querySelector('#usercentrics-root');
const shadow = host.attachShadow({ mode: 'open' });
const dialog = document.createElement('section');
dialog.setAttribute('role', 'dialog');
dialog.dataset.testid = 'uc-default-ui';
dialog.style.position = 'fixed';
dialog.innerHTML = '<h2>Privacy settings</h2><p>Cookies, advertising, analytics, personalization and device identification</p>' +
  '<button data-testid="uc-more-button">Manage privacy settings</button><button id="accept-all">Accept all</button>';
shadow.append(dialog);
dialog.querySelector('#accept-all').addEventListener('click', () => localStorage.setItem('uc-unsafe', 'accept-all'));
dialog.querySelector('[data-testid="uc-more-button"]').addEventListener('click', () => {
  dialog.innerHTML = '<h2>Privacy settings</h2>' +
    '<label>Necessary authentication <input id="uc-required" type="checkbox" checked disabled></label>' +
    '<label>Optional analytics and measurement <input id="uc-analytics" type="checkbox" checked></label>' +
    '<button data-testid="uc-show-vendors">View vendors and partners</button>' +
    '<button id="uc-accept-selected">Accept selected</button>';
  dialog.querySelector('#uc-accept-selected').addEventListener('click', () => localStorage.setItem('uc-unsafe', 'accept-selected'));
  dialog.querySelector('[data-testid="uc-show-vendors"]').addEventListener('click', event => {
    event.currentTarget.remove();
    dialog.insertAdjacentHTML('beforeend',
      '<section><h3>Advertising vendors and legitimate interest</h3>' +
      '<label>Acme tracking pixel vendor <span id="uc-vendor" role="switch" aria-checked="true"></span></label>' +
      '<label>Legitimate interest profiling <span id="uc-li" role="switch" aria-checked="true"></span></label></section>' +
      '<button id="uc-save">Save choices</button>');
    for (const id of ['uc-vendor', 'uc-li']) {
      dialog.querySelector('#' + id).addEventListener('click', click => click.currentTarget.setAttribute('aria-checked', 'false'));
    }
    dialog.querySelector('#uc-save').addEventListener('click', () => {
      localStorage.setItem('uc-result', JSON.stringify({
        required: dialog.querySelector('#uc-required').checked,
        analytics: dialog.querySelector('#uc-analytics').checked,
        vendor: dialog.querySelector('#uc-vendor').getAttribute('aria-checked'),
        legitimateInterest: dialog.querySelector('#uc-li').getAttribute('aria-checked')
      }));
      dialog.remove();
    });
  });
});`,
  ),
  '/stalled-consent-workflow': page(
    '<main><h1>Stalled workflow fixture</h1></main><div role="dialog" style="position:fixed"><h2>Cookie privacy consent</h2><button id="manage">Manage privacy settings</button><button id="accept">Accept all</button></div>',
    `
document.querySelector('#accept').addEventListener('click', () => localStorage.setItem('stalled-unsafe', 'accept-all'));
document.querySelector('#manage').addEventListener('click', () => {
  const dialog = document.querySelector('[role="dialog"]');
  dialog.innerHTML = '<h2>Welcome to the product tour</h2><button id="next">Next</button>';
  dialog.querySelector('#next').addEventListener('click', () => localStorage.setItem('stalled-unsafe', 'next'));
});`,
  ),
  '/transient-consent-control': page(
    '<main><h1>Transient control fixture</h1></main><div role="dialog" style="position:fixed"><h2>Cookie privacy preferences</h2><label>Optional analytics <span id="transient-switch" role="switch" aria-checked="true"></span></label><button id="transient-save">Save choices</button></div>',
    `
let attempts = 0;
document.querySelector('#transient-switch').addEventListener('click', event => {
  attempts += 1;
  localStorage.setItem('transient-attempts', String(attempts));
  if (attempts >= 2) event.currentTarget.setAttribute('aria-checked', 'false');
});
document.querySelector('#transient-save').addEventListener('click', () => {
  localStorage.setItem('transient-result', document.querySelector('#transient-switch').getAttribute('aria-checked'));
  document.querySelector('[role="dialog"]').remove();
});`,
  ),
  '/false-positives': page(
    '<main><form id="login"><h2>Login</h2><p>Read our privacy policy</p><label>Remember me <input id="remember" type="checkbox" checked></label><button>Agree and sign in</button></form><div role="dialog"><h2>Privacy-friendly newsletter</h2><button>Subscribe</button><button>No thanks</button></div><section role="dialog"><h2>Cookie Magazine age gate</h2><button>I am over 18</button><button>Leave</button></section><div role="dialog"><h2>Privacy settings product tour</h2><button>Manage preferences</button><button>Next</button></div><div role="dialog"><h2>Privacy notifications</h2><button>Allow all</button><button>Deny all</button></div><div role="dialog"><h2>Location access and privacy</h2><button>Allow all</button><button>Deny all</button></div><div role="dialog"><h2>Privacy account settings</h2><button>Reject all changes</button><button>Save preferences</button></div></main>',
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
  '/iframe-slow': page(
    '<main><h1>Slow frame fixture</h1><iframe title="Consent frame" src="/iframe-slow-inner"></iframe></main>',
  ),
  '/iframe-slow-inner': page(
    '<main><h1>Inner frame</h1></main><div role="dialog" style="position:fixed"><h2>Cookie privacy consent</h2><button id="manage">Manage privacy settings</button><button id="accept">Accept all</button></div>',
    `
document.querySelector('#accept').addEventListener('click', () => localStorage.setItem('frame-unsafe', 'accepted'));
document.querySelector('#manage').addEventListener('click', () => {
  const dialog = document.querySelector('[role="dialog"]');
  dialog.innerHTML = '<h2>Loading privacy choices</h2><p>Please wait</p>';
  setTimeout(() => {
    dialog.innerHTML = '<h2>Cookie privacy choices</h2><button id="reject">Reject all</button><button id="accept-later">Accept all</button>';
    dialog.querySelector('#accept-later').addEventListener('click', () => localStorage.setItem('frame-unsafe', 'accepted-later'));
    dialog.querySelector('#reject').addEventListener('click', () => {
      localStorage.setItem('slow-frame-choice', 'rejected');
      dialog.remove();
    });
  }, 1200);
});`,
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
