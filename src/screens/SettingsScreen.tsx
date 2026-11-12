import React, { useState } from 'react';
import { Alert, Share, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { Lookup, Profile, Trip } from '../types';
import { Btn, Card, Field, H, Msg, T } from '../ui';

type Props = { officials: Lookup[]; services: Lookup[]; users: Profile[]; me: Profile; trips: Trip[]; onChanged: () => Promise<void> };

function LookupEditor({ table, title, items, onChanged }: { table: 'officials' | 'services'; title: string; items: Lookup[]; onChanged: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const add = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from(table).insert({ name: name.trim() });
    if (error) return Alert.alert(error.code === '23505' ? 'الاسم موجود مسبقاً.' : 'تعذّرت الإضافة');
    setName(''); await onChanged();
  };
  const toggle = async (i: Lookup) => { await supabase.from(table).update({ active: !i.active }).eq('id', i.id); await onChanged(); };
  const startEditing = (i: Lookup) => { setEditingId(i.id); setEditingName(i.name); };
  const saveName = async (i: Lookup) => {
    const nextName = editingName.trim();
    if (!nextName) {
      Alert.alert('الاسم مطلوب', 'أدخل اسم المسؤول قبل الحفظ.');
      return;
    }
    if (nextName === i.name) { setEditingId(null); return; }
    setSavingId(i.id);
    const { error } = await supabase.from(table).update({ name: nextName }).eq('id', i.id);
    setSavingId(null);
    if (error) {
      Alert.alert(error.code === '23505' ? 'الاسم مستخدم مسبقاً' : 'تعذّر تعديل الاسم', error.code === '23505' ? 'اختر اسماً مختلفاً.' : 'تحقق من الاتصال ثم حاول مجدداً.');
      return;
    }
    setEditingId(null);
    await onChanged();
  };
  return (
    <Card>
      <H>{title}</H>
      {items.map((i) => (
        <View key={i.id} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {editingId === i.id
              ? <View style={{ flex: 1 }}><Field label="اسم المسؤول" value={editingName} onChangeText={setEditingName} /></View>
              : <View style={{ flex: 1 }}><T mu={!i.active}>{i.name}</T></View>}
            {editingId === i.id ? <>
              <Btn kind="o" title={savingId === i.id ? 'جارٍ الحفظ…' : 'حفظ'} disabled={savingId === i.id} onPress={() => saveName(i)} />
              <Btn kind="o" title="إلغاء" disabled={savingId === i.id} onPress={() => setEditingId(null)} />
            </> : <>
              {table === 'officials' && <Btn kind="o" title="تعديل الاسم" onPress={() => startEditing(i)} />}
              <Btn kind="o" title={i.active ? 'إيقاف' : 'تفعيل'} onPress={() => toggle(i)} />
            </>}
          </View>
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
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
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
  const removeUser = (u: Profile) => Alert.alert('حذف المستخدم', `هل تريد حذف حساب ${u.email ?? 'هذا المستخدم'}؟ لا يمكن التراجع عن هذا الإجراء.`, [
    { text: 'إلغاء', style: 'cancel' },
    { text: 'حذف', style: 'destructive', onPress: async () => {
      setDeletingUserId(u.id);
      try {
        const { data, error } = await supabase.functions.invoke('admin-delete-user', { body: { user_id: u.id } });
        if (error || data?.error) {
          let message = data?.error as string | undefined;
          let responseStatus: number | undefined;
          if (!message && error?.context) {
            const response = error.context as Response;
            responseStatus = response.status;
            if (typeof response.clone === 'function') {
              try {
                const body = await response.clone().text();
                if (body) {
                  try {
                    const parsed = JSON.parse(body);
                    message = parsed.error ?? parsed.message ?? body;
                  } catch { message = body; }
                }
              } catch { /* response body could not be read */ }
              }
          }
          const endpointUnavailable = error?.name === 'FunctionsFetchError';
          Alert.alert(
            endpointUnavailable ? 'خدمة حذف المستخدم غير متاحة' : 'تعذّر حذف المستخدم',
            message ?? (endpointUnavailable
              ? 'لم يتم الوصول إلى خدمة الحذف. تأكد من نشر admin-delete-user على مشروع Supabase ثم تحقق من الاتصال.'
              : `${error?.message || 'تحقق من الاتصال ثم حاول مجددًا.'}${responseStatus ? ` (HTTP ${responseStatus})` : ''}`),
          );
          return;
        }
        await onChanged();
      } catch {
        Alert.alert('تعذّر حذف المستخدم', 'تحقق من الاتصال ثم حاول مجددًا.');
      } finally {
        setDeletingUserId(null);
      }
    } },
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
      </Card>
      <H>قائمة المستخدمين</H>
      {users.map((u) => (
        <Card key={u.id}>
          <T bold>{u.email ?? 'مستخدم'}</T>
          <T mu>{u.role === 'admin' ? 'مدير' : 'مدخل بيانات'}</T>
          {u.id !== me.id && <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Btn kind="o" title={u.role === 'admin' ? 'خفض' : 'ترقية'} onPress={() => flip(u)} /></View>
            <View style={{ flex: 1 }}><Btn kind="d" title={deletingUserId === u.id ? 'جارٍ الحذف…' : 'حذف'} loading={deletingUserId === u.id} disabled={deletingUserId !== null} onPress={() => removeUser(u)} /></View>
          </View>}
        </Card>
      ))}
      <Card><H>نسخة احتياطية</H><Btn kind="o" title="مشاركة نسخة JSON" onPress={backup} /></Card>
    </View>
  );
}
