import { INDICATORS, FREQUENCY_SCORES } from '../domain/personalisation.js';
import { householdQuestion } from '../presentation/householdCopy.js';
export default function PracticeForm({ answers, onAnswer, onSubmit, onReset }) {
  return <form onSubmit={onSubmit}>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-2"><h2 className="text-2xl font-semibold">Food-management practices</h2><span className="text-sm text-stone-600">{Object.keys(answers).length} of 5 answered</span></div>
    <p className="mb-6 text-sm text-stone-600">Tell us about your household. Choose one answer for each question.</p>
    <div className="space-y-6">{INDICATORS.map(({ id, question }, index) => <fieldset key={id} className="practice-question">
      <legend className="mb-3 font-medium"><span className="mr-2 text-emerald-800">0{index + 1}</span>{householdQuestion(question)}</legend>
      <div className="grid grid-cols-3 gap-2">{Object.entries(FREQUENCY_SCORES).map(([label, score]) => <label key={label} className="frequency"><input type="radio" name={id} value={score} checked={answers[id] === score} onChange={() => onAnswer(id, score)} required /><span>{label}</span></label>)}</div>
    </fieldset>)}</div>
    <div className="mt-8 flex flex-wrap gap-3"><button className="primary" type="submit">View household guidance →</button><button className="secondary" type="button" onClick={onReset}>Start again</button></div>
  </form>;
}
