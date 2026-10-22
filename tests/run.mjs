// `npm test`: bundles the game logic from src (tests/logic-entry.ts) with esbuild, then runs every
// tests/*.test.mjs suite in its own Node process. Exits non-zero if any suite fails.
// Run one suite with `npm test -- v140`.
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [join(dir, 'logic-entry.ts')],
  outfile: join(dir, '.build', 'logic.mjs'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  logLevel: 'warning',
});

const filter = process.argv[2];
const suites = readdirSync(dir)
  .filter((file) => file.endsWith('.test.mjs') && (!filter || file.includes(filter)))
  .sort();

let failed = 0;
for (const suite of suites) {
  console.log(`\n▶ ${suite}`);
  const { status } = spawnSync(process.execPath, [join(dir, suite)], { stdio: 'inherit' });
  if (status !== 0) {
    failed += 1;
    console.log(`✖ ${suite} failed`);
  }
}

console.log(`\n${suites.length - failed}/${suites.length} suites passed`);
process.exit(failed > 0 ? 1 : 0);
