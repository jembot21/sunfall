import { createServer } from 'node:http';
import { createReadStream, statSync, realpathSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(fileURLToPath(new URL('.', import.meta.url)));
const port = Number(process.env.PORT || 8000);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary' };
createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    let path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/game/index.html' : url.pathname));
    if (statSync(path).isDirectory()) path = resolve(path, 'index.html');
    path = realpathSync(path);
    if (!path.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    const stat = statSync(path);
    if (!stat.isFile()) throw new Error('Not a file');
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': 'no-store' });
    if (req.method === 'HEAD') res.end();
    else { const stream = createReadStream(path); stream.on('error', () => res.destroy()); stream.pipe(res); }
  } catch (_) { res.writeHead(404); res.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log('Sunfall: http://127.0.0.1:' + port + '/game/'));
