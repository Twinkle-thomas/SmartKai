import { useEffect, useState } from 'react';
import { createAssessmentService } from '../services/assessments.js';
import SuggestedActions from './SuggestedActions.jsx';
import SavedAssessments from './SavedAssessments.jsx';

export default function Dashboard({ result, client, signedIn = false }) {
  const [history, setHistory] = useState({ state: 'loading', records: [] });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    setHistory({ state: 'loading', records: [] });
    createAssessmentService(client).list().then((records) => {
      if (active) setHistory({ state: 'ready', records });
    }).catch(() => { if (active) setHistory({ state: 'error', records: [] }); });
    return () => { active = false; };
  }, [client, signedIn, retry]);
  const profiles=result?.profiles??history.records[0]?.assessment_results?.profiles??[];
  return <>
    <div className="workspace-intro"><p className="eyebrow">Your household / Overview</p><h1>{signedIn ? <>Welcome back.<br /><span>Your household at a glance.</span></> : <>A little more clarity.<br /><span>A place to begin.</span></>}</h1><p>{signedIn ? 'Revisit your saved guidance or take a fresh look at your food habits.' : 'Explore your food habits, revisit your guidance and see what’s taking shape.'}</p></div>
    {signedIn && <section className="panel mb-6" aria-labelledby="latest-guidance-title"><h2 id="latest-guidance-title" className="text-2xl font-semibold">Your latest saved guidance</h2>
      {history.state === 'loading' && <p role="status">Loading your latest guidance…</p>}
      {history.state === 'error' && <><p role="alert">We couldn’t load your saved guidance. Your history has not been changed.</p><button className="secondary mt-3" onClick={() => setRetry((value) => value + 1)}>Try loading guidance again</button></>}
      {history.state === 'ready' && (history.records.length ? <><p className="mt-2">Expand your latest assessment to see your saved profiles and recommendations.</p><SavedAssessments records={history.records.slice(0, 1)} /></> : <><p className="mt-2">Start with five questions to discover guidance for your household. Save your assessment to find it here next time.</p><a className="primary mt-4" href="#/personalisation">Start your household assessment</a></>)}
    </section>}
    <SuggestedActions profiles={profiles}/>
    <div className="dashboard-actions"><section className="dashboard-primary"><span className="eyebrow">Personalised Recommendations / Available now</span><h2>{result ? 'Your next steps, ready to revisit.' : 'Get to know your food habits.'}</h2><p>{result ? `${result.profiles.length} matching profiles in your current assessment. View your guidance or update your answers.` : 'Five short questions to help shape your household’s guidance.'}</p><a className="primary" href="#/personalisation">{result ? 'View your guidance' : 'Get Personalised Recommendations'} <span aria-hidden="true">↗</span></a></section>
      <section className="panel dashboard-history"><span aria-hidden="true" className="dashboard-symbol">↺</span><h2>Your saved assessments.</h2><p>{signedIn ? 'Revisit the answers and recommendations you’ve chosen to save.' : 'Sign in to revisit the answers and recommendations you’ve chosen to save.'}</p><a href="#/account" className="text-link">Open account & history <span aria-hidden="true">↗</span></a></section></div>
    <div className="dashboard-actions mt-6"><section className="panel"><p className="eyebrow">Use your guidance</p><h2 className="mt-3 text-2xl font-semibold">Your pantry, ready to organise.</h2><p className="mt-3">Add food, quantities, dates and storage notes. Mark leftovers and food you want to use first.</p><a className="primary mt-4" href="#/pantry">Open pantry</a></section><section className="panel"><p className="eyebrow">Revisit after 30 days</p><h2 className="mt-3 text-2xl font-semibold">Your monthly check-in.</h2><p className="mt-3">Compare your starting answers with your latest saved assessment. Review reported habits over one, two or three months.</p><a className="primary mt-4" href="#/progress">View monthly check-in</a></section></div>
    <section className="panel mt-6"><p className="eyebrow">Make room for what you have</p><h2 className="mt-3 text-2xl font-semibold">A week with a little intention.</h2><p className="mt-3">Plan meals, note pantry ingredients and suitable leftovers, and add missing ingredients to your shopping list.</p><a className="primary mt-4" href="#/meals">Open meal planner</a></section>
    <section className="panel mt-6"><p className="eyebrow">Before your next shop</p><h2 className="mt-3 text-2xl font-semibold">Buy with a little more intention.</h2><p className="mt-3">Check your pantry, save a list with quantities and tick off items as you shop.</p><a className="primary mt-4" href="#/shopping">Open shopping list</a></section>
    <section className="panel mt-6"><p className="eyebrow">Your week, your routine</p><h2 className="mt-3 text-2xl font-semibold">A reminder at the right time.</h2><p className="mt-3">Plan meals on your day off, prepare for shopping or check your use-first food. Choose a weekly day and time for each reminder.</p><a className="primary mt-4" href="#/reminders">Manage my reminders</a></section>
    <div className="dashboard-roadmap"><p className="eyebrow">A little more support</p><h2>Your household tools.</h2><p>Review food dates, manage leftovers, browse storage guidance and explore the sharing simulation.</p><div className="mt-5 flex flex-wrap gap-3"><a href="#/expiry" className="secondary">Review food dates</a><a href="#/leftovers" className="secondary">Manage leftovers</a><a href="#/storage" className="secondary">Read storage guidance</a><a href="#/barcode" className="secondary">Scan product barcode</a><a href="#/sharing" className="secondary">Explore sharing simulation</a><a href="#/tools" className="primary">Explore all tools</a></div></div>
  </>;
}
