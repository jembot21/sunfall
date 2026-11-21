import { cp, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const repo = dirname(fileURLToPath(import.meta.url));
const output = process.env.MAKEFUN_OUTPUT_DIR || '/output';
await mkdir(output, { recursive: true });
await cp(join(repo, 'game'), join(output, 'game'), { recursive: true, force: true });
await cp(join(repo, 'screenshots'), join(output, 'screenshots'), { recursive: true, force: true });
const dossier = buildDossier(output, {
  text_max_bytes: 3 * 1024 * 1024,
  screenshots: { max: 4, max_bytes: 250 * 1024 }
});
await writeFile(join(output, 'dossier.json'), dossier);
