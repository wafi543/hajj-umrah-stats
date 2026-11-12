# Progress

_Last updated: 2026-11-13. Update this file whenever a milestone changes status._

## Done
- [x] Requirements gathered (Arabic spec): roles, trip form, admin dashboard, branding, free-only.
- [x] Supabase project `hajj` created (Frankfurt, free plan).
- [x] Database schema: `profiles`, `officials`, `services`, `trips`, sequence `trip_seq`, triggers (`updated_at`, auto-profile on signup), `is_admin()` helper, Realtime on `trips`.
- [x] RLS verified with a rolled-back SQL test: entry user can insert (count > 0, `created_by` must be self), sees only own trips, cannot update/delete trips, cannot add officials/services, cannot self-promote; admin can do all.
- [x] First admin promoted (the owner's account).
- [x] Web app (`legacy-web/index.html`) deployed to Cloudflare Workers.
- [x] Web features: login, entry form + validation, admin KPIs, time analysis (day/week/month, custom range), officials & services analysis, searchable/sortable log with edit/delete, CSV export, JSON backup, lists management, realtime updates.
- [x] Expo/React Native port written (this repo): login, entry/edit, dashboard, log, settings, realtime, role-based tabs.
- [x] Admin user creation UI added in Settings; invokes a server-side Supabase Edge Function that validates caller identity and admin role, creates email-confirmed users with the profile trigger's default `entry` role, and keeps the service-role secret off the client.
- [x] Admin user deletion UI added in Settings; invokes a server-side Edge Function that checks admin identity, protects the current/only admin, and refuses deletion while trips reference the account.
- [x] Restyled the Settings users list to match LogScreen rows, including horizontal promotion/demotion and destructive delete buttons.
- [x] Added an Arabic "تعديل الاسم" action to the officials list with inline save/cancel, empty-name validation, and duplicate-name handling; the existing admin-only RLS update policy is used.
- [x] README updated with Edge Function deployment and secret configuration steps.
- [x] Confirmed Supabase Data API is enabled and the local app environment already points to the project root URL with an anon key; updated `.env.example` with the project URL.
- [x] Configured local Expo environment with the supplied publishable key (never the secret key); updated README and `.env.example` to clarify publishable-key support.

## Not verified (important)
- [ ] The Expo app has **never been run** on a device or simulator. `npm run typecheck` passes for the app; Deno Edge Function code is excluded from Expo's TypeScript project and must be validated by Supabase CLI deployment.
- [ ] Web UI interactions were never browser-tested by the author agent (only that the page is served). Owner is testing manually.
- [ ] Supabase Auth "disable sign-ups" confirmed? Unknown.

## To do (mobile)
- [x] User deployed `supabase/functions/admin-create-user` to production project `cmhlxvsgnsmpuqbkhyjd` using the Supabase CLI.
- [ ] Deploy `supabase/functions/admin-delete-user` to production project `cmhlxvsgnsmpuqbkhyjd`; manually verify authorized deletion and safeguards.
- [ ] Manually verify admin user creation from the app and non-admin rejection against production.
- [ ] Install, align versions (`npx expo install --fix`), then run app on device/simulator.
- [ ] Manual test matrix: admin login, entry login, add trip (valid/invalid), realtime update on dashboard, edit, delete, CSV share, backup share, RTL layout on iOS and Android.
- [ ] Native date/time pickers.
- [ ] Real CSV/Excel file export (expo-file-system + expo-sharing).
- [ ] Tajawal font via expo-font.
- [ ] Pagination/FlatList for the log when data grows.
- [ ] Per-user display names (profiles.full_name editing UI).
- [ ] Offline tolerance / retry for field staff with poor connectivity (nice to have).
- [ ] Charts: consider `react-native-svg` or Victory Native if richer charts are wanted.
- [ ] Store release: bundle id, icons, splash, EAS Build, privacy policy, store listings, TestFlight/internal testing.

## Known limitations
- Date/time are plain text inputs (`YYYY-MM-DD`, `HH:MM`) in v1.
- Exports use the OS share sheet with text content, not a file.
- Dashboard loads all trips client-side (paged 1000 at a time). Fine for tens of thousands of rows; move to SQL views/RPC beyond that.
- Free-plan Supabase has no automatic backups — owner must export JSON regularly.

## Change log
- 2026-11-12: Repo created from the web version; memory bank added.
- 2026-11-13: Added in-app admin user creation through a role-checked Supabase Edge Function; documented deployment and server-only secret handling.
- 2026-11-13: Confirmed the app's Supabase Data API connection settings and documented the project's URL in the environment template.
- 2026-11-13: Set the local app to use the project's publishable key and documented that the secret key pasted in chat should be rotated.
- 2026-11-13: Fixed app TypeScript errors and verified `npm run typecheck`; excluded Deno Edge Function files from Expo TypeScript checking. Deployment remains pending because Supabase CLI and authentication are unavailable locally.
- 2026-11-13: Owner installed/authenticated Supabase CLI and deployed `admin-create-user` successfully to production; live create-user behavior still needs manual verification.
- 2026-11-13: Added Arabic delete-user action in Settings and `admin-delete-user` Edge Function. It prevents self-deletion, deletion of the only admin, and deletion of users who own trips. Function deployment and live verification remain pending.
- 2026-11-13: Improved Settings error reporting to distinguish an unavailable Edge Function endpoint and show a deployment hint. Production deploy was attempted, but this environment lacks the Supabase CLI and `npx` could not retrieve it.
- 2026-11-13: Updated delete failure handling to read the HTTP response body and status, so Edge Function rejection reasons are displayed instead of only Supabase's generic non-2xx message.
- 2026-11-13: Added an inline activity spinner and Arabic in-progress label to the active delete button; other delete buttons are disabled until the request completes.
- 2026-11-13: Matched Settings user rows and promotion/deletion actions to the LogScreen card and button styling.
- 2026-11-13: Added inline official name editing in Settings; existing RLS policy protects updates, so no Edge Function was needed.
