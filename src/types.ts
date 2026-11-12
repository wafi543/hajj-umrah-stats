export type Lookup = { id: number; name: string; active: boolean };
export type Profile = { id: string; email: string | null; full_name: string | null; role: 'admin' | 'entry' };
export type Trip = {
  id: number; no: string; count: number; official_id: number; service_id: number;
  date: string; time: string; official: string; service: string; notes: string | null; created_at: string;
};
export type Filters = {
  from: string; to: string; off: string; svc: string; q: string;
  grp: 'day' | 'week' | 'month'; met: 'ben' | 'trips'; sort: 'date' | 'count' | 'no';
};
