import { createClient } from '@supabase/supabase-js';

// Importing the app without configuration must keep the local workflow available.
export function createConfiguredClient(env = import.meta.env) {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}
