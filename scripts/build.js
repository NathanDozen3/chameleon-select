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
    compress: true,
    mangle: true,
    sourceMap: {
      filename: path.basename(outPath),
      url: path.basename(mapPath)
    }
  });

  if (result.error) throw result.error;

  // Remove escaped newlines/tabs and any actual newline/tab characters
  const cleaned = result.code
    .replace(/\\n/g, '')
    .replace(/\\t/g, '')
    .replace(/\n/g, '')
    .replace(/\t/g, '')
    .replace(/\r/g, '');

  const finalCode = cleaned + '\n//# sourceMappingURL=' + path.basename(mapPath) + '\n';
  await fs.writeFile(outPath, finalCode, 'utf8');

  if (result.map) {
    await fs.writeFile(mapPath, result.map, 'utf8');
    console.log('Warning: source map written but may be inaccurate after post-processing.');
  }

  const minifiedSize = Buffer.byteLength(finalCode, 'utf8');
  const gzippedSize = zlib.gzipSync(finalCode).length;

  console.log(`Wrote ${path.relative(process.cwd(), outPath)} and ${path.relative(process.cwd(), mapPath)}`);
  console.log(`Original: ${format(originalSize)} → Minified: ${format(minifiedSize)} (gzipped: ${format(gzippedSize)})`);
}

function format(n) {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(2)} KB`;
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
