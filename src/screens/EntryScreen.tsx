import React, { useState } from 'react';
import { View } from 'react-native';
import { supabase } from '../lib/supabase';
import { fmt, hhmm, ymd } from '../lib/stats';
import { Lookup, Trip } from '../types';
import { Btn, Card, Chips, Field, H, Msg, T } from '../ui';

type Props = { admin: boolean; officials: Lookup[]; services: Lookup[]; trips: Trip[]; editing: Trip | null; onSaved: () => Promise<void> };

export default function EntryScreen({ admin, officials, services, trips, editing, onSaved }: Props) {
  const e = editing;
  const [count, setCount] = useState(e ? String(e.count) : '');
  const [off, setOff] = useState<number | ''>(e ? e.official_id : '');
  const [svc, setSvc] = useState<number | ''>(e ? e.service_id : '');
  const [date, setDate] = useState(e?.date ?? ymd());
  const [time, setTime] = useState(e?.time ?? hhmm());
  const [notes, setNotes] = useState(e?.notes ?? '');
  const [msg, setMsg] = useState<{ k: 'ok' | 'er'; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const O = officials.filter((x) => x.active || x.id === e?.official_id);
  const V = services.filter((x) => x.active || x.id === e?.service_id);
  if (!O.length || !V.length) return <Card><H>تسجيل رحلة</H><Msg kind="er">لم يُضف المدير أسماء المسؤولين أو الخدمات بعد.</Msg></Card>;

  const save = async () => {
    const n = Number(count);
    if (!Number.isInteger(n) || n <= 0) return setMsg({ k: 'er', t: 'عدد المستفيدين يجب أن يكون رقماً صحيحاً أكبر من صفر.' });
    if (!off || !svc) return setMsg({ k: 'er', t: 'يرجى اختيار المسؤول والخدمة.' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return setMsg({ k: 'er', t: 'التاريخ بصيغة 2026-11-12 والوقت بصيغة 14:30.' });
    setBusy(true);
    const row = { count: n, official_id: off, service_id: svc, entered_date: date, entered_time: time, notes: notes.trim() };
    const res = e
      ? await supabase.from('trips').update(row).eq('id', e.id)
      : await supabase.from('trips').insert(row).select('trip_no').single();
    setBusy(false);
    if (res.error) return setMsg({ k: 'er', t: 'تعذّر الحفظ: ' + res.error.message });
    if (!e) { setMsg({ k: 'ok', t: `✓ تم تسجيل الرحلة بنجاح — رقم الرحلة: ${(res.data as any).trip_no}` }); setCount(''); setNotes(''); }
    await onSaved();
  };

  return (
    <View>
      <Card>
        <H>{e ? `تعديل الرحلة ${e.no}` : 'تسجيل رحلة جديدة'}</H>
        {msg && <Msg kind={msg.k}>{msg.t}</Msg>}
        <Field label="عدد المستفيدين *" value={count} onChangeText={setCount} keyboardType="number-pad" />
        <T mu>اسم المسؤول عن الرحلة *</T><Chips items={O} value={off} onChange={setOff} />
        <T mu>الخدمة المقدمة *</T><Chips items={V} value={svc} onChange={setSvc} />
        {/* TODO: replace the two text fields with @react-native-community/datetimepicker */}
        <Field label="تاريخ دخول الرحلة * (YYYY-MM-DD)" value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" />
        <Field label="وقت دخول الرحلة * (HH:MM)" value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" />
        <Field label="ملاحظات (اختياري)" value={notes} onChangeText={setNotes} multiline />
        <Btn title={e ? 'حفظ التعديل' : 'تسجيل الرحلة'} onPress={save} disabled={busy} />
      </Card>
      {!admin && trips.length > 0 && (
        <Card>
          <H>آخر ما سجّلته</H>
          {trips.map((t) => <T key={t.id}>{`${t.no} — ${t.date} — ${fmt(t.count)} — ${t.service}`}</T>)}
        </Card>
      )}
    </View>
  );
}
