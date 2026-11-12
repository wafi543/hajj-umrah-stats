import React, { useState } from 'react';
import { Alert, Share, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { Lookup, Profile, Trip } from '../types';
import { Btn, Card, Field, H, Msg, T } from '../ui';

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
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [userMessage, setUserMessage] = useState<{ text: string; error: boolean } | null>(null);
  const addUser = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !newPassword) {
      setUserMessage({ text: 'أدخل البريد الإلكتروني وكلمة المرور.', error: true });
      return;
    }
    if (newPassword.length < 8) {
      setUserMessage({ text: 'يجب ألا تقل كلمة المرور عن ٨ أحرف.', error: true });
      return;
    }
    setCreating(true);
    setUserMessage(null);
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: { email, password: newPassword, full_name: newName.trim() },
    });
    setCreating(false);
    if (error || data?.error) {
      let message = data?.error as string | undefined;
      if (!message && error?.context && typeof error.context.json === 'function') {
        try { message = (await error.context.json())?.error; } catch { /* response has no JSON error body */ }
      }
      setUserMessage({ text: message ?? 'تعذّرت إضافة المستخدم. تحقق من إعداد خدمة إدارة المستخدمين.', error: true });
      return;
    }
    setNewEmail(''); setNewName(''); setNewPassword('');
    setUserMessage({ text: 'تم إنشاء المستخدم وتأكيد بريده الإلكتروني. صلاحيتُه مدخل بيانات.', error: false });
    await onChanged();
  };
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
        <T mu>أنشئ حسابًا جديدًا بصلاحية مدخل بيانات. يمكن ترقية الصلاحية من القائمة أدناه.</T>
        <Field label="الاسم" value={newName} onChangeText={setNewName} autoComplete="name" />
        <Field label="البريد الإلكتروني" value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label="كلمة المرور (٨ أحرف على الأقل)" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoCapitalize="none" />
        <Btn title={creating ? 'جارٍ إنشاء الحساب…' : 'إضافة مستخدم'} onPress={addUser} disabled={creating} />
        {userMessage && <Msg kind={userMessage.error ? 'er' : 'ok'}>{userMessage.text}</Msg>}
        {users.map((u) => (
          <View key={u.id} style={{ marginBottom: 6 }}>
            <T>{`${u.email} — ${u.role === 'admin' ? 'مدير' : 'مدخل بيانات'}`}</T>
            {u.id !== me.id && <Btn kind="o" title={u.role === 'admin' ? 'خفض إلى مدخل بيانات' : 'ترقية إلى مدير'} onPress={() => flip(u)} />}
          </View>
        ))}
      </Card>
      <Card><H>نسخة احتياطية</H><Btn kind="o" title="مشاركة نسخة JSON" onPress={backup} /></Card>
    </View>
  );
}
