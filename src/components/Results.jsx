import { forwardRef } from 'react';
import { householdLabel } from '../presentation/householdCopy.js';
import { RECOMMENDATION_TOOLS } from '../presentation/recommendationTools.js';
const Results = forwardRef(function Results({ result }, ref) {
  return <section className="panel h-fit" aria-labelledby="results-title">
    <p className="eyebrow">02 / Personalised guidance</p>
    <h2 id="results-title" ref={ref} tabIndex={-1} className="mt-3 text-2xl font-semibold">{result ? 'Household results' : 'Your results will appear here'}</h2>
    {!result ? <p className="mt-4 text-stone-600">Answer the five questions to discover guidance for your household.</p> : <>
      <p className="mt-3 text-sm text-stone-600">{householdLabel(result.label)}</p><h3 className="mt-6 font-semibold">Assigned profiles</h3>
      {result.profiles.length ? <ul className="mt-3 flex flex-wrap gap-2">{result.profiles.map((profile) => <li className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-950" key={profile}>{profile}</li>)}</ul> : <p className="mt-2 text-stone-600">A few everyday tips to support your food-management habits.</p>}
      <h3 className="mt-6 font-semibold">{result.profiles.length ? 'Suggested actions' : 'General food-waste prevention guidance'}</h3>
      <ul className="mt-3 space-y-4">{result.recommendations.map((recommendation) => { const tool = RECOMMENDATION_TOOLS[recommendation.id]; return <li className="border-l-2 border-emerald-700 pl-4" key={recommendation.id}>{recommendation.profile && <p className="mb-1 text-sm font-semibold text-emerald-900">{recommendation.profile}</p>}<p>{recommendation.text}</p>{tool && <><a className="text-link mt-3" href={tool.href}>{tool.label} ↗</a>{tool.next && <p className="mt-2 text-xs text-stone-600">{tool.next}</p>}</>}</li>; })}</ul>
      <p className="mt-6 text-sm">Save this assessment as your starting point, use your tools, then <a className="underline" href="#/progress">revisit your habits after 30 days</a>.</p>
      <p className="mt-3 text-sm"><a className="underline" href="#/reminders">Choose a day and time for your weekly reminders</a> to fit these actions into your routine.</p>
      {!!result.explanations.length && <details className="mt-6 rounded-xl bg-stone-50 p-4"><summary className="cursor-pointer font-medium">About this guidance</summary><ul className="mt-3 space-y-2 text-sm">{result.explanations.map(({ profile }) => <li key={profile}>{profile}: you selected Often for the related food-management practice.</li>)}</ul></details>}
      <p className="mt-6 text-xs text-stone-500">To keep a copy of your guidance, sign in and choose Save assessment below.</p>
    </>}
  </section>;
});
export default Results;
