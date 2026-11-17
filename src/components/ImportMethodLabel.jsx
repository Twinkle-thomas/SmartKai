export default function ImportMethodLabel({ method }) {
  const options = {
    receipt: { title: 'Grocery receipt', description: 'Read items from a receipt', path: <><path d="M7 3h10v18l-2-1.5-3 1.5-3-1.5L7 21V3Z"/><path d="M10 7h4m-4 4h4m-4 4h3"/></> },
    photo: { title: 'Food photo', description: 'Review possible food matches', path: <><path d="M3 7h5l2-3h4l2 3h5v13H3V7Z"/><circle cx="12" cy="13" r="4"/></> },
    barcode: { title: 'Barcode', description: 'Look up a packaged product', path: <><path d="M3 7V3h4m10 0h4v4M3 17v4h4m10 0h4v-4M7 7v10m3-10v10m4-10v10m3-10v10"/></> },
  };
  const option = options[method];
  return <><span className="pantry-import-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{option.path}</svg></span><span className="pantry-import-label"><strong>{option.title}</strong><span>{option.description}</span></span><span className="pantry-import-chevron" aria-hidden="true">＋</span></>;
}
