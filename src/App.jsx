import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { personalise } from './domain/personalisation.js';
import { SCENARIOS } from './data/scenarios.js';
import PracticeForm from './components/PracticeForm.jsx';
import Results from './components/Results.jsx';
import EvaluatorStorage from './components/EvaluatorStorage.jsx';
import Dashboard from './components/Dashboard.jsx';
import { SiteHeader, SiteFooter } from './components/SiteChrome.jsx';
import { useRoute } from './navigation.js';
import { householdLabel } from './presentation/householdCopy.js';
import AuthPage from './components/AuthPage.jsx';
import { AccountSession, useAccountSession } from './components/AccountSession.jsx';
const Pantry = lazy(() => import('./components/Pantry.jsx'));
import Progress from './components/Progress.jsx';
const ReminderCenter = lazy(() => import('./components/ReminderCenter.jsx'));
const HomePage = lazy(() => import('./components/HomePage.jsx'));
const ShoppingList = lazy(() => import('./components/ShoppingList.jsx'));
const MealPlanner = lazy(() => import('./components/MealPlanner.jsx'));
const StorageGuide = lazy(() => import('./components/StorageGuide.jsx'));
const SharingSimulation = lazy(() => import('./components/SharingSimulation.jsx'));
const ToolDirectory = lazy(() => import('./components/ToolDirectory.jsx'));
const WasteDashboard = lazy(() => import('./components/WasteDashboard.jsx'));
export default function App({ client = null }) {
  return <AccountSession client={client}><SmartKai client={client} /></AccountSession>;
}
function SmartKai({ client }) {
  const { session, ready } = useAccountSession(client);
  const { route, hash } = useRoute();
  const [answers, setAnswers] = useState({});
  const [scenarioId, setScenarioId] = useState('');
  const [result, setResult] = useState(null);
  const resultHeading = useRef(null);
  const main = useRef(null);
  useEffect(() => {
    const titles = {waste:'Recorded food waste',tools:'Your tools', expiry:'Food dates', leftovers:'Leftover manager', storage:'Storage guide', barcode:'Barcode scanner', sharing:'Sharing simulation', meals:'Your meal planner', shopping:'Your shopping list', reminders:'Your reminders', pantry:'Your pantry', progress:'Your monthly check-in', personalisation:'Your personalised guidance', account:'Your account', dashboard:'Your dashboard', register:'Create your account', login:'Sign in', 'forgot-password':'Reset password', 'reset-password':'Choose a new password'};
    document.title = route === 'home' ? 'SmartKai | Less Food Waste. More Food Saved.' : `SmartKai | ${titles[route] ?? 'Page not found'}`;
    main.current?.focus({ preventScroll: true });
    const anchor = route === 'home' && ['#features', '#how-it-works'].includes(window.location.hash) ? document.getElementById(window.location.hash.slice(1)) : document.getElementById('root');
    anchor?.scrollIntoView?.({ block: 'start' });
  }, [route, hash]);
  useEffect(() => { if (result && route === 'personalisation') resultHeading.current?.focus(); }, [result, route]);
  function loadScenario(event) {
    const id = event.target.value;
    setScenarioId(id);
    setAnswers({ ...(SCENARIOS.find((scenario) => scenario.id === id)?.scores ?? {}) });
    setResult(null);
  }
  function answer(id, score) { setAnswers((previous) => ({ ...previous, [id]: score })); setScenarioId(''); setResult(null); }
  function submit(event) {
    event.preventDefault();
    setResult({ ...personalise(answers), scores: { ...answers }, scenarioId: scenarioId || null, label: SCENARIOS.find((scenario) => scenario.id === scenarioId)?.label ?? 'Custom fictional household' });
  }
  function reset() { setAnswers({}); setScenarioId(''); setResult(null); }
  useEffect(() => {
    window.addEventListener('smartkai:new-check-in', reset);
    return () => window.removeEventListener('smartkai:new-check-in', reset);
  }, []);
  return <>
    <a href="#main" className="skip-link" onClick={(event) => { event.preventDefault(); main.current?.focus(); }}>Skip to content</a>
    <SiteHeader route={route} signedIn={!!session} ready={ready} client={client} />
    <main id="main" ref={main} tabIndex={-1} className={`page-width ${route === 'home' ? 'homepage' : 'application-page'}`}>
      {route === 'home' ? <Suspense fallback={<p role="status" className="workspace-intro">Loading SmartKai…</p>}><HomePage /></Suspense> : route === 'not-found' ? <section className="workspace-intro"><p className="eyebrow">A little off track</p><h1>Let’s find your way back.</h1><p>This page isn’t available.</p><a className="primary mt-6" href="#/">Back to SmartKai</a></section> : ['login', 'register','forgot-password','reset-password'].includes(route) ? <AuthPage client={client} mode={route} /> : <>
      <nav className="workspace-nav" aria-label="Application navigation"><a href="#/dashboard" aria-current={route === 'dashboard' ? 'page' : undefined}>Overview</a><a href="#/personalisation" aria-current={route === 'personalisation' ? 'page' : undefined}>Your guidance</a><a href="#/pantry" aria-current={route === 'pantry' ? 'page' : undefined}>Pantry</a><a href="#/meals" aria-current={route === 'meals' ? 'page' : undefined}>Meal planner</a><a href="#/shopping" aria-current={route === 'shopping' ? 'page' : undefined}>Shopping list</a><a href="#/waste" aria-current={route === 'waste' ? 'page' : undefined}>Food waste</a><a href="#/tools" aria-current={route === 'tools' ? 'page' : undefined}>All tools</a><a href="#/progress" aria-current={route === 'progress' ? 'page' : undefined}>Monthly check-in</a><a href="#/reminders" aria-current={route === 'reminders' ? 'page' : undefined}>Reminders</a><a href="#/account" aria-current={route === 'account' ? 'page' : undefined}>Account & history</a></nav>
      <Suspense fallback={null}><ReminderCenter key={session?.user.id ?? 'guest'} client={client} userId={session?.user.id} route={route} /></Suspense>
      {route === 'dashboard' && <Dashboard key={session?.user.id ?? 'guest'} result={result} client={client} signedIn={!!session} />}
      {route === 'pantry' && <Suspense fallback={<p role="status">Loading pantry tools…</p>}><Pantry key={session?.user.id ?? 'guest'} client={client} userId={session?.user.id} initialFilter={hash === '#/pantry/use-first' ? 'Use first' : hash === '#/pantry/leftovers' ? 'Leftovers' : 'All items'} /></Suspense>}
      {['expiry','leftovers','barcode'].includes(route) && <Suspense fallback={<p role="status">Loading food tools…</p>}><Pantry key={`${session?.user.id ?? 'guest'}:${route}`} client={client} userId={session?.user.id} view={route} initialFilter={route === 'leftovers' ? 'Leftovers' : 'All items'} /></Suspense>}
      {route === 'tools' && <Suspense fallback={<p role="status">Loading tools…</p>}><ToolDirectory /></Suspense>}
      {route === 'storage' && <Suspense fallback={<p role="status">Loading storage guide…</p>}><StorageGuide key={hash} /></Suspense>}
      {route === 'sharing' && <Suspense fallback={<p role="status">Loading sharing simulation…</p>}><SharingSimulation key={session?.user.id ?? 'guest'} client={client} userId={session?.user.id} /></Suspense>}
      {route === 'progress' && <Progress key={session?.user.id ?? 'guest'} client={client} userId={session?.user.id} />}
      {route === 'waste' && <Suspense fallback={<p role="status">Loading recorded waste…</p>}><WasteDashboard key={session?.user.id ?? 'guest'} client={client} userId={session?.user.id} /></Suspense>}
      {route === 'shopping' && <Suspense fallback={<p role="status">Loading shopping tools…</p>}><ShoppingList key={session?.user.id ?? 'guest'} client={client} userId={session?.user.id} /></Suspense>}
      {route === 'meals' && <Suspense fallback={<p role="status">Loading meal planner…</p>}><MealPlanner key={session?.user.id ?? 'guest'} client={client} userId={session?.user.id} /></Suspense>}
      {route === 'account' && <div className="workspace-intro"><p className="eyebrow">Your household / Your account</p><h1>A place to come back to.</h1><p>{session ? 'Revisit your saved assessments and household guidance.' : 'Sign in to save your assessments and revisit your guidance.'}</p><a href="#/personalisation" className="text-link">Start a household assessment ↗</a></div>}
      {route === 'personalisation' && <>
      <div id="assessment" className="section-intro"><div><p className="eyebrow">A moment to reflect</p><h1>Every household has habits.<br /><span>Get to know yours.</span></h1></div><p>Five questions. A fresh perspective.<br />Guidance shaped by your answers.</p></div>
      <div className="grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="panel" aria-label="Explore practices"><p className="eyebrow">01 / Explore practices</p>
          <div className="scenario-box"><label htmlFor="scenario" className="mb-2 block font-medium">Choose an example household</label><select id="scenario" value={scenarioId} onChange={loadScenario} className="w-full rounded-xl border border-stone-300 bg-white p-3 text-sm"><option value="">Your household — start blank</option>{SCENARIOS.map((scenario) => <option key={scenario.id} value={scenario.id}>{householdLabel(scenario.label)} · {scenario.id.replaceAll('-', ' ')}</option>)}</select><p className="mt-2 text-xs text-stone-600">Choose an example to explore, or answer the questions for your household.</p></div>
          <p className="my-4 text-sm text-stone-600">For a household check-in, consider the past 30 days. Complete all five questions, then save your assessment to include it in your monthly comparison.</p>
          <PracticeForm answers={answers} onAnswer={answer} onSubmit={submit} onReset={reset} />
        </section>
        <div id="guidance" className="space-y-6"><Results result={result} ref={resultHeading} /></div>
      </div>
      </>}
      {!['waste','pantry','progress','reminders','shopping','meals','expiry','leftovers','barcode','storage','sharing','tools'].includes(route) && <EvaluatorStorage client={client} assessment={result} />}
      </>}
    </main>
    <SiteFooter />
  </>;
}
