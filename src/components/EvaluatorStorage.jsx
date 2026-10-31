import { useEffect, useMemo, useRef, useState } from 'react';
import { createAssessmentService } from '../services/assessments.js';
import SavedAssessments from './SavedAssessments.jsx';

function StorageWorkspace({ client, assessment }) {
  const service = useMemo(() => createAssessmentService(client), [client]);
  const [records, setRecords] = useState([]);
  const [historyState, setHistoryState] = useState('loading');
  const [saveState, setSaveState] = useState('idle');
  const active = useRef(true);
  const historyRequest = useRef(0);
  const saving = useRef(false);
  const currentAssessment = useRef(assessment);
  currentAssessment.current = assessment;

  async function loadHistory() {
    const request = ++historyRequest.current;
    setHistoryState('loading');
    try {
      const saved = await service.list();
      if (active.current && request === historyRequest.current) { setRecords(saved); setHistoryState('ready'); }
    } catch {
      if (active.current && request === historyRequest.current) { setRecords([]); setHistoryState('error'); }
    }
  }
  useEffect(() => {
    active.current = true;
    loadHistory();
    return () => { active.current = false; historyRequest.current++; };
  }, [service]); // Separate from auth callbacks to avoid holding Supabase's auth lock.
  useEffect(() => { setSaveState(saving.current ? 'saving' : 'idle'); }, [assessment]);

  async function save() {
    if (!assessment || saving.current || saveState === 'saved') return;
    saving.current = true;
    setSaveState('saving');
    try {
      await service.save(assessment.scores, assessment.scenarioId);
      if (active.current) {
        if (currentAssessment.current === assessment) setSaveState('saved');
        await loadHistory();
      }
    } catch {
      if (active.current && currentAssessment.current === assessment) setSaveState('error');
    } finally {
      saving.current = false;
      if (active.current && currentAssessment.current !== assessment) setSaveState('idle');
    }
  }
  return <div className="mt-6 border-t border-stone-200 pt-6">
    <h3 className="text-lg font-semibold">Keep this fictional assessment</h3>
    <p className="mt-2 text-sm text-stone-600">Save only fictional answers. Each save creates a separate household snapshot.</p>
    <button className="primary mt-4 disabled:cursor-not-allowed disabled:opacity-50" disabled={!assessment || saveState === 'saving' || saveState === 'saved'} onClick={save}>{saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Assessment saved' : 'Save assessment'}</button>
    {!assessment && <p className="mt-2 text-sm">View household guidance above before saving.</p>}
    <div role="status" className="mt-2 text-sm">{saveState === 'saved' && 'Saved successfully. You can find this assessment in your history.'}</div>
    {saveState === 'error' && <p role="alert" className="mt-2 text-sm text-red-800">Save could not be confirmed. Your local guidance is still available. Refresh history before retrying to avoid a duplicate if the save reached the server.</p>}
    <div className="mt-7 flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">Saved assessments</h3><button className="secondary" disabled={historyState === 'loading'} onClick={loadHistory}>Refresh history</button></div>
    <p className="mt-2 text-xs text-stone-600">Your 50 most recent assessments. Expand a record to view its saved answers and guidance.</p>
    <div role="status" className="mt-3 text-sm">{historyState === 'loading' ? 'Loading saved assessments…' : historyState === 'ready' && records.length === 0 ? 'No saved assessments yet.' : ''}</div>
    {historyState === 'error' && <p role="alert" className="mt-3 text-sm text-red-800">Could not load history. Check your connection and evaluator sign-in, then refresh history.</p>}
    {historyState === 'ready' && <SavedAssessments records={records} />}
  </div>;
}

export default function EvaluatorStorage({ client, assessment }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(!client);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    if (!client) { setSession(null); setReady(true); return; }
    setReady(false);
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (alive.current) { setSession(nextSession); setReady(true); setPassword(''); }
    });
    return () => { alive.current = false; subscription.unsubscribe(); };
  }, [client]);

  async function signIn(event) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const { error: authError } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) throw authError;
    } catch {
      if (alive.current) setError('Sign-in failed. Check your evaluator email, password and connection.');
    } finally { if (alive.current) { setBusy(false); setPassword(''); } }
  }
  async function signOut() {
    setBusy(true); setError('');
    try {
      const { error: authError } = await client.auth.signOut({ scope: 'local' });
      if (authError) throw authError;
    } catch {
      if (alive.current) setError('Could not sign out. Check your connection and try again.');
    } finally { if (alive.current) setBusy(false); }
  }

  return <section className="panel mt-6" aria-labelledby="storage-title">
    <p className="eyebrow">03 / Evaluator workspace</p><h2 id="storage-title" className="mt-3 text-2xl font-semibold">Save and revisit fictional assessments</h2>
    {!client ? <p className="mt-3 text-sm">Database storage is not configured. You can still explore fictional household guidance above.</p> : !ready ? <p role="status" className="mt-3">Checking evaluator session…</p> : session ? <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="break-all text-sm">Signed in as <strong>{session.user.email}</strong></p><button className="secondary" onClick={signOut} disabled={busy}>{busy ? 'Signing out…' : 'Sign out'}</button></div>
      <StorageWorkspace key={session.user.id} client={client} assessment={assessment} />
    </> : <>
      <p className="mt-3 text-sm text-stone-600">Sign in with your existing evaluator account to save fictional assessments. Local guidance is available without signing in.</p>
      <form onSubmit={signIn} className="mt-5 grid max-w-2xl gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Evaluator email<input className="mt-2 block w-full rounded-lg border border-stone-300 p-3" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={busy} /></label>
        <label className="text-sm font-medium">Password<input className="mt-2 block w-full rounded-lg border border-stone-300 p-3" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={busy} /></label>
        <button className="primary w-fit" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </>}
    {error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
  </section>;
}
