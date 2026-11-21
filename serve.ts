// Local static playtest server: node serve.ts --port 8080
import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), 'game');
const args = process.argv.slice(2);
const portAt = args.indexOf('--port');
const port = Number(portAt < 0 ? 8080 : args[portAt + 1]);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json; charset=utf-8' };
createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method ?? 'GET')) {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', 'Allow': 'GET, HEAD' });
      res.end('Method not allowed');
      return;
    }
    const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    const file = await realpath(resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname)));
    if (!file.startsWith(root + sep) || !(await stat(file)).isFile()) throw new Error('Outside game');
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': mime[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; connect-src 'none'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:"
    });
    if (req.method === 'HEAD') res.end(); else res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Sunfall: http://127.0.0.1:${port}`));
