import { useEffect, useRef, useState } from 'react';
import { personalise } from './domain/personalisation.js';
import { SCENARIOS } from './data/scenarios.js';
import PracticeForm from './components/PracticeForm.jsx';
import Results from './components/Results.jsx';
import EvaluatorStorage from './components/EvaluatorStorage.jsx';
export default function App({ client = null }) {
  const [answers, setAnswers] = useState({});
  const [scenarioId, setScenarioId] = useState('');
  const [result, setResult] = useState(null);
  const resultHeading = useRef(null);
  useEffect(() => { if (result) resultHeading.current?.focus(); }, [result]);
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
  return <>
    <a href="#main" className="skip-link">Skip to content</a>
    <header className="border-b border-stone-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5"><a href="./" className="text-2xl font-bold tracking-tight text-emerald-950">SmartKai<span className="text-emerald-600">.</span></a><span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium">Academic prototype · NZ</span></div></header>
    <main id="main" className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <p className="eyebrow">Small practices. Thoughtful guidance.</p><h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Explore a household’s<br className="hidden sm:block" /> food-management habits.</h1><p className="mt-5 max-w-2xl text-lg text-stone-600">Try fictional household practices and see how transparent rules generate food-waste prevention guidance.</p>
      <aside className="my-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950" aria-label="Research limitations"><strong>Fictional data only.</strong> Do not enter real participant information. Profiles and thresholds are provisional, not statistically validated. This prototype does not demonstrate a reduction in actual household food waste.</aside>
      <div className="grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="panel" aria-label="Explore practices"><p className="eyebrow">01 / Explore practices</p>
          <div className="my-6 rounded-xl bg-stone-50 p-4"><label htmlFor="scenario" className="mb-2 block font-medium">Try a fictional test scenario</label><select id="scenario" value={scenarioId} onChange={loadScenario} className="w-full rounded-lg border border-stone-300 bg-white p-3 text-sm"><option value="">Custom fictional household — start blank</option>{SCENARIOS.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.label} · {scenario.id.replaceAll('-', ' ')}</option>)}</select><p className="mt-2 text-xs text-stone-600">Loading a scenario fills all five answers. You can change them before viewing guidance.</p></div>
          <PracticeForm answers={answers} onAnswer={answer} onSubmit={submit} onReset={reset} />
        </section>
        <div className="space-y-6"><Results result={result} ref={resultHeading} /><aside className="rounded-2xl bg-emerald-950 p-6 text-emerald-50"><h2 className="text-lg font-semibold">Simple, visible rules</h2><p className="mt-3 text-sm leading-relaxed">Never = 0 · Sometimes = 1 · Often = 2</p><p className="mt-3 text-sm leading-relaxed">A score of 2 assigns the corresponding profile. Multiple profiles can apply. If none scores 2, general guidance is shown.</p></aside></div>
      </div>
      <EvaluatorStorage client={client} assessment={result} />
    </main>
    <footer className="mx-auto max-w-6xl border-t border-stone-200 px-5 py-6 text-xs leading-relaxed text-stone-600">SmartKai · Master's Information Technology research project<br />Auckland Institute of Studies, New Zealand · Fictional assessments are saved only when you choose Save assessment.</footer>
  </>;
}
