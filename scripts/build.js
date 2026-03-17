const fs = require('fs').promises;
const path = require('path');
const terser = require('terser');
const zlib = require('zlib');

async function build() {
  const root = path.join(__dirname, '..');
  const srcPath = path.join(root, 'chameleon-select.js');
  const outPath = path.join(root, 'chameleon-select.min.js');
  const mapPath = outPath + '.map';

  const code = await fs.readFile(srcPath, 'utf8');
  const originalSize = Buffer.byteLength(code, 'utf8');

  const result = await terser.minify(code, {
    compress: { passes: 3, unsafe: true, dead_code: true },
    mangle: { toplevel: true },
    format: { comments: false },
    sourceMap: {
      filename: path.basename(outPath),
      url: path.basename(mapPath)
    }
  });

  // Terser serializes the CSS template literal as a JS string with \n \t escape
  // sequences (literal backslash-n, not real newlines). We locate the string by
  // the unique DOM id anchor, then strip and compress whitespace within it.
  const output = result.code.replace(
    /(chameleon-select-styles.*?\.textContent=")((?:\\n|\\t|[^"])*)(")/,
    (_, pre, css, close) => {
      const minified = css
        .replace(/\\n/g, '')      // remove \n escape sequences
        .replace(/\\t/g, '')      // remove \t escape sequences
        .replace(/ {2,}/g, ' ')   // collapse multiple spaces
        .replace(/ *([{}:;,]) */g, '$1') // remove spaces around CSS syntax
        .trim();
      return pre + minified + close;
    }
  );

  if (output === result.code) {
    console.warn('⚠️  Warning: CSS minification regex did not match.');
  }

  await fs.writeFile(outPath, output + '\n', 'utf8');
  await fs.writeFile(mapPath, result.map, 'utf8');

  const minifiedSize = Buffer.byteLength(output, 'utf8');
  const gzippedSize = zlib.gzipSync(output).length;

  console.log(`\n✅ Build Complete`);
  console.log(`Original:  ${format(originalSize)}`);
  console.log(`Minified:  ${format(minifiedSize)}`);
  console.log(`Gzipped:   ${format(gzippedSize)}`);
}

function format(n) {
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(2)} KB`;
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
