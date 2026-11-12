import React, { useState } from 'react';
import { View } from 'react-native';
import { supabase } from '../lib/supabase';
import { Btn, Card, Field, H, Msg } from '../ui';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const login = async () => {
    setBusy(true); setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setErr('بيانات الدخول غير صحيحة.');
  };
  return (
    <View style={{ padding: 16, marginTop: 30 }}>
      <Card>
        <H>تسجيل الدخول</H>
        {!!err && <Msg kind="er">{err}</Msg>}
        <Field label="البريد الإلكتروني" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label="كلمة المرور" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" onSubmitEditing={login} />
        <Btn title={busy ? '...' : 'دخول'} onPress={login} disabled={busy} />
      </Card>
    </View>
  );
}
