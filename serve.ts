import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = await realpath(import.meta.dirname);
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'
};
const port = Number(process.argv[2] || process.env.PORT || 8000);
createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const path = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
    if (path === '/' || path === '/game') {
      res.writeHead(302, { Location: '/game/' + new URL(req.url || '/', 'http://localhost').search }).end();
      return;
    }
    const local = path.endsWith('/') ? path + 'index.html' : path;
    if (local.split('/').some(part => part.startsWith('.'))) throw new Error('Hidden path');
    const file = await realpath(resolve(root, '.' + local));
    if (!file.startsWith(root + sep)) throw new Error('Outside repository');
    const info = await stat(file);
    if (!info.isFile()) throw new Error('Not a file');
    res.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-store'
    });
    if (req.method === 'HEAD') res.end();
    else createReadStream(file).on('error', () => res.destroy()).pipe(res);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log('Sunfall at http://127.0.0.1:' + port + '/game/'));
