import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import { loadLookups, loadProfiles, loadTrips } from './src/lib/data';
import { Filters, Lookup, Profile, Trip } from './src/types';
import { C, Msg } from './src/ui';
import LoginScreen from './src/screens/LoginScreen';
import EntryScreen from './src/screens/EntryScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import LogScreen from './src/screens/LogScreen';
import SettingsScreen from './src/screens/SettingsScreen';

type Tab = 'dash' | 'log' | 'entry' | 'set';
const TABS: [Tab, string][] = [['dash', 'لوحة التحكم'], ['log', 'السجل'], ['entry', 'تسجيل'], ['set', 'الإعدادات']];
const F0: Filters = { from: '', to: '', off: '', svc: '', q: '', grp: 'day', met: 'ben', sort: 'date' };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<Profile | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [officials, setOfficials] = useState<Lookup[]>([]);
  const [services, setServices] = useState<Lookup[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [tab, setTab] = useState<Tab>('entry');
  const [editing, setEditing] = useState<Trip | null>(null);
  const [f, setFs] = useState<Filters>(F0);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const setF = (p: Partial<Filters>) => setFs((x) => ({ ...x, ...p }));
  const admin = me?.role === 'admin';

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const reload = useCallback(async (profile?: Profile | null) => {
    const p = profile ?? me; if (!p) return;
    try {
      const [l, t] = await Promise.all([loadLookups(), loadTrips(p.role === 'admin')]);
      setOfficials(l.officials); setServices(l.services); setTrips(t);
      if (p.role === 'admin') setUsers(await loadProfiles());
      setError('');
    } catch (e: any) { setError(e.message ?? 'تعذّر تحميل البيانات'); }
  }, [me]);

  useEffect(() => {
    if (!session) { setMe(null); setTrips([]); return; }
    (async () => {
      const { data, error: e } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      if (e || !data) return setError('تعذّر تحميل ملف المستخدم.');
      const p = data as Profile; setMe(p); setTab(p.role === 'admin' ? 'dash' : 'entry'); await reload(p);
    })();
  }, [session]);

  useEffect(() => {
    if (!me) return;
    const ch = supabase.channel('trips-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => { clearTimeout(timer.current); timer.current = setTimeout(() => reload(), 400); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me, reload]);

  if (!ready) return <ActivityIndicator style={{ marginTop: 80 }} color={C.g} />;
  const go = (t: Tab) => { setEditing(null); setTab(t); };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <StatusBar barStyle="dark-content" />
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 3, borderBottomColor: C.gold }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.g }}>🕋 إحصائيات رحلات ضيوف الرحمن</Text>
            {me && <Text style={{ color: C.mu, fontSize: 12 }}>{admin ? 'المدير' : 'مدخل بيانات'}</Text>}
          </View>
          {session && <Pressable onPress={() => supabase.auth.signOut()}><Text style={{ color: C.g }}>خروج</Text></Pressable>}
        </View>
        {!session ? <LoginScreen /> : (
          <>
            <ScrollView contentContainerStyle={{ padding: 12 }} keyboardShouldPersistTaps="handled">
              {!!error && <Msg kind="er">{error}</Msg>}
              {!me ? <ActivityIndicator color={C.g} /> :
                tab === 'dash' && admin ? <DashboardScreen trips={trips} officials={officials} services={services} f={f} setF={setF} /> :
                tab === 'log' && admin ? <LogScreen trips={trips} officials={officials} services={services} f={f} setF={setF} onEdit={(t) => { setEditing(t); setTab('entry'); }} onChanged={() => reload()} /> :
                tab === 'set' && admin ? <SettingsScreen officials={officials} services={services} users={users} me={me} trips={trips} onChanged={() => reload()} /> :
                <EntryScreen key={editing?.id ?? 'new'} admin={!!admin} officials={officials} services={services} trips={trips} editing={editing}
                  onSaved={async () => { await reload(); if (editing) go('log'); }} />}
            </ScrollView>
            {admin && (
              <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.bd }}>
                {TABS.map(([k, l]) => (
                  <Pressable key={k} onPress={() => go(k)} style={{ flex: 1, padding: 12, alignItems: 'center', backgroundColor: tab === k ? C.g : C.bg }}>
                    <Text style={{ color: tab === k ? '#fff' : C.tx, fontSize: 13 }}>{l}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
