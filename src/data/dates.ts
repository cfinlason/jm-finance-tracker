const pad = (n: number) => String(n).padStart(2, '0');
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());
export const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const monthKey = (d: Date | string) => (typeof d === 'string' ? d.slice(0, 7) : `${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
export const currentMonth = () => monthKey(new Date());
export const addMonths = (key: string, delta: number) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
};
export const daysInMonth = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};
export const monthLabel = (key: string, short = false) => {
  const [y, m] = key.split('-').map(Number);
  return short ? MONTHS[m - 1].slice(0, 3) : `${MONTHS[m - 1]} ${y}`;
};
export const dateInMonth = (key: string, day: number) => `${key}-${pad(Math.min(Math.max(day, 1), daysInMonth(key)))}`;
export const addDays = (iso: string, n: number) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const diffDays = (a: string, b: string) => Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / 86400000);

export function prettyDate(iso: string): string {
  const diff = diffDays(todayISO(), iso);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  const d = fromISO(iso);
  return `${DOW[d.getDay()]}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}
export const shortDate = (iso: string) => {
  const d = fromISO(iso);
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
};
export const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
export const timeLabel = (h: number, m: number) => {
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${pad(m)} ${ap}`;
};
export function greeting(): string {
  const h = new Date().getHours();
  return h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
