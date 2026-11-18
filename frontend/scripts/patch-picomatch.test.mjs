import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdtempSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { verifyPatchedPicomatch } from './patch-picomatch.mjs';

const require = createRequire(import.meta.url);
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const copies = Object.entries(lock.packages).filter(([path]) => path.endsWith('/picomatch'));

assert.ok(copies.length > 0, 'El lockfile debe contener picomatch mientras se aplique el parche.');
for (const [path, { version }] of copies) {
  const matcher = require(`../${path}`);
  test(`${path}@${version} no compila una repetición exterior para una rama con comodín simple`, () => {
    for (const pattern of ['+(*)', '+(*.ts)']) {
      const compiled = matcher.makeRe(pattern, { windows: false });
      assert.doesNotMatch(compiled.source, /\)\+/);
      assert.equal(compiled.test('componente.ts'), true);
    }
    assert.equal(matcher.isMatch('componente.html', '+(*.ts)'), false);
  });
  test(`${path}@${version} conserva globs y comprueba el modo de captura`, () => {
    assert.equal(matcher.isMatch('src/ui/main.ts', 'src/**/*.{ts,html}'), true);
    assert.equal(matcher.isMatch('src/main.png', 'src/**/!(*.png)'), false);
    assert.equal(matcher.isMatch('report.csv', '@(report|export).csv'), true);
    assert.equal(matcher.isMatch('ba-example', '+(a*|b)'), true);
    assert.doesNotMatch(matcher.makeRe('+(*.ts)', { capture: true }).source, /\)\+/);
  });
  test(`${path}@${version} termina patrones adversarios dentro del límite`, () => {
    const source = `
      const assert = require('node:assert/strict');
      const pm = require(process.argv[1]);
      const patterns = ['+(*)', '+(*a)', '*(*a)', '+(a*b)', '+(*?a)', '+(*[ab])',
        '+(*a|*b)', '+(a|*a)', '+(@(*a))', '+(!(a))', '+(!(*a))', '+(*(ab)c)', '+((*a))'];
      const options = [{}, {capture:true}, {nocase:true}, {bash:true}, {dot:true},
        {windows:true}, {windows:false}, {nobracket:true}];
      for (const opts of options) for (const pattern of patterns) {
        for (const value of ['a'.repeat(32)+'/', 'ab'.repeat(32)+'/', 'a'.repeat(32)+'!']) {
          const matches = pm.isMatch(value, pattern, opts);
          assert.equal(typeof matches, 'boolean');
          if (value.endsWith('/') && !opts.bash) {
            assert.equal(matches, false, JSON.stringify({pattern,opts,value}));
          }
        }
      }
    `;
    const directory = fileURLToPath(new URL(`../${path}`, import.meta.url));
    const child = spawnSync(process.execPath, ['-e', source, directory], {
      timeout: 3000, encoding: 'utf8', windowsHide: true,
    });
    assert.equal(child.error, undefined, child.error?.message);
    assert.equal(child.status, 0, child.stderr);
  });
}

test('verifica todas las copias y rechaza contenido alterado, copias ausentes y versiones desconocidas', () => {
  assert.equal(verifyPatchedPicomatch(), copies.length);
  const temporary = mkdtempSync(join(tmpdir(), 'kaptal-picomatch-'));
  try {
    const metadata = copies.find(([, data]) => data.version === '4.0.4')[1];
    const directory = join(temporary, 'node_modules/picomatch');
    cpSync(fileURLToPath(new URL('../node_modules/picomatch', import.meta.url)), directory, {recursive:true});
    const fixture = version => writeFileSync(join(temporary, 'package-lock.json'),
      JSON.stringify({packages:{'node_modules/picomatch':{...metadata,version}}}));
    const frontend = pathToFileURL(temporary + '/');
    fixture('4.0.4');
    assert.equal(verifyPatchedPicomatch(frontend), 1);
    fixture('4.0.7');
    assert.throws(() => verifyPatchedPicomatch(frontend), /Revisa el parche/);
    fixture('4.0.4');
    for (const file of ['lib/parse.js', 'lib/picomatch.js', 'index.js']) {
      const target = join(directory, file);
      const original = readFileSync(target);
      writeFileSync(target, Buffer.concat([original, Buffer.from('\n// altered')]));
      assert.throws(() => verifyPatchedPicomatch(frontend), /sin parche verificado/);
      writeFileSync(target, original);
    }
    rmSync(join(directory, 'lib/parse.js'));
    assert.throws(() => verifyPatchedPicomatch(frontend));
  } finally {
    assert.equal(dirname(temporary), tmpdir());
    assert.ok(basename(temporary).startsWith('kaptal-picomatch-'));
    rmSync(temporary, {recursive:true,force:true});
  }
});
