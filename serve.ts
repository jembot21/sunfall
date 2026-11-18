// Local playtest server for game/: `node serve.ts [--port N]`.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const arg = process.argv.indexOf('--port');
const port = arg >= 0 ? Number(process.argv[arg + 1]) : 8080;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json; charset=utf-8' };
const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const target = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (target !== root && !target.startsWith(root + sep)) throw new Error('outside root');
    const info = await stat(target);
    if (!info.isFile()) throw new Error('not a file');
    res.writeHead(200, { 'Content-Type': mime[extname(target).toLowerCase()] ?? 'application/octet-stream' });
    res.end(await readFile(target));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
});
server.listen(port, '127.0.0.1', () => {
  const address = server.address();
  if (address && typeof address !== 'string') console.log(`Sunfall is ready — play at http://127.0.0.1:${address.port}`);
});
