import { useState } from 'react';

export function Brand() {
  return <a href="#/" className="brand" aria-label="SmartKai home"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M7 25C6 11 13 5 26 5C27 18 20 25 7 25Z" fill="currentColor" /><path d="M5 28L21 12" stroke="#FAF8F2" strokeWidth="2" strokeLinecap="round" /></svg>SmartKai<span>.</span></a>;
}

export function SiteHeader({ route, signedIn = false, ready = true, client }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function logout() {
    if (busy || !client) return;
    setBusy(true); setError('');
    try {
      const { error: authError } = await client.auth.signOut({ scope: 'local' });
      if (authError) throw authError;
      window.location.hash = '#/';
    } catch {
      setError('Could not log out. Please try again.');
    } finally { setBusy(false); }
  }
  return <header className="site-header"><div className="page-width header-inner"><Brand />
    <nav aria-label="Main navigation">
      <a href="#features" className="desktop-nav">The SmartKai way</a>
      {!signedIn && <a href="#/dashboard" aria-current={route === 'dashboard' ? 'page' : undefined}>Dashboard</a>}
      <a href={signedIn ? '#/account' : '#/login'} className="nav-account" aria-current={['account', 'login'].includes(route) ? 'page' : undefined}>{signedIn ? 'Your account' : 'Sign in'} <span aria-hidden="true">↗</span></a>
      {ready && <a href={signedIn ? '#/dashboard' : '#/register'} className="nav-register" aria-current={route === 'register' ? 'page' : undefined}>{signedIn ? 'Go to dashboard' : 'Get started'}</a>}
      {signedIn && <button type="button" className="nav-logout" onClick={logout} disabled={busy}>{busy ? 'Logging out…' : 'Log out'}</button>}
    </nav>
  </div>{error && <p role="alert" className="page-width pb-3 text-sm text-red-800">{error}</p>}</header>;
}

export function SiteFooter() {
  return <footer className="page-width site-footer"><div><Brand /><p className="mt-3">A little care for the food we bring home.</p></div>
    <div><p>Thoughtfully made for households<br />in Aotearoa New Zealand.</p><p className="mt-3">Your assessments are saved only when you choose Save assessment.</p></div>
    <nav aria-label="Footer navigation"><a href="#/dashboard">Explore SmartKai ↗</a><a href="#/personalisation">Personalised recommendations ↗</a></nav>
  </footer>;
}
