import { useEffect, useState } from 'react';

const groups = [
  ['Your kitchen', [['dashboard', 'Overview', '⌂'], ['pantry', 'Pantry', '▦'], ['meals', 'Meal planner', '▤'], ['shopping', 'Shopping list', '☷']]],
  ['Your progress', [['personalisation', 'Your guidance', '✧'], ['waste', 'Food waste', '◷'], ['progress', 'Monthly check-in', '↗']]],
  ['More', [['tools', 'All tools', '⊞'], ['reminders', 'Reminders', '♧'], ['account', 'Account & history', '○']]],
];

export default function WorkspaceNavigation({ route }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [route]);
  return <aside className="workspace-sidebar">
    <button className="workspace-menu-toggle secondary" type="button" aria-expanded={open} aria-controls="workspace-navigation" onClick={() => setOpen(!open)}>
      <span aria-hidden="true">☰</span> Kitchen menu <span aria-hidden="true">{open ? '−' : '+'}</span>
    </button>
    <nav id="workspace-navigation" className={`workspace-nav${open ? ' is-open' : ''}`} aria-label="Application navigation" onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); event.currentTarget.previousElementSibling?.focus(); } }}>
      <p className="workspace-nav-title">Your SmartKai</p>
      {groups.map(([label, links]) => <div className="workspace-nav-group" key={label}><p>{label}</p>{links.map(([id, name, icon]) => <a key={id} href={`#/${id}`} onClick={() => setOpen(false)} aria-current={route === id || (id === 'pantry' && ['expiry', 'leftovers', 'barcode'].includes(route)) || (id === 'tools' && ['storage', 'sharing'].includes(route)) ? 'page' : undefined}><span aria-hidden="true" className="workspace-nav-icon">{icon}</span>{name}</a>)}</div>)}
    </nav>
  </aside>;
}
