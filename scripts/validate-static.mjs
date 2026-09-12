import { readFile, access } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));
const errors = [];

for (const required of ['<link rel="manifest"', 'ComuniCAP Premium', 'HADRION']) {
  if (!html.includes(required)) errors.push(`Falta en index.html: ${required}`);
}

for (const icon of manifest.icons || []) {
  try { await access(new URL(`../${icon.src}`, import.meta.url)); }
  catch { errors.push(`El manifiesto referencia un archivo inexistente: ${icon.src}`); }
}

const symbolBlock = html.match(/let symbols = \[([\s\S]*?)\n\];/);
if (!symbolBlock) {
  errors.push('No se encontró el catálogo principal de símbolos.');
} else {
  const ids = [...symbolBlock[1].matchAll(/\bid\s*:\s*(\d+)/g)].map(m => Number(m[1]));
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicates.length) errors.push(`IDs de símbolos duplicados: ${[...new Set(duplicates)].join(', ')}`);

  const unclear = [
    ["label:'bien'", "emoji:'🤙'"],
    ["label:'mucho'", "emoji:'📦'"],
    ["label:'lleno'", "emoji:'🥴'"],
    ["label:'viejo'", "emoji:'📦'"],
    ["label:'venir'", "emoji:'🤝'"]
  ];
  for (const [label, emoji] of unclear) {
    const row = symbolBlock[1].split('\n').find(line => line.includes(label));
    if (row?.includes(emoji)) errors.push(`Correspondencia visual ambigua: ${label} con ${emoji}`);
  }
}

if (errors.length) {
  console.error(errors.map(e => `✗ ${e}`).join('\n'));
  process.exit(1);
}

console.log('✓ ComuniCAP Premium: estructura, marca, PWA y catálogo base validados.');
