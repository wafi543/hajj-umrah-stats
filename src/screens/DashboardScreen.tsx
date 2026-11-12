import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { filterTrips, fmt, groupBy, groupKey, sum, ymd } from '../lib/stats';
import { Filters, Lookup, Trip } from '../types';
import { C, Card, Chips, Field, H, Kpi, T } from '../ui';

type Props = { trips: Trip[]; officials: Lookup[]; services: Lookup[]; f: Filters; setF: (p: Partial<Filters>) => void };

export function FilterCard({ officials, services, f, setF }: Omit<Props, 'trips'>) {
  const nm = (a: Lookup[]) => a.map((x) => ({ id: x.name, name: x.name }));
  return (
    <Card>
      <Field label="من تاريخ (YYYY-MM-DD)" value={f.from} onChangeText={(v) => setF({ from: v })} keyboardType="numbers-and-punctuation" />
      <Field label="إلى تاريخ (YYYY-MM-DD)" value={f.to} onChangeText={(v) => setF({ to: v })} keyboardType="numbers-and-punctuation" />
      <T mu>المسؤول</T><Chips items={nm(officials)} all="الكل" value={f.off} onChange={(v) => setF({ off: v })} />
      <T mu>الخدمة</T><Chips items={nm(services)} all="الكل" value={f.svc} onChange={(v) => setF({ svc: v })} />
    </Card>
  );
}

export default function DashboardScreen({ trips, officials, services, f, setF }: Props) {
  const td = ymd(), mo = td.slice(0, 7), F = filterTrips(trips, f);
  const tt = trips.filter((t) => t.date === td), tmo = trips.filter((t) => t.date.slice(0, 7) === mo);
  const g = groupBy(F, (t) => groupKey(t.date, f.grp));
  const keys = Object.keys(g).sort();
  const val = (k: string) => (f.met === 'ben' ? sum(g[k]) : g[k].length);
  const mx = Math.max(1, ...keys.map(val));
  const best = keys.length ? keys.reduce((a, b) => (val(a) >= val(b) ? a : b)) : null;
  const offs = Object.entries(groupBy(F, (t) => t.official)).sort((a, b) => sum(b[1]) - sum(a[1]));
  const svcs = Object.entries(groupBy(F, (t) => t.service)).sort((a, b) => sum(b[1]) - sum(a[1]));
  const totB = sum(F);
  const smx = Math.max(1, ...svcs.map(([, a]) => sum(a)));

  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <Kpi v={fmt(trips.length)} l="إجمالي الرحلات" />
        <Kpi v={fmt(sum(trips))} l="إجمالي المستفيدين" />
        <Kpi v={fmt(tt.length)} l="رحلات اليوم" />
        <Kpi v={fmt(sum(tt))} l="مستفيدو اليوم" />
        <Kpi v={fmt(tmo.length)} l="رحلات هذا الشهر" />
        <Kpi v={trips.length ? fmt(sum(trips) / trips.length) : '0'} l="متوسط المستفيدين لكل رحلة" />
      </View>
      <FilterCard officials={officials} services={services} f={f} setF={setF} />
      <Card>
        <H>التحليل الزمني</H>
        <Chips items={[{ id: 'day', name: 'يومي' }, { id: 'week', name: 'أسبوعي' }, { id: 'month', name: 'شهري' }]} value={f.grp} onChange={(v) => setF({ grp: v })} />
        <Chips items={[{ id: 'ben', name: 'المستفيدون' }, { id: 'trips', name: 'الرحلات' }]} value={f.met} onChange={(v) => setF({ met: v })} />
        {keys.length ? (
          <ScrollView horizontal style={{ marginTop: 10 }} contentContainerStyle={{ alignItems: 'flex-end', gap: 6, height: 150, paddingTop: 16 }}>
            {keys.slice(-40).map((k) => (
              <View key={k} style={{ alignItems: 'center', width: 44 }}>
                <Text style={{ fontSize: 11, color: C.mu }}>{fmt(val(k))}</Text>
                <View style={{ width: 22, height: (val(k) / mx) * 90 + 2, backgroundColor: C.g, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
                <Text style={{ fontSize: 10, color: C.mu }}>{f.grp === 'month' ? k : k.slice(5)}</Text>
              </View>
            ))}
          </ScrollView>
        ) : <T mu>لا توجد بيانات ضمن الفترة المختارة.</T>}
        {best && <T mu>{`الأعلى أداءً: ${best} (${fmt(val(best))})`}</T>}
      </Card>
      <Card>
        <H>تحليل المسؤولين</H>
        {offs.length === 0 && <T mu>لا توجد بيانات</T>}
        {offs.map(([n, a]) => <T key={n}>{`${n}: ${fmt(a.length)} رحلة — ${fmt(sum(a))} مستفيد — متوسط ${fmt(sum(a) / a.length)} — ${fmt((a.length / F.length) * 100)}%`}</T>)}
      </Card>
      <Card>
        <H>تحليل الخدمات</H>
        {svcs.length === 0 && <T mu>لا توجد بيانات</T>}
        {svcs.map(([n, a]) => (
          <View key={n} style={{ marginBottom: 8 }}>
            <T>{`${n}: ${fmt(a.length)} رحلة — ${fmt(sum(a))} مستفيد — ${fmt((sum(a) / totB) * 100)}%`}</T>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: C.gold, width: `${(sum(a) / smx) * 100}%`, marginTop: 3 }} />
          </View>
        ))}
      </Card>
    </View>
  );
}
