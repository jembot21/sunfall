/**
 * Sunfall — Static Playtesting Server
 * Lightweight local development server serving game/ static assets.
 */

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameDir = resolve(fileURLToPath(new URL('.', import.meta.url)), 'game');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
};

// Parse command line port arguments (--port 8080 or --port=8080)
function getPort(): number {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--port' && i + 1 < args.length) {
      const p = parseInt(args[i + 1]!, 10);
      if (!Number.isNaN(p) && p > 0 && p < 65536) return p;
    }
    if (arg.startsWith('--port=')) {
      const p = parseInt(arg.slice(7), 10);
      if (!Number.isNaN(p) && p > 0 && p < 65536) return p;
    }
  }
  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : NaN;
  return !Number.isNaN(envPort) && envPort > 0 ? envPort : 8080;
}

const port = getPort();

const server = createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  const reqUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  let pathname = decodeURIComponent(reqUrl.pathname);
  if (pathname.endsWith('/')) {
    pathname += 'index.html';
  }

  const targetPath = resolve(gameDir, '.' + pathname);

  // Security check: strictly refuse paths climbing outside game/
  if (!targetPath.startsWith(gameDir) || targetPath.includes('\0')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  if (!existsSync(targetPath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  const stat = statSync(targetPath);
  let filePath = targetPath;
  if (stat.isDirectory()) {
    filePath = join(targetPath, 'index.html');
    if (!existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
  }

  const fileStat = statSync(filePath);
  const ext = extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': fileStat.size,
    'Cache-Control': 'no-store',
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  createReadStream(filePath).pipe(res);
});

server.listen(port, () => {
  console.log(`Sunfall server listening on http://localhost:${port} (root: ${gameDir})`);
});
