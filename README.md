# Hajj Trips Stats — إحصائيات رحلات ضيوف الرحمن

**Author:** Ali Alshammari

Mobile app (Expo / React Native / TypeScript) for recording and analysing Hajj & Umrah trip entries. Arabic RTL UI, role-based access (admin / data-entry), live dashboard. Backend is Supabase (Postgres + Auth + Realtime).

> **Status:** v0.1 — ported from a working web version. The port has **not yet been run**; see `memory-bank/progress.md`.

## Stack
| Layer | Tech |
|---|---|
| App | Expo SDK 58, React Native, TypeScript (strict) |
| Backend | Supabase (Postgres 17, Auth, Realtime, Row Level Security), free plan |
| State | React state in `App.tsx` (no Redux / navigation lib yet) |
| Charts | Plain `View` bars (no chart lib) |

## Quick start
Requires Node LTS and a phone with **Expo Go** (or an iOS/Android simulator).

```bash
npm install
npx expo install --fix      # aligns react / react-native / expo packages to the installed SDK
npm run typecheck           # fix any errors first (the code was written offline)
npx expo start              # scan the QR code with Expo Go
```

`package.json` deliberately uses `*` for react, react-native and a few libs; `expo install --fix` replaces them with the versions that match the SDK. Commit the resulting lockfile.

### Environment
Copy `.env.example` to `.env` (a pre-filled `.env` for the live project is included in the zip and git-ignored):

```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable key, or legacy anon key>
```
The publishable (or legacy anon) key is public by design; security comes from RLS. **Never put a secret/service-role key in the app.**

## Project layout
```
App.tsx                    session, profile, data loading, realtime, tab bar
index.ts                   entry; forces RTL
src/types.ts               shared types
src/ui.tsx                 theme + small component kit (Card, Btn, Field, Chips, ...)
src/lib/supabase.ts        client (AsyncStorage session)
src/lib/data.ts            queries (trips paged by 1000, lookups, profiles)
src/lib/stats.ts           KPIs, grouping (day/week/month), filters, CSV
src/screens/               Login, Entry (add/edit), Dashboard, Log, Settings
supabase/schema.sql        full DB: tables, triggers, RLS policies (run in SQL editor)
legacy-web/index.html      the deployed single-file web version (reference)
memory-bank/               project context for AI agents / new devs
```

## Data model
- `profiles(id → auth.users, email, full_name, role 'admin'|'entry')` — auto-created by a trigger on signup, default role `entry`.
- `officials(id, name unique, active)` and `services(id, name unique, active)` — managed by admins; deactivated instead of deleted.
- `trips(id, trip_no 'R-000001' (sequence default), count > 0, official_id, service_id, entered_date, entered_time, notes, created_by default auth.uid(), created_at, updated_at)`.

### Access rules (enforced by RLS, not by the UI)
| | admin | entry |
|---|---|---|
| read trips | all | own only |
| insert trips | yes | yes (`created_by` must be self) |
| update / delete trips | yes | **no** |
| officials / services | read + write | read only |
| profiles | read all, change roles | read own |

`public.is_admin()` is a `SECURITY DEFINER` helper used by policies (the Supabase linter warns it is callable by signed-in users; this is intentional and it only returns a boolean for the caller).

## Setting up a new Supabase project
1. Create a project, open **SQL Editor**, run `supabase/schema.sql`.
2. **Authentication → Users → Add user** (Auto Confirm) for yourself, then run:
   `update public.profiles set role='admin' where lower(email)=lower('you@example.com');`
3. **Authentication → Sign In / Providers → disable "Allow new users to sign up"** (otherwise anyone can register as an entry user).
4. Put URL + anon key in `.env`.
5. Add staff the same way as step 2 (they stay `entry`). Admins can promote users in the app's Settings tab.

### إضافة المستخدمين من التطبيق
تتيح صفحة **الإعدادات ← المستخدمون** للمدير إنشاء حساب مدخل بيانات وتأكيد البريد تلقائيًا. لأن إنشاء الحساب يحتاج صلاحية Supabase Admin، يمر الطلب عبر Edge Function ولا توضع `service_role` في التطبيق:

```bash
npx supabase login
npx supabase link --project-ref cmhlxvsgnsmpuqbkhyjd
npx supabase functions deploy admin-create-user
npx supabase functions deploy admin-delete-user
```

تستخدم الدالة أسرار `SUPABASE_URL` و`SUPABASE_ANON_KEY` و`SUPABASE_SERVICE_ROLE_KEY` الموجودة في بيئة Supabase Functions. تأكد من ضبط مفتاح الخدمة في **Supabase Dashboard → Edge Functions → Secrets** عند الحاجة؛ لا تضفه إلى `.env` أو التطبيق. الدالة تتحقق من جلسة المستدعي ومن كون دوره `admin` قبل إنشاء المستخدم، ويُنشأ الحساب الجديد بصلاحية `entry` عبر مشغل إنشاء الملف الشخصي.

يمكن للمدير حذف الحسابات الأخرى من صفحة المستخدمين. الحذف لا يسمح بحذف الحساب الحالي أو المدير الوحيد، كما يُرفض إذا كانت للمستخدم رحلات مسجلة كي يبقى سجل الرحلات مرتبطًا بصاحبه. الحذف ينفذه `admin-delete-user` على الخادم باستخدام مفتاح الخدمة.

## Conventions
- All user-facing strings are Arabic. Keep layout RTL-safe (use `flexDirection: 'row'`, not manual reversing; avoid hard-coded left/right).
- Business logic goes in `src/lib`, not in screens.
- Schema changes go into `supabase/schema.sql` (idempotent) and are noted in `memory-bank/progress.md`.
- Update the memory bank when you finish a task.

## Testing checklist (manual)
Admin login · entry login · empty/zero/invalid form blocked · trip saved with `R-` number · new trip appears on admin dashboard without refresh · entry user sees only own trips and has no edit/delete · edit/delete as admin · filters/search/sort · CSV share · backup share · KPI numbers match a hand count · RTL on iOS and Android · app restart keeps the session.

## Release to the stores (when ready)
1. Set real `ios.bundleIdentifier` / `android.package` and `version` in `app.json`; add icon & splash.
2. `npm i -g eas-cli && eas login && eas build:configure`, then `eas build -p ios|android`.
3. Submit with `eas submit`. Requires an **Apple Developer account (paid, yearly)** and a **Google Play developer account (one-time fee)**, plus a privacy-policy URL.
4. Test with TestFlight / Play internal testing first.

## Known gaps / TODO
See `memory-bank/progress.md` (native date pickers, real file export, Tajawal font, FlatList for big logs, offline handling).

## Free-tier notes (Supabase)
Projects pause after about a week of inactivity, and there are no automatic backups — export the JSON backup (Settings tab) regularly. Check current limits on supabase.com/pricing.
