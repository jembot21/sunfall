/**
 * Sunfall — Open-World Crime Action in Solano Bay
 * Entry builder for make.fun bounty (gta6-01).
 *
 * Copies the game and screenshot assets into the destination output directory,
 * generates the make.fun verification dossier, and reports summary stats.
 */

import { cpSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

mkdirSync(outDir, { recursive: true });

// Copy game/ and screenshots/ recursively into output directory
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

// Generate dossier against standard make.fun caps
const dossierBytes = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});

writeFileSync(join(outDir, 'dossier.json'), dossierBytes);

// Count output files for verification summary
function countFiles(dir: string): number {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile()) count++;
  }
  return count;
}

const fileCount = countFiles(outDir);
console.log(`Sunfall built: ${fileCount} files, ${dossierBytes.byteLength} dossier bytes; output directory: ${outDir}`);
