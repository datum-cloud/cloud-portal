#!/usr/bin/env node
/**
 * Precompress Client Assets
 *
 * Writes a `.br` and a `.gz` copy next to every compressible file in the
 * client build, for Hono's `serveStatic({ precompressed: true })` to serve.
 *
 * Envoy compresses on every request at a low brotli quality, and its default
 * content-type list leaves out fonts, so the TTF fonts went out uncompressed.
 * Compressing once at build time covers fonts too and uses maximum quality.
 * Envoy leaves a response alone when it already has a Content-Encoding.
 *
 * Usage: node scripts/precompress-assets.ts [dir]   (default build/client/assets)
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const ASSETS_DIR = process.argv[2] ?? 'build/client/assets';

// Types Hono's serveStatic treats as compressible. woff2 and images are
// already compressed.
const EXTENSIONS = new Set(['.js', '.css', '.ttf', '.otf', '.svg', '.json', '.txt']);

// Below this, headers outweigh any saving.
const MIN_BYTES = 1024;

async function main() {
  const files = (await readdir(ASSETS_DIR)).filter((f) => EXTENSIONS.has(extname(f)));
  let before = 0;
  let after = 0;
  let written = 0;

  for (const file of files) {
    const path = join(ASSETS_DIR, file);
    const content = await readFile(path);
    if (content.length < MIN_BYTES) continue;

    const br = brotliCompressSync(content, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
        [constants.BROTLI_PARAM_SIZE_HINT]: content.length,
      },
    });
    // A file that doesn't shrink is served as is.
    if (br.length >= content.length) continue;

    await writeFile(`${path}.br`, br);
    await writeFile(`${path}.gz`, gzipSync(content, { level: 9 }));
    before += content.length;
    after += br.length;
    written++;
  }

  const kb = (n: number) => `${Math.round(n / 1024)} KB`;
  console.log(`Precompressed ${written} assets: ${kb(before)} -> ${kb(after)} brotli`);
}

main().catch((error) => {
  console.error('Precompressing assets failed:', error);
  process.exit(1);
});
