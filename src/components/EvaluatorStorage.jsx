import { useEffect, useMemo, useRef, useState } from 'react';
import { createAssessmentService } from '../services/assessments.js';
import SavedAssessments from './SavedAssessments.jsx';
import AuthForm from './AuthForm.jsx';
import { finishAuthentication } from '../navigation.js';
import { useAccountSession } from './AccountSession.jsx';

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
    <h3 className="text-lg font-semibold">Keep your assessment</h3>
    <p className="mt-2 text-sm text-stone-600">Save your answers and guidance to revisit them later.</p>
    <button className="primary mt-4 disabled:cursor-not-allowed disabled:opacity-50" disabled={!assessment || saveState === 'saving' || saveState === 'saved'} onClick={save}>{saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Assessment saved' : 'Save assessment'}</button>
    {!assessment && <p className="mt-2 text-sm">Complete a household assessment before saving. <a href="#/personalisation" className="underline">Start an assessment</a></p>}
    <div role="status" className="mt-2 text-sm">{saveState === 'saved' && 'Saved successfully. You can find this assessment in your history.'}</div>
    {saveState === 'error' && <p role="alert" className="mt-2 text-sm text-red-800">Save could not be confirmed. Your local guidance is still available. Refresh history before retrying to avoid a duplicate if the save reached the server.</p>}
    <div className="mt-7 flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">Saved assessments</h3><button className="secondary" disabled={historyState === 'loading'} onClick={loadHistory}>Refresh history</button></div>
    <p className="mt-2 text-xs text-stone-600">Your 50 most recent assessments. Expand a record to view its saved answers and guidance.</p>
    <div role="status" className="mt-3 text-sm">{historyState === 'loading' ? 'Loading saved assessments…' : historyState === 'ready' && records.length === 0 ? 'No saved assessments yet.' : ''}</div>
    {historyState === 'error' && <p role="alert" className="mt-3 text-sm text-red-800">Could not load history. Check your connection and sign-in, then refresh history.</p>}
    {historyState === 'ready' && <SavedAssessments records={records} />}
  </div>;
}

export default function EvaluatorStorage({ client, assessment, authMode = null }) {
  const { session, ready } = useAccountSession(client);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, [client]);

  useEffect(() => {
    if (!authMode || !session) return;
    let active = true;
    // Query outside the auth callback so it cannot hold Supabase's auth lock.
    createAssessmentService(client).list().then((records) => {
      if (active) finishAuthentication(records.length ? 'dashboard' : 'personalisation');
    }).catch(() => { if (active) finishAuthentication('dashboard'); });
    return () => { active = false; };
  }, [authMode, session?.user.id, client]);
  async function signOut() {
    setBusy(true); setError('');
    try {
      const { error: authError } = await client.auth.signOut({ scope: 'local' });
      if (authError) throw authError;
    } catch {
      if (alive.current) setError('Could not sign out. Check your connection and try again.');
    } finally { if (alive.current) setBusy(false); }
  }

  if (authMode) return <section className="auth-card" aria-labelledby="auth-card-title">
    <p className="eyebrow">Your SmartKai account</p><h2 id="auth-card-title">{authMode === 'register' ? 'Create your account' : 'Sign in to SmartKai'}</h2>
    {!client && <p className="auth-error" role="status">Account access is unavailable right now. Please try again later.</p>}
    {(new URLSearchParams(window.location.hash.slice(1)).has('error') || new URLSearchParams(window.location.search).has('error')) && <p className="auth-error" role="alert">This confirmation link is invalid or expired. Try signing in, or request a new confirmation by creating your account again.</p>}
    {!ready ? <p role="status">Checking your session…</p> : session ? <p role="status">Finding your next step…</p> : <AuthForm key={authMode} client={client} mode={authMode} />}
  </section>;

  return <section id="evaluator-workspace" className="panel evaluator-panel" aria-labelledby="storage-title">
    <p className="eyebrow">03 / Your account</p><h2 id="storage-title" className="mt-3 text-2xl font-semibold">Your assessments, all in one place</h2>
    {!client ? <p className="mt-3 text-sm">Saving is unavailable right now. You can still explore your household guidance.</p> : !ready ? <p role="status" className="mt-3">Checking your session…</p> : session ? <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="break-all text-sm">Signed in as <strong>{session.user.email}</strong></p><button className="secondary" onClick={signOut} disabled={busy}>{busy ? 'Signing out…' : 'Sign out'}</button></div>
      <StorageWorkspace key={session.user.id} client={client} assessment={assessment} />
    </> : <>
      <p className="mt-3 text-sm text-stone-600">Sign in to save your assessments and revisit your guidance. You can also <a href="#/personalisation" className="underline">explore the questions</a> before signing in.</p>
      <AuthForm client={client} />
    </>}
    {error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
  </section>;
}
