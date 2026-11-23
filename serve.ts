// Node 22 standard library only. Run from any directory with: node serve.ts
import { createReadStream, realpathSync } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(fileURLToPath(new URL('./game/', import.meta.url)));
const port = 8080;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
};

const withinRoot = (file) => file === root || file.startsWith(root + sep);
const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed');
    return;
  }

  let pathname;
  try {
    // Inspect the raw path so URL normalization cannot hide traversal attempts.
    pathname = decodeURIComponent((request.url ?? '/').split('?')[0]);
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }
  if (!pathname.startsWith('/') || pathname.includes('\0')) {
    response.writeHead(400).end('Bad request');
    return;
  }
  if (pathname.includes('\\')) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const candidate = resolve(root, '.' + pathname);
  if (!withinRoot(candidate)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  let file;
  let info;
  try {
    // Check physical paths too, so symlinks cannot expose files outside game/.
    file = await realpath(candidate);
    if (!withinRoot(file)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    info = await stat(file);
    if (!info.isFile()) {
      response.writeHead(404).end('Not found');
      return;
    }
  } catch {
    response.writeHead(404).end('Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': info.size,
    'Cache-Control': 'no-store',
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  const stream = createReadStream(file);
  stream.on('error', () => response.destroy());
  response.on('close', () => stream.destroy());
  stream.pipe(response);
});

server.on('error', (error) => {
  console.error('Sunfall server: ' + error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log('Sunfall is on http://localhost:' + port);
});
