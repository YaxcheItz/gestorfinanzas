import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { resolve, relative, dirname, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

/** Measures generated public JS/CSS only; never fetches URLs or reads application data. */
export async function measureBuild(directory) {
  const root = resolve(directory), initial = new Set(), external = new Set(), cache = new Map();
  const local = (reference, importer = 'index.html') => {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(reference)) { external.add(reference); return null; }
    const clean = decodeURIComponent(reference.split(/[?#]/)[0]);
    const file = resolve(clean.startsWith('/') ? root : dirname(resolve(root, importer)), clean.replace(/^\/+/, ''));
    const path = relative(root, file);
    if (path === '..' || path.startsWith('..' + sep) || isAbsolute(path)) throw new Error('Asset outside build directory');
    return path.split(sep).join('/');
  };
  const size = async path => {
    if (!cache.has(path)) {
      const bytes = await readFile(resolve(root, path));
      cache.set(path, { path, rawBytes: bytes.length, gzipBytes: gzipSync(bytes, { level: 9 }).length,
        brotliBytes: brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
        sha256: createHash('sha256').update(bytes).digest('hex') });
    }
    return cache.get(path);
  };
  const visit = async path => {
    if (!path || initial.has(path)) return;
    initial.add(path); await size(path);
    if (!path.endsWith('.js')) return;
    const source = ts.createSourceFile(path, await readFile(resolve(root, path), 'utf8'), ts.ScriptTarget.Latest, false, ts.ScriptKind.JS);
    for (const statement of source.statements) {
      if ((ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement))
        && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
        const imported = statement.moduleSpecifier.text;
        if (imported.startsWith('.') || imported.startsWith('/')) await visit(local(imported, path));
        else external.add(imported);
      }
    }
  };
  const html = await readFile(resolve(root, 'index.html'), 'utf8');
  const inlineJavaScriptBytes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(match => !/\bsrc\s*=/i.test(match[1])).reduce((n, match) => n + Buffer.byteLength(match[2]), 0);
  const inlineCssBytes = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .reduce((n, match) => n + Buffer.byteLength(match[1]), 0);
  for (const [tag] of html.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    const attribute = name => tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1];
    const script = /^<script\b/i.test(tag);
    if (script || ['stylesheet', 'modulepreload'].includes(attribute('rel')?.toLowerCase())) {
      const reference = attribute(script ? 'src' : 'href');
      if (reference) await visit(local(reference));
    }
  }
  if (!initial.size) throw new Error('No local initial assets found');
  const walk = async parent => {
    const result = [];
    for (const entry of await readdir(resolve(root, parent), { withFileTypes: true })) {
      const path = parent ? `${parent}/${entry.name}` : entry.name;
      if (entry.isDirectory()) result.push(...await walk(path));
      else if (entry.isFile() && entry.name.endsWith('.js')) result.push(await size(path));
    }
    return result;
  };
  const allJavaScript = await walk('');
  const initialFiles = await Promise.all([...initial].sort().map(size));
  const total = files => ({ count: files.length, rawBytes: files.reduce((n, f) => n + f.rawBytes, 0),
    gzipBytes: files.reduce((n, f) => n + f.gzipBytes, 0), brotliBytes: files.reduce((n, f) => n + f.brotliBytes, 0) });
  return { format: 1, node: process.version, compression: { gzipLevel: 9, brotliQuality: 11 },
    initial: initialFiles, inlineJavaScriptBytes, inlineCssBytes, initialJavaScript: total(initialFiles.filter(f => f.path.endsWith('.js'))),
    initialCss: total(initialFiles.filter(f => f.path.endsWith('.css'))), allJavaScript: total(allJavaScript),
    largestJavaScript: allJavaScript.sort((a, b) => b.rawBytes - a.rawBytes).slice(0, 5), externalAssetCount: external.size };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await measureBuild(process.argv[2] ?? 'dist/frontend/browser'), null, 2)); }
  catch { console.error('Build measurement failed: verify the generated index and local assets.'); process.exitCode = 1; }
}
