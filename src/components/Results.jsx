import { forwardRef } from 'react';
const Results = forwardRef(function Results({ result }, ref) {
  return <section className="panel h-fit" aria-labelledby="results-title">
    <p className="eyebrow">02 / Personalised guidance</p>
    <h2 id="results-title" ref={ref} tabIndex={-1} className="mt-3 text-2xl font-semibold">{result ? 'Household results' : 'Your results will appear here'}</h2>
    {!result ? <p className="mt-4 text-stone-600">Complete the five questions or load a fictional scenario, then view the guidance.</p> : <>
      <p className="mt-3 text-sm text-stone-600">{result.label}</p><h3 className="mt-6 font-semibold">Assigned profiles</h3>
      {result.profiles.length ? <ul className="mt-3 flex flex-wrap gap-2">{result.profiles.map((profile) => <li className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-950" key={profile}>{profile}</li>)}</ul> : <p className="mt-2 text-stone-600">No profile assigned. No indicator scored Often (2).</p>}
      <h3 className="mt-6 font-semibold">{result.profiles.length ? 'Suggested actions' : 'General food-waste prevention guidance'}</h3>
      <ul className="mt-3 space-y-4">{result.recommendations.map((recommendation) => <li className="border-l-2 border-emerald-700 pl-4" key={recommendation.id}>{recommendation.profile && <p className="mb-1 text-sm font-semibold text-emerald-900">{recommendation.profile}</p>}<p>{recommendation.text}</p></li>)}</ul>
      {!!result.explanations.length && <details className="mt-6 rounded-xl bg-stone-50 p-4"><summary className="cursor-pointer font-medium">Why were these profiles assigned?</summary><ul className="mt-3 space-y-2 text-sm">{result.explanations.map(({ profile }) => <li key={profile}>{profile}: its corresponding answer was Often (score 2), meeting the threshold of 2.</li>)}</ul></details>}
      <p className="mt-6 text-xs text-stone-500">Rule version: {result.ruleVersion}. This working result clears on refresh. To keep a copy, sign in and choose Save assessment below.</p>
    </>}
  </section>;
});
export default Results;
