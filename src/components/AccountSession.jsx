import { createContext, useContext, useEffect, useState } from 'react';

const AccountContext = createContext(null);

export function useAccountSession(client) {
  const shared = useContext(AccountContext);
  const [local, setLocal] = useState({ session: null, ready: !client });
  useEffect(() => {
    if (shared || !client) return;
    let active = true;
    setLocal({ session: null, ready: false });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (active) setLocal({ session, ready: true });
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [client, !!shared]);
  return shared ?? local;
}

export function AccountSession({ client, children }) {
  const account = useAccountSession(client);
  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>;
}
