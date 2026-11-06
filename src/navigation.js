import { useEffect, useState } from 'react';

export function readRoute(hash = window.location.hash) {
  if(hash === '#/forgot-password')return 'forgot-password';
  const callbackParams=new URLSearchParams(hash.slice(1));
  if(hash === '#/reset-password' || ((['','#','#/'].includes(hash)||callbackParams.has('access_token')||callbackParams.has('error')) && new URLSearchParams(window.location.search).get('auth')==='recovery'))return 'reset-password';
  if(hash.startsWith('#/storage?'))return 'storage';
  const tools = { '#/tools':'tools', '#/expiry':'expiry', '#/leftovers':'leftovers', '#/storage':'storage', '#/barcode':'barcode', '#/sharing':'sharing' };
  if (tools[hash]) return tools[hash];
  if (hash === '#/meals') return 'meals';
  if (hash === '#/shopping') return 'shopping';
  if (['#/pantry', '#/pantry/use-first', '#/pantry/leftovers'].includes(hash)) return 'pantry';
  if (hash === '#/progress') return 'progress';
  if (hash === '#/waste') return 'waste';
  if (hash === '#/reminders') return 'reminders';
  if (hash === '#/register') return 'register';
  if (hash === '#/login' || /^#(?:access_token|error)=/.test(hash)
    || (['', '#', '#/'].includes(hash) && new URLSearchParams(window.location.search).get('auth') === 'confirm')) return 'login';
  if (['', '#', '#/', '#features', '#how-it-works'].includes(hash)) return 'home';
  if (['#/personalisation', '#assessment', '#guidance'].includes(hash)) return 'personalisation';
  if (hash === '#/dashboard') return 'dashboard';
  if (['#/account', '#evaluator-workspace'].includes(hash)) return 'account';
  return 'not-found';
}

export function finishAuthentication(destination = 'dashboard') {
  const url = new URL(window.location.href);
  url.searchParams.delete('auth');
  url.searchParams.delete('code');
  url.hash = destination === 'personalisation' ? '/personalisation' : '/dashboard';
  window.history.replaceState(null, '', url);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function useRoute() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return { route: readRoute(hash), hash };
}
