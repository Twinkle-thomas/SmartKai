import { foodDateStatus } from '../domain/foodDates.js';
export default function FoodDateBadge({ item, now = new Date(), horizon = 3 }) {
  const status = foodDateStatus(item, now, horizon);
  return <p className={`date-badge date-${status.key}`}><strong>{status.label}</strong>{status.days<0&&<span> · {Math.abs(status.days)} days ago</span>}{status.key === 'passed' && <span className="block mt-1 text-xs">{item.date_type === 'Use by' ? 'Do not eat food past its use-by date.' : 'Best-before relates to quality. Check packaging and suitability; this is not a safety clearance.'}</span>}</p>;
}
