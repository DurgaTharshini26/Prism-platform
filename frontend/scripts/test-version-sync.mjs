import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const frontend = join(here, '..');
const repo = join(frontend, '..');

const pkgVersion = JSON.parse(readFileSync(join(frontend, 'package.json'), 'utf8')).version;

const config = readFileSync(join(repo, 'config.py'), 'utf8');
const match = config.match(/^PRISM_VERSION\s*=\s*["']([^"']+)["']/m);
if (!match) {
  console.error('could not find PRISM_VERSION in config.py');
  process.exit(1);
}
const pyVersion = match[1];

const failures = [];
if (pkgVersion !== pyVersion) {
  failures.push(`package.json is ${pkgVersion} but config.py PRISM_VERSION is ${pyVersion}`);
}

const lock = JSON.parse(readFileSync(join(frontend, 'package-lock.json'), 'utf8'));
for (const [label, value] of [['package-lock.json', lock.version], ['package-lock root package', lock.packages?.['']?.version]]) {
  if (value !== undefined && value !== pkgVersion) {
    failures.push(`${label} is ${value} but package.json is ${pkgVersion}`);
  }
}

// The UI must read the version, never spell it out, or it drifts a release behind.
const sources = ['src/components/Topbar.tsx', 'src/components/LoadingScreen.tsx', 'src/app/layout.tsx'];
for (const file of sources) {
  const text = readFileSync(join(frontend, file), 'utf8');
  const hardcoded = text.match(/\d+\.\d+\.\d+/g);
  if (hardcoded) {
    failures.push(`${file} spells out a version (${[...new Set(hardcoded)].join(', ')}); import PRISM_VERSION instead`);
  }
}

if (failures.length) {
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log(`version sync tests passed (${pkgVersion})`);
