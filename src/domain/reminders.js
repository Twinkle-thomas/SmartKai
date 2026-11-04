export const REMINDER_ZONE = 'Pacific/Auckland';
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const REMINDER_TASKS = [
  { key: 'meal-planning', label: 'Plan upcoming meals', description: 'Look at the food you have and outline a few meals for the week.', href: '#/meals', action: 'Open meal planner' },
  { key: 'shopping', label: 'Prepare for shopping', description: 'Check your fridge and pantry before deciding what to buy.', href: '#/shopping', action: 'Open shopping list' },
  { key: 'pantry', label: 'Check use-first food', description: 'Review your use-first items and their packaging instructions.', href: '#/pantry/use-first', action: 'Open use-first food' },
  { key: 'leftovers', label: 'Review leftovers', description: 'Review your leftovers and consider how to use suitable food.', href: '#/leftovers', action: 'Open leftovers' },
];
export const defaultReminders = () => REMINDER_TASKS.map(({ key }) => ({ task_key: key, enabled: false, weekday: 0, time_of_day: '09:00', time_zone: REMINDER_ZONE }));

export function validateReminder(value) {
  if (!REMINDER_TASKS.some(({ key }) => key === value.task_key)) throw new Error('Choose a recognised reminder task.');
  if (typeof value.enabled !== 'boolean') throw new Error('Choose whether this reminder is enabled.');
  if (!Number.isInteger(value.weekday) || value.weekday < 0 || value.weekday > 6) throw new Error('Choose a weekday.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time_of_day)) throw new Error('Choose a valid reminder time.');
  if (value.time_zone !== REMINDER_ZONE) throw new Error('This prototype uses Pacific/Auckland time.');
  return { task_key: value.task_key, enabled: value.enabled, weekday: value.weekday, time_of_day: value.time_of_day, time_zone: REMINDER_ZONE };
}

const DAY = 86400000;
const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: REMINDER_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
function parts(date) {
  return Object.fromEntries(formatter.formatToParts(date).filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, Number(value)]));
}

// Auckland's current standard/daylight offsets are +12/+13. Compare wall-clock
// candidates to retain weekly local time across DST. A missing spring-forward
// time shifts forward one hour; a repeated autumn time uses the first occurrence.
function wallTime(day, time) {
  const [hour, minute] = time.split(':').map(Number);
  const target = new Date(day);
  const desired = hour * 60 + minute;
  const candidates = [13, 12].map((offset) => new Date(day + desired * 60000 - offset * 3600000));
  const sameDay = (p) => p.year === target.getUTCFullYear() && p.month === target.getUTCMonth() + 1 && p.day === target.getUTCDate();
  const exact = candidates.filter((date) => { const p = parts(date); return sameDay(p) && p.hour * 60 + p.minute === desired; });
  if (exact.length) return exact[0];
  return candidates.find((date) => { const p = parts(date); return sameDay(p) && p.hour * 60 + p.minute > desired; });
}

export function weeklySchedule(value, now = new Date()) {
  const reminder = validateReminder(value);
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid reminder clock.');
  const p = parts(now);
  const today = Date.UTC(p.year, p.month - 1, p.day);
  const daysBack = (new Date(today).getUTCDay() - reminder.weekday + 7) % 7;
  let day = today - daysBack * DAY;
  let last = wallTime(day, reminder.time_of_day);
  if (last > now) { day -= 7 * DAY; last = wallTime(day, reminder.time_of_day); }
  const next = wallTime(day + 7 * DAY, reminder.time_of_day);
  const starts = Date.parse(value.starts_at ?? '');
  const acknowledged = Date.parse(value.last_acknowledged_at ?? '');
  const due = reminder.enabled && Number.isFinite(starts) && last.getTime() >= starts && (!Number.isFinite(acknowledged) || last.getTime() > acknowledged);
  return { last, next, due };
}

export function dueReminders(records, now = new Date()) {
  return records.filter((record) => weeklySchedule(record, now).due);
}

const stamp = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const escapeText = (value) => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
function localStamp(date, time) {
  const p = parts(date);
  return `${p.year}${String(p.month).padStart(2, '0')}${String(p.day).padStart(2, '0')}T${time.replace(':', '')}00`;
}

export function reminderCalendar(records, now = new Date(), uid = () => crypto.randomUUID()) {
  const enabled = records.map(validateReminder).filter(({ enabled }) => enabled);
  if (!enabled.length) throw new Error('Enable and save at least one reminder first.');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SmartKai//Weekly reminders//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VTIMEZONE', 'TZID:Pacific/Auckland',
    'BEGIN:STANDARD', 'DTSTART:20080406T030000', 'TZOFFSETFROM:+1300', 'TZOFFSETTO:+1200', 'RRULE:FREQ=YEARLY;BYMONTH=4;BYDAY=1SU', 'END:STANDARD',
    'BEGIN:DAYLIGHT', 'DTSTART:20070930T020000', 'TZOFFSETFROM:+1200', 'TZOFFSETTO:+1300', 'RRULE:FREQ=YEARLY;BYMONTH=9;BYDAY=-1SU', 'END:DAYLIGHT', 'END:VTIMEZONE'];
  for (const record of enabled) {
    const task = REMINDER_TASKS.find(({ key }) => key === record.task_key);
    const { next } = weeklySchedule(record, now);
    lines.push('BEGIN:VEVENT', `UID:${uid()}@smartkai.local`, `DTSTAMP:${stamp(now)}`, `DTSTART;TZID=Pacific/Auckland:${localStamp(next, record.time_of_day)}`, 'DURATION:PT15M', `RRULE:FREQ=WEEKLY;BYDAY=${['SU','MO','TU','WE','TH','FR','SA'][record.weekday]}`, `SUMMARY:${escapeText(`SmartKai: ${task.label}`)}`, `DESCRIPTION:${escapeText(task.description)}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0S', `DESCRIPTION:${escapeText(task.label)}`, 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  // Fold at <=75 UTF-8 octets (all generated content above is ASCII).
  return lines.flatMap((line) => { const chunks = []; while (line.length > 74) { chunks.push(line.slice(0, 74)); line = ` ${line.slice(74)}`; } chunks.push(line); return chunks; }).join('\r\n') + '\r\n';
}
