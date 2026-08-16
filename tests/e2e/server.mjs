import http from 'node:http';

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Consent fixture</title></head>
<body><main><h1>Fixture page</h1></main><script>
if (localStorage.getItem('choice') !== 'rejected') {
  setTimeout(() => {
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.style.position = 'fixed';
    dialog.innerHTML = '<h2>Cookie privacy consent</h2><button id="accept">Accept all</button><button id="reject">Reject all</button>';
    dialog.querySelector('#accept').addEventListener('click', () => {
      const marker = document.createElement('div'); marker.id = 'accept-marker'; document.body.append(marker);
      localStorage.setItem('choice', 'accepted');
    });
    dialog.querySelector('#reject').addEventListener('click', () => {
      localStorage.setItem('choice', 'rejected'); dialog.remove();
    });
    document.body.append(dialog);
  }, 100);
}
</script></body></html>`;

const server = http.createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  response.end(html);
});
server.listen(4173, '127.0.0.1');
