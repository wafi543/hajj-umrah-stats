# Hajj Trips Stats — جمعية خدمات الحجاج والمعتمرين

**Author:** Ali Alshammari

Mobile app (Expo / React Native / TypeScript) for recording and analysing Hajj & Umrah trip entries. Arabic RTL UI, role-based access (admin / data-entry), live dashboard. Backend is Supabase (Postgres + Auth + Realtime).

> **Status:** v0.1 — the first production iOS build completed. Its upload to TestFlight is queued with EAS; see `memory-bank/progress.md` for the current IDs and status.

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

### Run in a browser or prepare a hosted web build

Install the web renderer once, then start Expo's browser version:

```bash
npx expo install react-dom react-native-web
npm run web
```

To create a static site for hosting, run `npm run build:web`; Expo writes the site to `dist/`. For Cloudflare Pages, create a Pages project and upload the `dist` folder (or deploy it with Wrangler: `npx wrangler pages deploy dist --project-name hajj-stats`).

#### Deploy to Namecheap from macOS

From the repo folder on your Mac, run this single command:

```bash
npm run deploy:namecheap
```

It builds the web app, uploads the contents of `dist/` to `hajj-stats-namecheap:public_html/`, and confirms that `index.html` is present. The SSH alias `hajj-stats-namecheap` must be configured in `~/.ssh/config` and able to connect without an interactive password prompt. The site is https://hajj-stats.online/. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env` before building if they change. Only the public publishable/anon key belongs in the browser build; never use a service-role key.

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
- `trips(id, trip_no 'R-000001' (sequence default), count > 0, official_id, service_id (legacy first service), entered_date, entered_time, notes, created_by default auth.uid(), created_at, updated_at)` and `trip_services(trip_id, service_id)` for the selected services on each trip.

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
1. Create a project, open **SQL Editor**, run `supabase/schema.sql`. For an existing project, rerun the updated script to create `trip_services` and backfill each trip's existing service.
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

## iOS App Store release with EAS

The iOS bundle ID is `org.wafi.hajj-stats`; the app icon is `assets/kaaba-icon.png` and the launch screen is `assets/launch-screen-iphone.png`. EAS is linked to `@wafi543/hajj-stats`. `eas.json` uses remote app versioning and automatically increments the iOS build number for production builds.

### Before the first cloud build

1. Install dependencies and the EAS CLI, then sign in to Expo:

   ```bash
   npm install
   npm install --global eas-cli
   eas login
   ```

2. If EAS is not configured for this checkout yet, run `eas build:configure` and select **iOS**. This repository already has an `eas.json` configuration.

3. Add the Supabase client settings to the Expo project's **production** environment. The `.env` file is git-ignored, so it may not be included in a cloud build. Use the same project URL and **publishable/anon key** from `.env`; never use `service_role` in the app:

   ```bash
   eas env:set --name EXPO_PUBLIC_SUPABASE_URL --value "https://<project-ref>.supabase.co" --environment production --visibility plaintext
   eas env:set --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<publishable-or-anon-key>" --environment production --visibility sensitive
   eas env:list --environment production
   ```

   Replace the placeholders with the values from `.env`. These `EXPO_PUBLIC_` values are embedded in the app bundle and are public; database security must come from Supabase RLS. EAS environments and visibility are described in [Expo's environment variables guide](https://docs.expo.dev/eas/environment-variables/).

4. Check the app settings in `app.json`: use the registered bundle ID, final version, icon, and launch-screen image. Create the app record in App Store Connect first and confirm it uses bundle ID `org.wafi.hajj-stats`.

### Build and upload to TestFlight

1. Build the signed App Store binary in Expo's cloud:

   ```bash
   eas build --platform ios --profile production
   ```

   Sign in to the Apple Developer account when EAS prompts. Let EAS manage the distribution certificate and provisioning profile, reusing the existing team certificate if offered. The build uses the production environment and increments the build number automatically.

2. After the build finishes, upload its latest IPA to App Store Connect:

   ```bash
   eas submit --platform ios --latest --wait
   ```

   The first submission may prompt for Apple sign-in and an App Store Connect API key. EAS can create/configure the API key; accept it for this project. `eas submit` uploads the binary to App Store Connect, but does not submit it for public App Store review.

3. Track the EAS submission if it is queued or still processing:

   ```bash
   eas submit:list --platform ios
   ```

   After Apple finishes processing the upload, open **App Store Connect → My Apps → جمعية خدمات الحجاج والمعتمرين → TestFlight**. Add internal testers and test the build. External testers require a TestFlight group and Apple's beta review for the first build in that group.

4. For future releases, build and submit in one command:

   ```bash
   eas build --platform ios --profile production --auto-submit
   ```

### Submit for App Store review

After testing, complete the App Store listing and privacy details in App Store Connect. Add screenshots, age rating, support URL, the privacy-policy URL (`https://hajj-stats.online/privacy-policy.html`), and working reviewer credentials plus notes explaining the admin and entry roles. Select the processed build under the iOS app version, choose **Add for Review**, and submit it to Apple. App Review approval is separate from uploading to TestFlight.

Current first release: version `0.1.0` / build `3`; EAS build ID `3fb99273-71a0-4273-a873-d45fba118582`. The TestFlight submission ID is `130a14e8-2949-44e7-a181-cb95b35bda49` and was queued at the last status check. The EAS project page is https://expo.dev/accounts/wafi543/projects/hajj-stats.

### Privacy policy

The Arabic privacy policy is at `public/privacy-policy.html`; after the Namecheap web export is deployed, its URL is https://hajj-stats.online/privacy-policy.html. The iOS App Store privacy-policy field should use this public URL. Its support link is https://hajj-stats.online.

## Known gaps / TODO
See `memory-bank/progress.md` (native date pickers, real file export, Tajawal font, FlatList for big logs, offline handling).

## Free-tier notes (Supabase)
Projects pause after about a week of inactivity, and there are no automatic backups — export the JSON backup (Settings tab) regularly. Check current limits on supabase.com/pricing.
