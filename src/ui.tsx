import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

export const C = { bg: '#ffffff', card: '#f6f8f6', tx: '#1d2b24', mu: '#66736c', g: '#0f5132', gold: '#b8923a', bd: '#e1e6e2', err: '#b3261e' };

export const Card = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => <View style={[s.card, style]}>{children}</View>;
export const H = ({ children }: { children: React.ReactNode }) => <Text style={s.h}>{children}</Text>;
export const T = ({ children, mu, bold }: { children: React.ReactNode; mu?: boolean; bold?: boolean }) =>
  <Text style={[s.t, mu && { color: C.mu, fontSize: 13 }, bold && { fontWeight: '700' }]}>{children}</Text>;

export function Btn({ title, onPress, kind = 'p', disabled, loading }: { title: string; onPress: () => void; kind?: 'p' | 'o' | 'd'; disabled?: boolean; loading?: boolean }) {
  const st = kind === 'p' ? s.bp : kind === 'o' ? s.bo : s.bd;
  const tc = kind === 'p' ? '#fff' : kind === 'o' ? C.g : C.err;
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={[s.btn, st, (disabled || loading) && { opacity: 0.5 }]}>
      {loading && <ActivityIndicator size="small" color={tc} style={{ marginEnd: 8 }} />}
      <Text style={{ color: tc, fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, ...p }: TextInputProps & { label: string }) {
  return (<View style={{ marginTop: 8 }}><Text style={s.lbl}>{label}</Text><TextInput {...p} placeholderTextColor={C.mu} style={s.in} /></View>);
}

export function Chips<I extends { id: number | string; name: string }>({ items, value, onChange, all }: { items: I[]; value: I['id'] | ''; onChange: (id: any) => void; all?: string }) {
  const list = all ? [{ id: '', name: all } as any, ...items] : items;
  return (
    <View style={s.chips}>
      {list.map((i: any) => (
        <Pressable key={String(i.id)} onPress={() => onChange(i.id)} style={[s.chip, value === i.id && { backgroundColor: C.g, borderColor: C.g }]}>
          <Text style={{ color: value === i.id ? '#fff' : C.tx }}>{i.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function MultiChips<I extends { id: number | string; name: string }>({ items, value, onChange }: { items: I[]; value: Array<I['id']>; onChange: (id: I['id']) => void }) {
  return (
    <View style={s.chips}>
      {items.map((i) => {
        const selected = value.includes(i.id);
        return <Pressable key={String(i.id)} onPress={() => onChange(i.id)} style={[s.chip, selected && { backgroundColor: C.g, borderColor: C.g }]}>
          <Text style={{ color: selected ? '#fff' : C.tx }}>{i.name}</Text>
        </Pressable>;
      })}
    </View>
  );
}

export const Msg = ({ kind, children }: { kind: 'ok' | 'er'; children: React.ReactNode }) =>
  <View style={[s.msg, { backgroundColor: kind === 'ok' ? 'rgba(15,81,50,.12)' : 'rgba(179,38,30,.12)' }]}><Text style={{ color: kind === 'ok' ? C.g : C.err }}>{children}</Text></View>;

export const Kpi = ({ v, l }: { v: string; l: string }) => (
  <View style={s.kpi}><Text style={{ fontSize: 22, fontWeight: '700', color: C.g }}>{v}</Text><Text style={{ color: C.mu, fontSize: 12 }}>{l}</Text></View>
);

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderColor: C.bd, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12 },
  h: { fontSize: 16, fontWeight: '700', color: C.g, marginBottom: 8 },
  t: { fontSize: 15, color: C.tx },
  lbl: { fontSize: 13, color: C.mu, marginBottom: 3 },
  in: { borderWidth: 1, borderColor: C.bd, borderRadius: 8, backgroundColor: C.bg, padding: 9, fontSize: 15, color: C.tx },
  btn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  bp: { backgroundColor: C.g }, bo: { borderWidth: 1, borderColor: C.g }, bd: { borderWidth: 1, borderColor: C.err },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: { borderWidth: 1, borderColor: C.bd, backgroundColor: C.bg, borderRadius: 16, paddingVertical: 5, paddingHorizontal: 12 },
  msg: { padding: 10, borderRadius: 8, marginBottom: 10 },
  kpi: { backgroundColor: C.card, borderColor: C.bd, borderWidth: 1, borderRadius: 10, padding: 10, width: '48%', marginBottom: 8 },
});
