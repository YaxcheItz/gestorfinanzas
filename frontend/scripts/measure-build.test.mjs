import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { measureBuild } from './measure-build.mjs';

async function fixture(t, files) {
  const directory = await mkdtemp(join(tmpdir(), 'kaptal-build-measure-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await Promise.all(Object.entries(files).map(([name, text]) => writeFile(join(directory, name), text)));
  return directory;
}

test('counts static imports and preload once, excluding dynamic modules from initial bytes', async t => {
  const directory = await fixture(t, {
    'index.html': '<link rel="stylesheet" href="style.css"><link rel="modulepreload" href="shared.js"><script src="main.js" type="module"></script><script src="startup.js"></script>',
    'main.js': 'import { value } from "./shared.js"; export const load = () => import("./lazy.js");',
    'shared.js': 'export * from "./main.js"; export const value = 1;',
    'lazy.js': 'export const lazy = "not initial";',
    'startup.js': 'window.ready = true;',
    'style.css': 'body { margin: 0; }',
  });
  const report = await measureBuild(directory);
  assert.deepEqual(report.initial.map(f => f.path), ['main.js', 'shared.js', 'startup.js', 'style.css']);
  assert.equal(report.allJavaScript.count, 4);
  assert.equal(report.initialJavaScript.count, 3);
  assert.equal(report.initialJavaScript.rawBytes, report.initial.filter(f => f.path.endsWith('.js')).reduce((n, f) => n + f.rawBytes, 0));
  assert.ok(report.initialJavaScript.gzipBytes > 0);
  assert.ok(report.initial.every(f => /^[a-f0-9]{64}$/.test(f.sha256)));
});

test('rejects a missing local asset instead of reporting a healthy empty build', async t => {
  const directory = await fixture(t, { 'index.html': '<script src="missing.js"></script>' });
  await assert.rejects(measureBuild(directory));
});

test('rejects references outside the build directory', async t => {
  const directory = await fixture(t, { 'index.html': '<script src="../outside.js"></script>' });
  await assert.rejects(measureBuild(directory), /outside/);
});

test('reports unmeasured external assets without making network requests', async t => {
  const directory = await fixture(t, {
    'index.html': '<script src="https://example.test/remote.js"></script><script src="main.js"></script>',
    'main.js': 'export const ready = true;',
  });
  const report = await measureBuild(directory);
  assert.equal(report.externalAssetCount, 1);
  assert.equal(report.initialJavaScript.count, 1);
});

test('measures inline bootstrap bytes separately without executing them', async t => {
  const directory = await fixture(t, {
    'index.html': '<script>throw new Error("not executed");</script><style>body{color:red}</style><script src="main.js"></script>',
    'main.js': 'export const ready = true;',
  });
  const report = await measureBuild(directory);
  assert.equal(report.inlineJavaScriptBytes, Buffer.byteLength('throw new Error("not executed");'));
  assert.equal(report.inlineCssBytes, Buffer.byteLength('body{color:red}'));
});
