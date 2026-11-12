import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return respond({ error: 'طريقة الطلب غير مدعومة.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Missing required Supabase function secrets.');
    return respond({ error: 'خدمة إضافة المستخدمين غير مهيأة على الخادم.' }, 500);
  }

  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return respond({ error: 'يلزم تسجيل الدخول.' }, 401);

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await callerClient.auth.getUser();
  if (authError || !user) return respond({ error: 'جلسة الدخول غير صالحة.' }, 401);

  const { data: profile, error: profileError } = await callerClient
    .from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profileError || profile?.role !== 'admin') return respond({ error: 'هذه العملية متاحة للمدير فقط.' }, 403);

  let input: { email?: unknown; password?: unknown; full_name?: unknown };
  try {
    input = await req.json();
  } catch {
    return respond({ error: 'بيانات الطلب غير صالحة.' }, 400);
  }

  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const fullName = typeof input.full_name === 'string' ? input.full_name.trim() : '';
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return respond({ error: 'أدخل بريدًا إلكترونيًا صالحًا.' }, 400);
  }
  if (password.length < 8 || password.length > 128) {
    return respond({ error: 'يجب أن تكون كلمة المرور بين ٨ و١٢٨ حرفًا.' }, 400);
  }
  if (fullName.length > 120) return respond({ error: 'الاسم أطول من الحد المسموح.' }, 400);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) {
    if (error.message.toLowerCase().includes('already')) return respond({ error: 'يوجد حساب مسجل بهذا البريد الإلكتروني.' }, 409);
    console.error('Admin create user failed:', error.message);
    return respond({ error: 'تعذّر إنشاء الحساب. تحقق من بياناته ثم حاول مجددًا.' }, 400);
  }

  return respond({ user: { id: data.user.id, email: data.user.email } }, 201);
});
