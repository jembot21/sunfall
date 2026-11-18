/**
 * Sunfall — Smoke Test Suite (Node.js)
 *
 * Verifies build integrity and offline compliance:
 * 1. Asserts every file referenced by game/index.html script tags exists.
 * 2. Parses each game/src/*.js file with vm.Script to catch any syntax errors.
 * 3. Asserts offline compliance: no game file contains "http://" or "https://".
 * 4. Asserts shots.json lists exactly 4 shot configurations.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let failures = 0;

function pass(msg) {
  console.log('PASS: ' + msg);
}

function fail(msg) {
  console.error('FAIL: ' + msg);
  failures++;
}

const rootDir = path.resolve(__dirname, '..');
const gameDir = path.join(rootDir, 'game');
const indexHtmlPath = path.join(gameDir, 'index.html');
const shotsJsonPath = path.join(rootDir, 'shots.json');

// --- Test 1: Check all index.html script tag references exist ---
try {
  if (!fs.existsSync(indexHtmlPath)) {
    fail('game/index.html does not exist');
  } else {
    const html = fs.readFileSync(indexHtmlPath, 'utf8');
    const hud = fs.readFileSync(path.join(gameDir, 'src/hud.js'), 'utf8');
    const mapId = hud.match(/var minimapCanvas = document\.getElementById\(['"]([^'"]+)['"]\)/);
    const canvasIds = [...html.matchAll(/<canvas\b[^>]*\bid=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
    if (mapId && canvasIds.includes(mapId[1])) {
      pass('Minimap canvas matches the HUD binding: ' + mapId[1]);
    } else {
      fail('Minimap canvas missing or mismatched with hud.js');
    }
    const scriptRegex = /<script\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
    let match;
    const scriptSrcs = [];

    while ((match = scriptRegex.exec(html)) !== null) {
      scriptSrcs.push(match[1]);
    }

    if (scriptSrcs.length === 0) {
      fail('No script tags found in game/index.html');
    } else {
      let allExist = true;
      for (const src of scriptSrcs) {
        const resolvedPath = path.resolve(gameDir, src);
        if (!fs.existsSync(resolvedPath)) {
          fail('Script file not found: ' + src + ' (resolved: ' + resolvedPath + ')');
          allExist = false;
        }
      }
      if (allExist) {
        pass('All ' + scriptSrcs.length + ' script tags in game/index.html resolve to existing files');
      }
    }
  }
} catch (e) {
  fail('Error checking script references: ' + e.message);
}

// --- Test 2: Parse each game/src/*.js for syntax errors ---
try {
  const srcDir = path.join(gameDir, 'src');
  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.js'));

  if (files.length === 0) {
    fail('No JavaScript files found in game/src');
  } else {
    let allValid = true;
    for (const file of files) {
      const filePath = path.join(srcDir, file);
      const code = fs.readFileSync(filePath, 'utf8');
      try {
        new vm.Script(code, { filename: file });
      } catch (err) {
        fail('Syntax error in ' + file + ': ' + err.message);
        allValid = false;
      }
    }
    if (allValid) {
      pass('All ' + files.length + ' files in game/src/*.js parsed cleanly without syntax errors');
    }
  }
} catch (e) {
  fail('Error validating game/src syntax: ' + e.message);
}

// --- Test 3: Offline compliance (no http:// or https:// in game source files) ---
try {
  const srcDir = path.join(gameDir, 'src');
  const srcFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.js')).map(f => path.join(srcDir, f));
  const checkFiles = [indexHtmlPath, ...srcFiles];

  let offlineClean = true;
  for (const file of checkFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const relPath = path.relative(rootDir, file);
    if (content.includes('http://') || content.includes('https://')) {
      fail('Offline rule violated: ' + relPath + ' contains http:// or https://');
      offlineClean = false;
    }
  }

  if (offlineClean) {
    pass('Offline compliance verified: No game files contain "http://" or "https://"');
  }
} catch (e) {
  fail('Error checking offline compliance: ' + e.message);
}

// --- Test 4: shots.json lists exactly 4 shot configurations ---
try {
  if (!fs.existsSync(shotsJsonPath)) {
    fail('shots.json does not exist');
  } else {
    const raw = fs.readFileSync(shotsJsonPath, 'utf8');
    const shots = JSON.parse(raw);

    if (!Array.isArray(shots)) {
      fail('shots.json is not an array');
    } else if (shots.length !== 4) {
      fail('shots.json must contain exactly 4 shots, found ' + shots.length);
    } else {
      let validShots = true;
      for (let i = 0; i < shots.length; i++) {
        const s = shots[i];
        if (!s.name || !s.query) {
          fail('Shot at index ' + i + ' missing name or query');
          validShots = false;
        }
      }
      if (validShots) {
        pass('shots.json contains 4 valid shot definitions');
      }
    }
  }
} catch (e) {
  fail('Error validating shots.json: ' + e.message);
}

// --- Summary & Exit ---
if (failures > 0) {
  console.error('\nSMOKE TESTS FAILED (' + failures + ' failures)');
  process.exit(1);
} else {
  console.log('\nALL SMOKE TESTS PASSED');
  process.exit(0);
}
