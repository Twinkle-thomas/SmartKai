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
    <div className="workspace-intro dashboard-intro"><p className="eyebrow">Your household / Overview</p><h1>{signedIn ? <>Welcome back.<br /><span>Your household at a glance.</span></> : <>A little more clarity.<br /><span>A place to begin.</span></>}</h1><p>{signedIn ? 'Check your food, plan a meal or prepare your next shop.' : 'Explore your food habits, revisit your guidance and see what’s taking shape.'}</p></div>
    <div className="dashboard-shortcuts" aria-label="Everyday kitchen tasks">
      <a href="#/pantry"><span aria-hidden="true">▦</span><h2>Check your pantry</h2><p>See what you have and what to use first.</p><span className="text-link">Open pantry ↗</span></a>
      <a href="#/meals"><span aria-hidden="true">▤</span><h2>Plan a meal</h2><p>Make a plan around food already at home.</p><span className="text-link">Open meal planner ↗</span></a>
      <a href="#/shopping"><span aria-hidden="true">☷</span><h2>Prepare your shop</h2><p>Keep everything you need in one list.</p><span className="text-link">Open shopping list ↗</span></a>
    </div>
    <SuggestedActions profiles={profiles}/>
    {signedIn && <section className="panel mb-6" aria-labelledby="latest-guidance-title"><h2 id="latest-guidance-title" className="text-2xl font-semibold">Your latest saved guidance</h2>
      {history.state === 'loading' && <p role="status">Loading your latest guidance…</p>}
      {history.state === 'error' && <><p role="alert">We couldn’t load your saved guidance. Your history has not been changed.</p><button className="secondary mt-3" onClick={() => setRetry((value) => value + 1)}>Try loading guidance again</button></>}
      {history.state === 'ready' && (history.records.length ? <><p className="mt-2">Expand your latest assessment to see your saved profiles and recommendations.</p><SavedAssessments records={history.records.slice(0, 1)} /></> : <><p className="mt-2">Start with five questions to discover guidance for your household. Save your assessment to find it here next time.</p><a className="primary mt-4" href="#/personalisation">Start your household assessment</a></>)}
    </section>}
    <section className="dashboard-next-step"><div><h2>{result ? 'Your next steps, ready to revisit.' : 'Your household tools.'}</h2><p>Review your guidance, set a reminder or find another kitchen tool.</p></div><div className="dashboard-more-links"><a className="text-link" href="#/personalisation">{result ? 'View your guidance' : history.records.length ? 'Review your guidance' : 'Get Personalised Recommendations'}</a><a className="text-link" href="#/tools">Explore all tools</a><a className="text-link" href="#/account">Open account &amp; history</a></div></section>
  </>;
}
