// Servidor estático para previsualizar el Centro de Ayuda Niutax ERP.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'public');
const PORT = process.env.PORT || 4322;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

// Buzón de capturas: recibe un dataURL por POST y lo guarda en assets/capturas/_entrada/
const ENTRADA = path.join(ROOT, 'assets', 'capturas', '_entrada');

function recibirCaptura(req, res) {
  const nombre = (new URL(req.url, 'http://localhost').searchParams.get('nombre') || 'captura.png')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!/\.(png|jpe?g|webp)$/i.test(nombre)) {
    res.writeHead(400, { 'Access-Control-Allow-Origin': '*' });
    return res.end('Extensión no permitida');
  }
  let cuerpo = '';
  req.setEncoding('utf8');
  req.on('data', (c) => {
    cuerpo += c;
    if (cuerpo.length > 30e6) req.destroy();
  });
  req.on('end', () => {
    const m = cuerpo.match(/^data:image\/[a-z+]+;base64,(.+)$/s);
    if (!m) {
      res.writeHead(400, { 'Access-Control-Allow-Origin': '*' });
      return res.end('Cuerpo no es un dataURL de imagen');
    }
    fs.mkdirSync(ENTRADA, { recursive: true });
    const destino = path.join(ENTRADA, nombre);
    fs.writeFileSync(destino, Buffer.from(m[1], 'base64'));
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`${nombre} guardada (${Math.round(m[1].length * 0.75 / 1024)} KB)`);
  });
}

http
  .createServer((req, res) => {
    if (req.method === 'POST' && req.url.startsWith('/_captura')) return recibirCaptura(req, res);

    let url = decodeURIComponent(req.url.split('?')[0]);
    if (url === '/') url = '/index.html';
    let file = path.join(ROOT, url);
    if (!file.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    fs.stat(file, (err, stat) => {
      if ((err || (stat && stat.isDirectory())) && !path.extname(file) && fs.existsSync(file + '.html')) {
        file = file + '.html'; // URL limpia -> archivo .html
      } else if (err || (stat && stat.isDirectory())) {
        res.writeHead(404, { 'Content-Type': TIPOS['.html'] });
        return res.end('<h1>404</h1><p>No encontrado. <a href="/">Volver al centro de ayuda</a></p>');
      }
      fs.readFile(file, (e, data) => {
        if (e) {
          res.writeHead(404);
          return res.end('Not found');
        }
        res.writeHead(200, {
          'Content-Type': TIPOS[path.extname(file).toLowerCase()] || 'application/octet-stream',
          'Cache-Control': 'no-cache',
          // permite inyectar anon.js en el ERP desde otra pestaña durante la captura
          'Access-Control-Allow-Origin': '*',
        });
        res.end(data);
      });
    });
  })
  .listen(PORT, () => console.log('Centro de Ayuda en http://localhost:' + PORT));
