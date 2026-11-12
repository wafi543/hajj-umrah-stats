import React, { useState } from 'react';
import { Alert, Share, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { Lookup, Profile, Trip } from '../types';
import { Btn, Card, Field, H, T } from '../ui';

type Props = { officials: Lookup[]; services: Lookup[]; users: Profile[]; me: Profile; trips: Trip[]; onChanged: () => Promise<void> };

function LookupEditor({ table, title, items, onChanged }: { table: 'officials' | 'services'; title: string; items: Lookup[]; onChanged: () => Promise<void> }) {
  const [name, setName] = useState('');
  const add = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from(table).insert({ name: name.trim() });
    if (error) return Alert.alert(error.code === '23505' ? 'الاسم موجود مسبقاً.' : 'تعذّرت الإضافة');
    setName(''); await onChanged();
  };
  const toggle = async (i: Lookup) => { await supabase.from(table).update({ active: !i.active }).eq('id', i.id); await onChanged(); };
  return (
    <Card>
      <H>{title}</H>
      {items.map((i) => (
        <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T mu={!i.active}>{i.name}</T>
          <Btn kind="o" title={i.active ? 'إيقاف' : 'تفعيل'} onPress={() => toggle(i)} />
        </View>
      ))}
      <Field label="إضافة جديد" value={name} onChangeText={setName} />
      <Btn title="إضافة" onPress={add} />
      <T mu>الإيقاف يخفي الاسم من النموذج دون حذف رحلاته السابقة.</T>
    </Card>
  );
}

export default function SettingsScreen({ officials, services, users, me, trips, onChanged }: Props) {
  const flip = (u: Profile) => Alert.alert('تغيير الصلاحية', u.email ?? '', [
    { text: 'إلغاء', style: 'cancel' },
    { text: 'تأكيد', onPress: async () => { await supabase.from('profiles').update({ role: u.role === 'admin' ? 'entry' : 'admin' }).eq('id', u.id); await onChanged(); } },
  ]);
  const backup = () => Share.share({ title: 'backup.json', message: JSON.stringify({ exportedAt: new Date().toISOString(), officials, services, trips: trips.map(({ official, service, ...t }) => t) }) });
  return (
    <View>
      <LookupEditor table="officials" title="المسؤولون عن الرحلات" items={officials} onChanged={onChanged} />
      <LookupEditor table="services" title="الخدمات المقدمة" items={services} onChanged={onChanged} />
      <Card>
        <H>المستخدمون</H>
        {users.map((u) => (
          <View key={u.id} style={{ marginBottom: 6 }}>
            <T>{`${u.email} — ${u.role === 'admin' ? 'مدير' : 'مدخل بيانات'}`}</T>
            {u.id !== me.id && <Btn kind="o" title={u.role === 'admin' ? 'خفض إلى مدخل بيانات' : 'ترقية إلى مدير'} onPress={() => flip(u)} />}
          </View>
        ))}
        <T mu>لإضافة مستخدم: Supabase ← Authentication ← Users ← Add user (مع Auto Confirm).</T>
      </Card>
      <Card><H>نسخة احتياطية</H><Btn kind="o" title="مشاركة نسخة JSON" onPress={backup} /></Card>
    </View>
  );
}
