import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Backport of jscraik's micromatch/picomatch#262 and #263 (MIT, see patch-picomatch.LICENSE).
// Remove this when compatible fixed releases are available for both lines.
const hashes = {
  '2.3.2': [
    '3a91656f440069aa8f8e15c9d695b9f6b2209df1eab2be8127c72cbcca45ff5f',
    'd53be6a51e414088a46ee841f60d0b770f22bd7ac7ba185dd11476054eada716',
  ],
  '4.0.4': [
    'ce57c04e04994b83e2ca566170fa192e6fe19d710bea6da00ce2f76d01c0dea4',
    'a18e5ae077f2e9d1c1096f708c8113f662a40b1e94b6280316dbd482707e0eee',
  ],
};

const analyzeWildcard = String.raw`  if (hasWildcard) {
    if (!options.capture && branches.length === 1 &&
        /^[A-Za-z0-9 ._-]*\*[A-Za-z0-9 ._-]*$/.test(branches[0])) {
      return { risky: false, collapse: true };
    }

    if (!options.capture && branches.length === 1 && body === branches[0]) {
      const match = /^([A-Za-z0-9_-]+)\*([A-Za-z0-9 ,_-]+)\*$/.exec(body);
      if (match) {
        return { risky: true, twoStars: { prefix: match[1], middle: match[2] } };
      }
    }

    // With disjoint first characters, the prefix-star branch absorbs all later branches.
    if (!options.capture && body === branches.join('|')) {
      const wildcards = branches.filter(branch => /^[A-Za-z0-9_-]+\*$/.test(branch));
      const literals = branches.filter(branch => /^[A-Za-z0-9_-]$/.test(branch));
      if (wildcards.length === 1 && literals.length === branches.length - 1 && literals.length > 0) {
        const prefix = wildcards[0].slice(0, -1);
        const nocase = String(options.flags || (options.nocase ? 'i' : '')).includes('i');
        const first = nocase ? prefix[0].toLowerCase() : prefix[0];
        if (!literals.some(value => (nocase ? value.toLowerCase() : value) === first)) {
          return { risky: true, trailingStar: { prefix, literals: [...new Set(literals)].join('') } };
        }
      }
    }

    return { risky: true };
  }

`;

// Negated extglobs emit an implicit wildcard even when their body has no star token.
const closeExtglob = [
  "    const repeated = token.type === 'plus' || token.type === 'star';",
  '    // Use the parsed tokens to respect escapes, quotes and bracket options.',
  '    const hasWildcard = repeated && tokens.slice(token.tokensIndex + 2).some((item, index, bodyTokens) => {',
  '      const next = bodyTokens[index + 1];',
  "      const opensExtglob = next?.type === 'paren' && next.value === '(' && next.extglob === true;",
  "      return item.type === 'negate' || ((item.type === 'star' || item.type === 'globstar') && item.value !== '' && !opensExtglob);",
  '    });',
  '    const analysis = analyzeRepeatedExtglob(body, opts, hasWildcard);',
  '',
  '    if (analysis.twoStars) {',
  '      const prefix = utils.escapeRegex(analysis.twoStars.prefix);',
  '      const middle = utils.escapeRegex(analysis.twoStars.middle);',
  "      const unit = opts.bash === true ? '.' : QMARK;",
  "      const tail = opts.bash === true ? '.*?' : STAR;",
  '      const output = `${prefix}(?:(?!${middle})${unit})*${middle}${tail}`;',
  "      analysis.safeOutput = token.type === 'star' ? `(?:${output})?` : output;",
  '    }',
  '',
  '    if (analysis.trailingStar) {',
  '      const head = `[${utils.escapeRegex(analysis.trailingStar.literals)}]`;',
  "      const tail = utils.escapeRegex(analysis.trailingStar.prefix) + (opts.bash === true ? '.*?' : STAR);",
  "      analysis.safeOutput = token.type === 'star' ? `${head}*(?:${tail})?` : `(?:${head}*${tail}|${head}+)`;",
  '    }',
  '',
  '    if (analysis.collapse) {',
  "      token.close = token.type === 'plus' ? ')' : ')?';",
  '    }',
].join('\n');

export function backport(source) {
  return source
    .replace('const analyzeRepeatedExtglob = (body, options) => {',
      'const analyzeRepeatedExtglob = (body, options, hasWildcard) => {')
    .replace('  return { risky: false };\n};\n\n/**\n * Parse the given input string.',
      match => analyzeWildcard + match)
    .replace('    const analysis = analyzeRepeatedExtglob(body, opts);', () => closeExtglob);
}

const sha256 = value => createHash('sha256').update(value).digest('hex');

function installedParsers(frontend) {
  const lock = JSON.parse(readFileSync(new URL('package-lock.json', frontend), 'utf8'));
  const copies = Object.entries(lock.packages)
    .filter(([path]) => /^(?:node_modules\/(?:@[\w.-]+\/)?[\w.-]+\/)*node_modules\/picomatch$/.test(path));

  if (copies.length === 0) {
    throw new Error('Retira el parche: picomatch ya no figura en el lockfile.');
  }
  return copies.map(([path, metadata]) => {
    if (!metadata.dev || !Object.hasOwn(hashes, metadata.version)) {
      throw new Error(`Revisa el parche de picomatch para ${path}@${metadata.version}.`);
    }
    return { directory: new URL(`${path}/`, frontend),
      parser: new URL(`${path}/lib/parse.js`, frontend), version: metadata.version };
  });
}

export function verifyPatchedPicomatch(frontend = new URL('../', import.meta.url)) {
  const targets = installedParsers(frontend);
  const runtimeHashes = JSON.parse(readFileSync(new URL('picomatch-runtime-hashes.json', import.meta.url), 'utf8'));
  for (const { directory, version } of targets) {
    const expected = { ...runtimeHashes[version], 'lib/parse.js': hashes[version][1] };
    for (const [file, expectedHash] of Object.entries(expected)) {
      if (sha256(readFileSync(new URL(file, directory))) !== expectedHash) {
        throw new Error(`Picomatch ${version} sin parche verificado o con archivos alterados: ${file}.`);
      }
    }
  }
  return targets.length;
}

function apply() {
  const frontend = new URL('../', import.meta.url);
  const targets = installedParsers(frontend);
  if (process.env.NODE_ENV === 'production' && targets.every(({ parser }) => !existsSync(parser))) {
    console.log('Parche picomatch: instalación sin dependencias de desarrollo.');
    return;
  }
  const updates = targets.flatMap(({ parser, version }) => {
    const source = readFileSync(parser, 'utf8');
    const [original, patched] = hashes[version];
    const current = sha256(source);
    if (current === patched) return [];
    if (current !== original) {
      throw new Error(`Parser picomatch inesperado: ${parser.pathname}.`);
    }
    const next = backport(source);
    if (sha256(next) !== patched) {
      throw new Error(`El parche de picomatch ${version} no coincide con el hash esperado.`);
    }
    return [{ parser, next }];
  });

  for (const { parser, next } of updates) writeFileSync(parser, next, 'utf8');
  console.log(`Parche picomatch verificado en ${targets.length} copias de desarrollo.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) apply();
