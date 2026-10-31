import { INDICATORS, FREQUENCY_SCORES } from '../domain/personalisation.js';

const COLUMNS = ['overbuying', 'forgetting_food', 'poor_meal_planning', 'discarding_leftovers', 'storage_uncertainty'];
const LABELS = Object.keys(FREQUENCY_SCORES);
export default function SavedAssessments({ records }) {
  return <ul className="mt-4 space-y-3">{records.map((record) => {
    const result = record.assessment_results;
    return <li key={record.id} className="rounded-xl border border-stone-200 p-4">
      <details>
        <summary className="cursor-pointer break-words font-medium">
          {record.households?.fictional_label ?? 'Fictional household'}
          <span className="mt-1 block text-xs font-normal text-stone-600">{new Date(record.created_at).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' })} (NZ time)</span>
        </summary>
        <p className="mt-3 text-xs text-stone-600">Saved rule version: {record.rule_version} · {record.scenario_key ?? 'Custom fictional answers'}</p>
        <h4 className="mt-4 font-semibold">Saved answers</h4>
        <dl className="mt-2 space-y-2 text-sm">{INDICATORS.map(({ id, question }, index) => <div key={id}><dt>{question}</dt><dd className="font-medium">{LABELS[record[COLUMNS[index]]]} ({record[COLUMNS[index]]})</dd></div>)}</dl>
        {result ? <>
          <h4 className="mt-4 font-semibold">Saved profiles</h4>
          <p className="mt-2 text-sm">{result.profiles.length ? result.profiles.join(', ') : 'No profile assigned — general guidance'}</p>
          <h4 className="mt-4 font-semibold">Saved recommendations</h4>
          <ul className="mt-2 space-y-2 text-sm">{result.recommendations.map(({ id, profile, text }) => <li key={id}>{profile && <strong>{profile}: </strong>}{text}</li>)}</ul>
          {!!result.explanations.length && <><h4 className="mt-4 font-semibold">Saved assignment reasons</h4><ul className="mt-2 space-y-2 text-sm">{result.explanations.map(({ indicator, profile, score, threshold }) => <li key={indicator}>{profile}: score {score}, threshold {threshold}.</li>)}</ul></>}
        </> : <p role="alert" className="mt-3">The saved result snapshot is unavailable.</p>}
      </details>
    </li>;
  })}</ul>;
}
