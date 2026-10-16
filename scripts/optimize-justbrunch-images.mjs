import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const images = path.join(root, 'public/mockups/justbrunchva/start-here/images');
const site = path.join(images, '../shared/site.js');
const output = path.join(images, 'optimized');
await mkdir(output, { recursive: true });
// With filenames, rebuild those photos and any missing variants; otherwise rebuild all.
const requested = new Set(process.argv.slice(2));
const filenames = (await readdir(images)).filter(name => /\.(png|jpe?g)$/i.test(name)).sort();
for (const filename of requested) if (!filenames.includes(filename)) throw new Error(`Unknown photo: ${filename}`);

const sources = {};
let originalBytes = 0, cardBytes = 0, largestBytes = 0;
for (const filename of filenames) {
  const input = path.join(images, filename);
  const metadata = await sharp(input).autoOrient().metadata();
  const { width, height } = metadata.autoOrient || metadata;
  if (width <= 1 || height <= 1) continue;
  const stem = path.parse(filename).name;
  const widths = [...new Set([480, 800, 1200, 1600].map(size => Math.min(size, width)))];
  sources[filename] = { width, height, widths };
  originalBytes += (await stat(input)).size;
  for (const size of widths) {
    const target = path.join(output, `${stem}-${size}.webp`);
    const existing = requested.size && !requested.has(filename) ? await stat(target).catch(() => null) : null;
    const result = existing || await sharp(input).autoOrient().resize({ width: size, withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 }).toFile(target);
    if (size === Math.min(800, width)) cardBytes += result.size;
    if (size === widths.at(-1)) largestBytes += result.size;
  }
}

const source = await readFile(site, 'utf8');
const marker = /  \/\/ BEGIN GENERATED PHOTO SOURCES[\s\S]*?  \/\/ END GENERATED PHOTO SOURCES/;
if (!marker.test(source)) throw new Error('Missing photo source markers in site.js');
const entries = Object.entries(sources).map(([name, value]) => `    ${JSON.stringify(name)}: ${JSON.stringify(value)}`).join(',\n');
await writeFile(site, source.replace(marker, `  // BEGIN GENERATED PHOTO SOURCES\n  const photoSources = {\n${entries}\n  };\n  // END GENERATED PHOTO SOURCES`));
console.log(JSON.stringify({ images: Object.keys(sources).length, originalBytes, cardBytes, largestBytes, cardReduction: `${(100 * (1 - cardBytes / originalBytes)).toFixed(1)}%` }, null, 2));
