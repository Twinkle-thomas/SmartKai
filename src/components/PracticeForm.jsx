import { INDICATORS, FREQUENCY_SCORES } from '../domain/personalisation.js';
import { householdQuestion } from '../presentation/householdCopy.js';
import {useRef,useState} from 'react';
export default function PracticeForm({ answers, onAnswer, onSubmit, onReset }) {
  const [attempted,setAttempted]=useState(false);
  const summary=useRef(null),form=useRef(null);
  const missing=INDICATORS.filter(({id})=>!Object.hasOwn(answers,id));
  function submit(event){event.preventDefault();if(missing.length){setAttempted(true);queueMicrotask(()=>summary.current?.focus());return;}setAttempted(false);onSubmit(event);}
  function focusQuestion(id){form.current?.querySelector(`input[name="${id}"]`)?.focus();}
  return <form ref={form} noValidate onSubmit={submit}>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-2"><h2 className="text-2xl font-semibold">Food-management practices</h2><span className="text-sm text-stone-600">{Object.keys(answers).length} of 5 answered</span></div>
    <p className="mb-6 text-sm text-stone-600">Tell us about your household. Choose one answer for each question.</p>
    {attempted&&missing.length>0&&<div ref={summary} tabIndex={-1} role="alert" className="auth-error mb-6"><p className="font-semibold">Please answer all five questions before viewing your guidance.</p><p>{missing.length} {missing.length===1?'question needs':'questions need'} an answer.</p><ul className="mt-2 space-y-2">{missing.map(({id,question})=><li key={id}><button type="button" className="underline text-left" onClick={()=>focusQuestion(id)}>{householdQuestion(question)}</button></li>)}</ul></div>}
    <div className="space-y-6">{INDICATORS.map(({ id, question }, index) => <fieldset key={id} className="practice-question" aria-describedby={attempted&&!Object.hasOwn(answers,id)?`${id}-required`:undefined}>
      <legend className="mb-3 font-medium"><span className="mr-2 text-emerald-800">0{index + 1}</span>{householdQuestion(question)}</legend>
      <div className="grid grid-cols-3 gap-2">{Object.entries(FREQUENCY_SCORES).map(([label, score]) => <label key={label} className="frequency"><input type="radio" name={id} value={score} checked={answers[id] === score} onChange={() => onAnswer(id, score)} required /><span>{label}</span></label>)}</div>
      {attempted&&!Object.hasOwn(answers,id)&&<p id={`${id}-required`} className="mt-2 text-sm text-red-800">Choose Never, Sometimes or Often.</p>}
    </fieldset>)}</div>
    <div className="mt-8 flex flex-wrap gap-3"><button className="primary" type="submit">View household guidance →</button><button className="secondary" type="button" onClick={()=>{setAttempted(false);onReset();}}>Start again</button></div>
  </form>;
}
