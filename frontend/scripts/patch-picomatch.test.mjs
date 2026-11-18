import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

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
}
