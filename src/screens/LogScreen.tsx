import React from 'react';
import { Alert, Share, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { filterTrips, fmt, toCsv } from '../lib/stats';
import { Filters, Lookup, Trip } from '../types';
import { Btn, Card, Chips, Field, T } from '../ui';
import { FilterCard } from './DashboardScreen';

type Props = { trips: Trip[]; officials: Lookup[]; services: Lookup[]; f: Filters; setF: (p: Partial<Filters>) => void; onEdit: (t: Trip) => void; onChanged: () => Promise<void> };

export default function LogScreen({ trips, officials, services, f, setF, onEdit, onChanged }: Props) {
  const rows = filterTrips(trips, f).sort((a, b) =>
    f.sort === 'count' ? b.count - a.count : f.sort === 'no' ? a.no.localeCompare(b.no) : (b.date + b.time).localeCompare(a.date + a.time));

  const del = (t: Trip) => Alert.alert('حذف الرحلة', `حذف ${t.no}؟ لا يمكن التراجع.`, [
    { text: 'إلغاء', style: 'cancel' },
    { text: 'حذف', style: 'destructive', onPress: async () => {
      const { error } = await supabase.from('trips').delete().eq('id', t.id);
      if (error) Alert.alert('تعذّر الحذف'); else await onChanged();
    } },
  ]);
  // v1 export shares CSV as text. TODO: write a real .csv with expo-file-system + expo-sharing.
  const exportCsv = () => Share.share({ title: 'trips.csv', message: toCsv(rows) });

  return (
    <View>
      <FilterCard officials={officials} services={services} f={f} setF={setF} />
      <Card>
        <Field label="بحث برقم الرحلة أو اسم المسؤول" value={f.q} onChangeText={(v) => setF({ q: v })} />
        <Chips items={[{ id: 'date', name: 'الأحدث' }, { id: 'count', name: 'الأكثر مستفيدين' }, { id: 'no', name: 'رقم الرحلة' }]} value={f.sort} onChange={(v) => setF({ sort: v })} />
        <Btn kind="o" title={`تصدير (${rows.length}) سجل CSV`} onPress={exportCsv} />
      </Card>
      {/* TODO: switch to FlatList for very large logs */}
      {rows.slice(0, 200).map((t) => (
        <Card key={t.id}>
          <T bold>{`${t.no} — ${fmt(t.count)} مستفيد`}</T>
          <T mu>{`${t.date} ${t.time} — ${t.official} — ${t.service}`}</T>
          {!!t.notes && <T mu>{t.notes}</T>}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn kind="o" title="تعديل" onPress={() => onEdit(t)} />
            <Btn kind="d" title="حذف" onPress={() => del(t)} />
          </View>
        </Card>
      ))}
      {rows.length > 200 && <T mu>{`يُعرض أول 200 سجل من ${rows.length}. استخدم الفلاتر.`}</T>}
      {rows.length === 0 && <T mu>لا توجد سجلات.</T>}
    </View>
  );
}
