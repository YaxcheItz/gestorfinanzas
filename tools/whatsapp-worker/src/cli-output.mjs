/** Wrangler may prefix --json D1 responses with upload progress. */
export function parseCliJson(output) {
  for (const match of output.matchAll(/^[\[{]/gm)) {
    try { return JSON.parse(output.slice(match.index).trim()); } catch { /* Next complete document. */ }
  }
  throw new Error('Invalid CLI JSON output');
}
