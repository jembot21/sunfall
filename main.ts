// Sunfall v2 bundle entry. Node 22+; only the dossier builder is vendored.
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const project = dirname(fileURLToPath(import.meta.url));
const output = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
const gameSource = join(project, 'game');
if (output === project || output === gameSource || output.startsWith(gameSource + sep)) {
  throw new Error('Choose an output directory outside the game source.');
}
mkdirSync(output, { recursive: true });
for (const folder of ['game', 'screenshots']) {
  cpSync(join(project, folder), join(output, folder), { recursive: true, force: true });
}
const dossier = buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648
});
writeFileSync(join(output, 'dossier.json'), dossier);
console.log('Sunfall v2 packaged at ' + output + ' (' + dossier.byteLength + ' byte dossier)');
