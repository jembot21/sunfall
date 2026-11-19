// Sunfall packaging entry point: Node 22, standard library only.
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = dirname(fileURLToPath(import.meta.url));
const output = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
if (output === root || output === join(root, 'game') || output.startsWith(join(root, 'game') + '/')) throw new Error('Output overlaps game source');
mkdirSync(output, { recursive: true });
for (const folder of ['game', 'screenshots']) cpSync(join(root, folder), join(output, folder), { recursive: true });
const dossier = buildDossier(output, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, game_max_files: 993, game_max_bytes: 50331648 });
writeFileSync(join(output, 'dossier.json'), dossier);
console.log(`Sunfall packaged in ${output}; dossier ${dossier.byteLength} bytes`);
