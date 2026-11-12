import { supabase } from './supabase';
import { Lookup, Profile, Trip } from '../types';

const SEL = '*, officials(name), services(name)';
const flat = (t: any): Trip => ({
  ...t, no: t.trip_no, date: t.entered_date, time: (t.entered_time || '').slice(0, 5),
  official: t.officials?.name ?? '', service: t.services?.name ?? '',
});

/** Admin: all trips (paged, Supabase caps a request at 1000 rows). Entry user: own latest 30 (RLS enforces this). */
export async function loadTrips(admin: boolean): Promise<Trip[]> {
  let all: any[] = [];
  if (admin) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from('trips').select(SEL).order('id').range(from, from + 999);
      if (error) throw error;
      all = all.concat(data ?? []);
      if (!data || data.length < 1000) break;
    }
  } else {
    const { data, error } = await supabase.from('trips').select(SEL).order('created_at', { ascending: false }).limit(30);
    if (error) throw error;
    all = data ?? [];
  }
  return all.map(flat);
}

export async function loadLookups(): Promise<{ officials: Lookup[]; services: Lookup[] }> {
  const [o, s] = await Promise.all([
    supabase.from('officials').select('*').order('name'),
    supabase.from('services').select('*').order('name'),
  ]);
  return { officials: (o.data ?? []) as Lookup[], services: (s.data ?? []) as Lookup[] };
}

export async function loadProfiles(): Promise<Profile[]> {
  const { data } = await supabase.from('profiles').select('*').order('created_at');
  return (data ?? []) as Profile[];
}
