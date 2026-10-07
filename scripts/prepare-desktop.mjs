import { cp, mkdir, rm, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const stage = path.resolve(root, 'desktop-stage');
if (!stage.startsWith(root + path.sep)) throw new Error('Desktop stage must be inside the repository.');
try {
  const existing = await realpath(stage);
  if (!existing.startsWith(root + path.sep)) throw new Error('Desktop stage resolves outside the repository.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await rm(stage, { recursive: true, force: true });

await mkdir('.next/standalone/.next', { recursive: true });
await cp('.next/static', '.next/standalone/.next/static', { recursive: true, force: true });
await cp('public', '.next/standalone/public', { recursive: true, force: true });
await mkdir(path.join(stage, 'node_modules', '@electric-sql'), { recursive: true });
await mkdir(path.join(stage, 'lib', 'db'), { recursive: true });
await cp('desktop', path.join(stage, 'desktop'), { recursive: true });
await cp('lib/db/migrations', path.join(stage, 'lib', 'db', 'migrations'), { recursive: true });
await cp('.next/standalone', path.join(stage, '.next', 'standalone'), { recursive: true });
const manifest = require('../package.json');
const runtimePackages = [
  '@electric-sql/pglite',
  '@electric-sql/pglite-socket',
  'drizzle-orm',
  'next',
  'react',
  'react-dom',
  '@swc/helpers',
  'baseline-browser-mapping',
  'caniuse-lite',
  'styled-jsx',
  'nanoid',
  'picocolors',
  'source-map-js',
];
const runtimeDependencies = Object.fromEntries(runtimePackages.map((name) => [
  name,
  require(path.join(root, 'node_modules', name, 'package.json')).version,
]));
for (const name of runtimePackages) {
  await cp(path.join(root, 'node_modules', name), path.join(stage, 'node_modules', name), { recursive: true });
}
await writeFile(path.join(stage, 'package.json'), JSON.stringify({
  name: manifest.name,
  version: manifest.version,
  main: 'desktop/main.cjs',
  dependencies: runtimeDependencies,
}, null, 2));
console.log('Desktop package stage prepared.');
