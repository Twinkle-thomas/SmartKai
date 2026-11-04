import { useEffect, useMemo, useRef, useState } from 'react';
import { defaultReminders, dueReminders, reminderCalendar, REMINDER_TASKS, REMINDER_ZONE, validateReminder, weeklySchedule, WEEKDAYS } from '../domain/reminders.js';
import { createReminderService } from '../services/reminders.js';

const displayTime = (date) => date.toLocaleString('en-NZ', { timeZone: REMINDER_ZONE, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export function downloadReminderCalendar(records) {
  const content = reminderCalendar(records);
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'smartkai-reminders.ics';
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ReminderCenter({ client, userId, route }) {
  const service = useMemo(() => createReminderService(client, userId), [client, userId]);
  const [records, setRecords] = useState([]);
  const [draft, setDraft] = useState(defaultReminders);
  const [state, setState] = useState('loading');
  const [clock, setClock] = useState(() => new Date());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState(false);
  const [setupHidden, setSetupHidden] = useState(false);
  const active = useRef(false);
  const version = useRef(0);
  const lock = useRef(false);
  const currentRoute = useRef(route);
  currentRoute.current = route;

  async function load() {
    const request = ++version.current;
    setState('loading');
    setError(''); setMessage('');
    try {
      const saved = await service.list();
      saved.forEach(validateReminder);
      if (active.current && request === version.current) {
        setRecords(saved);
        setDraft(defaultReminders().map((entry) => saved.find(({ task_key }) => task_key === entry.task_key) ?? entry));
        setState('ready');
      }
    } catch { if (active.current && request === version.current) setState('error'); }
  }
  useEffect(() => {
    active.current = true;
    if (userId) load();
    return () => { active.current = false; version.current++; };
  }, [service, userId]);
  useEffect(() => {
    if (!userId) return;
    const tick = () => setClock(new Date());
    const revisit = () => {
      tick();
      if (!document.hidden && currentRoute.current !== 'reminders' && !lock.current) load();
    };
    const timer = window.setInterval(tick, 30000);
    window.addEventListener('focus', revisit);
    document.addEventListener('visibilitychange', revisit);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', revisit); document.removeEventListener('visibilitychange', revisit); };
  }, [service, userId]);

  async function save(event) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const saved = await service.save(draft);
      if (active.current) { setRecords(saved); setDraft(saved); setState('ready'); setMessage('Your weekly reminders are saved.'); setClock(new Date()); }
    } catch { if (active.current) setError('Could not confirm your reminder changes. Check your connection and reload settings before trying again.'); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  }
  async function dismiss(taskKey) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const saved = await service.acknowledge(taskKey);
      if (active.current) setRecords((previous) => previous.map((record) => record.task_key === taskKey ? saved : record));
    } catch { if (active.current) setError('Could not dismiss this reminder. Check your connection and try again.'); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  }
  const change = (key, patch) => { setMessage(''); setDraft((previous) => previous.map((entry) => entry.task_key === key ? { ...entry, ...patch, ...(patch.enabled === false && !/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.time_of_day) ? { time_of_day: '09:00' } : {}) } : entry)); };
  const due = state === 'ready' ? dueReminders(records, clock) : [];
  const alerts = due.length > 0 && <section className="reminder-alert" aria-labelledby="routine-due-title">
    <div role="status"><p className="eyebrow">Your weekly routine</p><h2 id="routine-due-title" className="mt-2 text-xl font-semibold">A little time for food at home.</h2><p className="mt-2 text-sm">These reminders are due. Opening a tool does not mark a task as completed.</p></div>
    <ul className="mt-4 space-y-4">{due.map((record) => { const task = REMINDER_TASKS.find(({ key }) => key === record.task_key); return <li key={record.task_key}><h3 className="font-semibold">{task.label}</h3><p className="mt-1 text-sm">{task.description} Due since {displayTime(weeklySchedule(record, clock).last)} (NZ time).</p><div className="mt-3 flex flex-wrap gap-3"><a className="primary" href={task.href}>{task.action}</a><button className="secondary" disabled={busy} onClick={() => dismiss(record.task_key)} aria-label={`Dismiss ${task.label} reminder`}>Dismiss this week</button></div></li>; })}</ul>
    {error && <p role="alert" className="mt-3 text-red-800">{error}</p>}
    {route !== 'reminders' && <a className="text-link mt-4" href="#/reminders">Change reminder settings ↗</a>}
  </section>;

  if (route !== 'reminders') {
    if (!userId || !['dashboard','personalisation','account','pantry','progress','shopping','meals','tools','expiry','leftovers','storage','barcode','sharing'].includes(route)) return null;
    return <>{alerts}{state === 'ready' && records.length === 0 && !setupHidden && <section className="reminder-setup"><div><h2 className="text-lg font-semibold">When does food planning fit your week?</h2><p className="mt-2 text-sm">Choose a day off or any day that suits you for meal-planning, shopping and pantry reminders.</p></div><div className="flex flex-wrap gap-3"><a className="primary" href="#/reminders">Set up my reminders</a><button className="secondary" onClick={() => setSetupHidden(true)}>Maybe later</button></div></section>}</>;
  }
  return <>
    <div className="workspace-intro"><p className="eyebrow">Your household / Reminders</p><h1>A routine that fits.<br /><span>A nudge when you need it.</span></h1><p>Choose your day off or another convenient day and time. Each reminder repeats weekly, and you can turn it off whenever you like.</p></div>
    {!userId ? <section className="panel"><h2>Save a routine for your household</h2><p className="mt-3">Sign in to choose your reminder preferences.</p><a className="primary mt-4" href="#/login">Sign in to set reminders</a></section> : state === 'loading' ? <p role="status">Loading reminders…</p> : state === 'error' ? <section className="panel"><p role="alert">Could not load your reminder settings.</p><button className="secondary mt-4" onClick={load}>Reload reminders</button></section> : <>
      {alerts}
      <section className="panel"><h2 className="text-2xl font-semibold">Your weekly reminders</h2><p className="mt-3 text-sm">All times use New Zealand time (Pacific/Auckland), including daylight saving. Nothing is enabled until you choose and save it.</p>
        <button className="secondary mt-4" disabled={busy} onClick={load}>Reload saved settings</button>
        <form onSubmit={save} className="mt-6"><fieldset disabled={busy}><legend className="sr-only">Weekly reminder preferences</legend><div className="reminder-settings-grid">{REMINDER_TASKS.map((task) => {
          const entry = draft.find(({ task_key }) => task_key === task.key);
          return <fieldset key={task.key} className="reminder-task food-form"><legend className="text-lg font-semibold">{task.label}</legend><p className="text-sm">{task.description}</p>{task.note && <p className="text-xs text-stone-600">{task.note}</p>}
            <label className="food-checkbox"><input type="checkbox" checked={entry.enabled} onChange={(e) => change(task.key, { enabled: e.target.checked })} />Enable {task.label.toLowerCase()} reminder</label>
            <div className="food-form-pair"><label>Day for {task.label.toLowerCase()}<select disabled={!entry.enabled} value={entry.weekday} onChange={(e) => change(task.key, { weekday: Number(e.target.value) })}>{WEEKDAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label><label>Time for {task.label.toLowerCase()}<input type="time" required={entry.enabled} disabled={!entry.enabled} value={entry.time_of_day} onChange={(e) => change(task.key, { time_of_day: e.target.value })} /></label></div>
          </fieldset>;
        })}</div><button className="primary mt-6" type="submit">{busy ? 'Saving…' : 'Save reminder preferences'}</button></fieldset></form>
        <div role="status" className="mt-3">{message}</div>{error && !due.length && <p role="alert" className="mt-3 text-red-800">{error}</p>}
        <p className="mt-3 text-sm">Saving starts the routine from now. In-app alerts appear when you are using SmartKai, or when you next open an application page after a reminder is due. They are quiet visual alerts, without an alarm sound.</p>
        <button type="button" className="secondary mt-4" onClick={() => setPreview((value) => !value)}>{preview ? 'Hide preview alert' : 'Preview an alert'}</button>
        {preview && <div role="status" className="reminder-alert mt-4"><strong>Preview: Plan upcoming meals</strong><p className="mt-2">Look at the food you have and outline a few meals for the week.</p><p className="mt-2 text-sm">This is a preview. Your schedule and task history have not changed.</p></div>}
      </section>
      <section className="panel mt-6 mb-8"><h2 className="text-2xl font-semibold">Reminders on your phone calendar</h2><p className="mt-3">For reminders when SmartKai is closed, download your saved routine and import it into your calendar. Allow alerts in that calendar’s settings. Delivery depends on your calendar app and device.</p>
        <button className="primary mt-4" disabled={!records.some(({ enabled }) => enabled) || busy} onClick={() => { try { downloadReminderCalendar(records); setMessage('Calendar file downloaded. Import it into your calendar to enable calendar alerts.'); } catch { setError('Could not create the calendar file. Save an enabled reminder and try again.'); } }}>Download calendar reminders</button>
        <p className="mt-3 text-sm">Calendar entries are a separate copy. Changes here do not update imported events; edit or remove those in your calendar before importing a replacement. SmartKai does not send email or push notifications.</p>
        {records.some(({ enabled }) => enabled) && <ul className="mt-4 space-y-2 text-sm">{records.filter(({ enabled }) => enabled).map((record) => <li key={record.task_key}><strong>{REMINDER_TASKS.find(({ key }) => key === record.task_key).label}</strong>: next scheduled {displayTime(weeklySchedule(record, clock).next)} (NZ time).</li>)}</ul>}
      </section>
    </>}
  </>;
}
