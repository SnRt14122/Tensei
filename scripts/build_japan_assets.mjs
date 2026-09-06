// Usage: node scripts/build_japan_assets.mjs <Natural Earth GeoJSON> <NASA world JPG>
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const [countriesPath, satellitePath] = process.argv.slice(2);
if (!countriesPath || !satellitePath) throw new Error('Provide the two source files; see docs/视觉与音调数据来源.md');
const countries = JSON.parse(await readFile(countriesPath, 'utf8'));
const japan = countries.features.find(feature => feature.properties.ADM0_A3 === 'JPN');
const output = new URL('../public/assets/japan/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL('land.json', output), JSON.stringify(japan.geometry.coordinates));
// Equirectangular 21600x10800 source: 60 pixels per degree, 122-147E / 24-46N.
await sharp(satellitePath).extract({ left: 18120, top: 2640, width: 1500, height: 1320 })
  .webp({ quality: 88 }).toFile(fileURLToPath(new URL('satellite.webp', output)));
