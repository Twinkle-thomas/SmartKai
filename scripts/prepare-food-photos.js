import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

// Source pages were checked for the free Unsplash License, not Unsplash+.
const sources = [
  { id: 'fresh-food', photographer: 'Collab Media', photoId: 'lzyaeNQ9wU4', image: 'photo-1641893720944-15c83082f2f5', source: 'https://unsplash.com/photos/a-pile-of-vegetables-sitting-on-top-of-a-table-lzyaeNQ9wU4' },
  { id: 'pantry', photographer: 'Luisa Brimble', photoId: 'i-GPyFK_SJg', image: 'photo-1592178036182-5400889dfc74', source: 'https://unsplash.com/photos/assorted-glass-jars-on-white-wooden-shelf-i-GPyFK_SJg' },
  { id: 'prepared-meals', photographer: 'Ella Olsson', photoId: 'lMcRyBx4G50', image: 'photo-1543352632-5a4b24e4d2a6', source: 'https://unsplash.com/photos/meal-prep-containers-with-healthy-food-lMcRyBx4G50' },
  { id: 'preparation', photographer: 'shraga kopstein', photoId: 'EGtRM9PFG64', image: 'photo-1633910059461-8b5e672627de', source: 'https://unsplash.com/photos/a-close-up-of-a-cutting-board-with-chopped-vegetables-EGtRM9PFG64' },
  { id: 'market', photographer: 'Nina Weishaupt', photoId: 'nwpPqHpFge4', image: 'photo-1771659753573-e8498a262168', source: 'https://unsplash.com/photos/fresh-vegetables-and-produce-displayed-at-a-market-nwpPqHpFge4' },
  { id: 'storage', photographer: 'Ello', photoId: 'AEU9UZstCfs', image: 'photo-1606859191214-25806e8e2423', source: 'https://unsplash.com/photos/colorful-food-containers-in-refrigerator-AEU9UZstCfs' },
];
const directory = new URL('../public/media/food/', import.meta.url);
await mkdir(directory, { recursive: true });
const records = await Promise.all(sources.map(async (photo) => {
  const response = await fetch(`https://images.unsplash.com/${photo.image}?auto=format&fit=max&w=2000&q=85`, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Photo download failed: ${photo.id} (${response.status})`);
  const original = Buffer.from(await response.arrayBuffer());
  const variants = [];
  for (const width of [640, 1024, 1600]) {
    const { data, info } = await sharp(original).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78, effort: 5 }).toBuffer({ resolveWithObject: true });
    const filename = `${photo.id}-${width}.webp`;
    await writeFile(new URL(filename, directory), data);
    variants.push({ file: `/media/food/${filename}`, width: info.width, height: info.height, bytes: info.size });
  }
  console.log(`${photo.id}: ${variants.map(({ bytes }) => Math.round(bytes / 1024) + ' KB').join(' / ')}`);
  return { ...photo, license: 'https://unsplash.com/license', verifiedOn: '2026-10-31', variants };
}));
await writeFile(new URL('credits.json', directory), JSON.stringify(records, null, 2) + '\n');
