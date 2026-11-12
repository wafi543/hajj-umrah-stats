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
    return respond({ error: 'خدمة حذف المستخدمين غير مهيأة على الخادم.' }, 500);
  }

  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return respond({ error: 'يلزم تسجيل الدخول.' }, 401);

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
  if (authError || !caller) return respond({ error: 'جلسة الدخول غير صالحة.' }, 401);

  const { data: callerProfile, error: callerProfileError } = await callerClient
    .from('profiles').select('role').eq('id', caller.id).maybeSingle();
  if (callerProfileError || callerProfile?.role !== 'admin') return respond({ error: 'هذه العملية متاحة للمدير فقط.' }, 403);

  let input: { user_id?: unknown };
  try {
    input = await req.json();
  } catch {
    return respond({ error: 'بيانات الطلب غير صالحة.' }, 400);
  }
  const userId = typeof input.user_id === 'string' ? input.user_id : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    return respond({ error: 'معرّف المستخدم غير صالح.' }, 400);
  }
  if (userId === caller.id) return respond({ error: 'لا يمكنك حذف حسابك الحالي.' }, 400);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: target, error: targetError } = await adminClient
    .from('profiles').select('role').eq('id', userId).maybeSingle();
  if (targetError || !target) return respond({ error: 'المستخدم غير موجود.' }, 404);

  if (target.role === 'admin') {
    const { count, error: countError } = await adminClient
      .from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin');
    if (countError) {
      console.error('Could not verify remaining admins:', countError.message);
      return respond({ error: 'تعذّر التحقق من المديرين. حاول مجددًا.' }, 500);
    }
    if ((count ?? 0) <= 1) return respond({ error: 'لا يمكن حذف المدير الوحيد في النظام.' }, 400);
  }

  const { count: tripCount, error: tripsError } = await adminClient
    .from('trips').select('id', { count: 'exact', head: true }).eq('created_by', userId);
  if (tripsError) {
    console.error('Could not verify user trips:', tripsError.message);
    return respond({ error: 'تعذّر التحقق من رحلات المستخدم. حاول مجددًا.' }, 500);
  }
  if ((tripCount ?? 0) > 0) {
    return respond({ error: 'لا يمكن حذف هذا المستخدم لوجود رحلات مرتبطة بحسابه. احتفظ بالحساب لضمان بقاء سجل الرحلات.' }, 409);
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error('Admin delete user failed:', deleteError.message);
    return respond({ error: 'تعذّر حذف الحساب. حاول مجددًا.' }, 400);
  }

  return respond({ success: true });
});
