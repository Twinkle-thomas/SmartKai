import { useEffect, useState } from 'react';
import { createProgressService } from '../services/progress.js';
import { progressSummary } from '../domain/progress.js';

const labels = ['Never', 'Sometimes', 'Often'];
export default function Progress({ client, userId }) {
  const [state, setState] = useState({ status: 'loading' });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    setState({ status: 'loading' });
    createProgressService(client).load().then(({ baseline, latest }) => {
      const summary = progressSummary(baseline, latest);
      if (active) setState({ status: 'ready', summary, baseline, latest });
    }).catch(() => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [client, userId, retry]);
  const summary = state.summary;
  return <>
    <div className="workspace-intro"><p className="eyebrow">Your household / Check-in</p><h1>A moment to revisit.<br /><span>See how your habits change.</span></h1><p>Use your tools, then check in again after 30 days. Continue monthly for two or three months to explore changes over time.</p></div>
    <section className="panel">
      {!userId ? <><h2>Keep track of your guidance</h2><p>Sign in to compare your saved assessments.</p><a className="primary mt-4" href="#/login">Sign in</a></> : state.status === 'loading' ? <p role="status">Loading your check-in…</p> : state.status === 'error' ? <><p role="alert">Could not compare your assessments. Check your connection and try again.</p><button className="secondary mt-4" onClick={() => setRetry((value) => value + 1)}>Reload check-in</button></> : !summary ? <><h2 className="text-2xl font-semibold">Start your first check-in</h2><p className="mt-3">Answer the five questions and choose Save assessment. Your first saved household assessment becomes your starting point. Example scenarios are kept separate.</p><a className="primary mt-4" href="#/personalisation">Complete your first assessment</a></> : <>
        <h2 className="text-2xl font-semibold">{summary.due ? 'Your monthly check-in is ready' : 'Your next monthly check-in'}</h2>
        <p className="mt-3">Suggested date: {summary.dueAt.toLocaleDateString('en-NZ', { timeZone: 'Pacific/Auckland' })}. This is an in-app prompt; no email reminders are sent.</p>
        <a className="primary mt-4" href="#/personalisation" onClick={() => window.dispatchEvent(new Event('smartkai:new-check-in'))}>Take a fresh assessment</a>
        {!summary.hasFollowUp ? <p className="mt-5">Your starting score is {summary.before} / 10. Save another assessment after using your tools to see a comparison.</p> : <>
          <h3 className="mt-7 text-xl font-semibold">Reported food-management habits</h3>
          <p className="mt-3">Starting score: <strong>{summary.before} / 10</strong> · Latest score: <strong>{summary.after} / 10</strong></p>
          <p className="mt-2">{summary.change < 0 ? `The reported habit score is ${-summary.change} points lower.` : summary.change > 0 ? `The reported habit score is ${summary.change} points higher.` : 'The reported habit score is unchanged.'}</p>
          <p className="mt-2 text-sm">{summary.elapsedDays} days between the starting and latest assessments. {summary.early && 'This is an early check-in, before 30 days.'}</p>
          <div className="progress-table-wrap"><table className="progress-table"><caption>Starting answers compared with your latest saved answers</caption><thead><tr><th scope="col">Practice</th><th scope="col">Starting answer</th><th scope="col">Latest answer</th></tr></thead><tbody>{summary.rows.map(({ profile, before, after }) => <tr key={profile}><th scope="row">{profile}</th><td>{labels[before]}</td><td>{labels[after]}</td></tr>)}</tbody></table></div>
          <p className="mt-3 text-sm">Starting assessment: {new Date(state.baseline.created_at).toLocaleDateString('en-NZ', { timeZone: 'Pacific/Auckland' })}. Latest: {new Date(state.latest.created_at).toLocaleDateString('en-NZ', { timeZone: 'Pacific/Auckland' })}.</p>
        </>}
        <p className="mt-5 text-sm">Lower scores mean fewer reported waste-related habits. These provisional questionnaire scores describe answers, not measured quantities of food waste or proof of the app’s effectiveness.</p>
        <p className="mt-3"><a className="text-link" href="#/account">View all saved assessments ↗</a></p>
      </>}
    </section>
  </>;
}
