import { Filters, Trip } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hhmm = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const fmt = (n: number) => String(Math.round((n || 0) * 10) / 10).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export const sum = (a: Trip[]) => a.reduce((s, t) => s + (+t.count || 0), 0);

export function groupBy<T>(a: T[], fn: (t: T) => string): Record<string, T[]> {
  const m: Record<string, T[]> = {};
  a.forEach((t) => { (m[fn(t)] = m[fn(t)] || []).push(t); });
  return m;
}

export function groupKey(date: string, grp: Filters['grp']) {
  if (grp === 'month') return date.slice(0, 7);
  if (grp === 'week') { const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() - d.getDay()); return ymd(d); }
  return date;
}

export function filterTrips(a: Trip[], f: Filters) {
  return a.filter((t) =>
    (!f.from || t.date >= f.from) && (!f.to || t.date <= f.to) &&
    (!f.off || t.official === f.off) && (!f.svc || t.service === f.svc) &&
    (!f.q || (t.no + ' ' + t.official).includes(f.q)));
}

export function toCsv(a: Trip[]) {
  const q = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const head = ['رقم الرحلة', 'التاريخ', 'الوقت', 'المسؤول', 'الخدمة', 'عدد المستفيدين', 'ملاحظات', 'تاريخ التسجيل'];
  const rows = a.map((t) => [t.no, t.date, t.time, t.official, t.service, t.count, t.notes, t.created_at].map(q).join(','));
  return '\ufeff' + [head.map(q).join(','), ...rows].join('\r\n');
}
