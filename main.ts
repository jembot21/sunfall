// Node 22 packaging entry: copy this repository's static game and screenshots,
// then write the kit's canonical dossier over the copied tree (no build step).
import { cpSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, isAbsolute, sep } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const root = dirname(fileURLToPath(import.meta.url));
const output = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
function inside(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel));
}
for (const name of ['game', 'screenshots']) {
  const source = resolve(root, name), target = resolve(output, name);
  if (inside(source, target) || inside(target, source)) {
    throw new Error('Output must not overlap the source game or screenshots trees.');
  }
}
mkdirSync(output, { recursive: true });
cpSync(resolve(root, 'game'), resolve(output, 'game'), { recursive: true });
cpSync(resolve(root, 'screenshots'), resolve(output, 'screenshots'), { recursive: true });
const dossier = buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(resolve(output, 'dossier.json'), dossier);
function countFiles(dir: string): number {
  const sortedEntries = readdirSync(dir, { withFileTypes: true }).sort((a: {name: string}, b: {name: string}) => a.name.localeCompare(b.name));
  return sortedEntries.reduce((count: number, item: {isDirectory(): boolean; name: string; isFile(): boolean}) =>
    count + (item.isDirectory() ? countFiles(resolve(dir, item.name)) : Number(item.isFile())), 0);
}
const screenshots = countFiles(resolve(output, 'screenshots'));
const files = countFiles(resolve(output, 'game')) + screenshots;
console.log(`Copied ${files} files to ${output}, including ${screenshots} screenshots; dossier.json ${dossier.byteLength} bytes.`);
