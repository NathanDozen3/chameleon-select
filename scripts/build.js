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

  const processed = code.replace(
    /(style\.textContent\s*=\s*`)([^`]*?)(`)/,
    (_, open, css) => `style.textContent = "${css
      .replace(/[\t\n\r]+\s*/g, ' ')  // collapse whitespace
      .replace(/\s*{\s*/g, '{')        // remove spaces around {
      .replace(/\s*}\s*/g, '}')        // remove spaces around }
      .replace(/\s*:\s*/g, ':')        // remove spaces around :
      .replace(/\s*;\s*/g, ';')        // remove spaces around ;
      .replace(/\s*,\s*/g, ',')        // remove spaces around ,
      .replace(/"/g, '\\"')
      .trim()}"`
  );

  const result = await terser.minify(processed, {
    compress: { passes: 2 },
    mangle: { toplevel: false },
    sourceMap: {
      filename: path.basename(outPath),
      url: path.basename(mapPath)
    }
  });

  await fs.writeFile(outPath, result.code + '\n', 'utf8');
  await fs.writeFile(mapPath, result.map, 'utf8');

  const minifiedSize = Buffer.byteLength(result.code, 'utf8');
  const gzippedSize = zlib.gzipSync(result.code).length;

  console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);
  console.log(`Original: ${format(originalSize)} → Minified: ${format(minifiedSize)} (gzipped: ${format(gzippedSize)})`);
}

function format(n) {
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(2)} KB`;
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});