const CREDITS = [
  ['Collab Media', 'https://unsplash.com/photos/a-pile-of-vegetables-sitting-on-top-of-a-table-lzyaeNQ9wU4'],
  ['Luisa Brimble', 'https://unsplash.com/photos/assorted-glass-jars-on-white-wooden-shelf-i-GPyFK_SJg'],
  ['shraga kopstein', 'https://unsplash.com/photos/a-close-up-of-a-cutting-board-with-chopped-vegetables-EGtRM9PFG64'],
  ['Nina Weishaupt', 'https://unsplash.com/photos/fresh-vegetables-and-produce-displayed-at-a-market-nwpPqHpFge4'],
  ['Ella Olsson', 'https://unsplash.com/photos/meal-prep-containers-with-healthy-food-lMcRyBx4G50'],
  ['Ello', 'https://unsplash.com/photos/colorful-food-containers-in-refrigerator-AEU9UZstCfs'],
];

export default function PhotoCredits() {
  return <details className="photo-credits"><summary>Photography credits</summary><p>With thanks to these photographers. Images used under the <a href="https://unsplash.com/license" target="_blank" rel="noreferrer">Unsplash License</a>.</p><ul>{CREDITS.map(([name, url]) => <li key={name}><a href={url} target="_blank" rel="noreferrer">{name} ↗</a></li>)}</ul></details>;
}
