# Progress

_Last updated: 2026-11-12. Update this file whenever a milestone changes status._

## Done
- [x] Requirements gathered (Arabic spec): roles, trip form, admin dashboard, branding, free-only.
- [x] Supabase project `hajj` created (Frankfurt, free plan).
- [x] Database schema: `profiles`, `officials`, `services`, `trips`, sequence `trip_seq`, triggers (`updated_at`, auto-profile on signup), `is_admin()` helper, Realtime on `trips`.
- [x] RLS verified with a rolled-back SQL test: entry user can insert (count > 0, `created_by` must be self), sees only own trips, cannot update/delete trips, cannot add officials/services, cannot self-promote; admin can do all.
- [x] First admin promoted (the owner's account).
- [x] Web app (`legacy-web/index.html`) deployed to Cloudflare Workers.
- [x] Web features: login, entry form + validation, admin KPIs, time analysis (day/week/month, custom range), officials & services analysis, searchable/sortable log with edit/delete, CSV export, JSON backup, lists management, realtime updates.
- [x] Expo/React Native port written (this repo): login, entry/edit, dashboard, log, settings, realtime, role-based tabs.

## Not verified (important)
- [ ] The Expo app has **never been installed, type-checked in full, or run**. (Written in a sandbox with no network; only a syntax-level check was done.)
- [ ] Web UI interactions were never browser-tested by the author agent (only that the page is served). Owner is testing manually.
- [ ] Supabase Auth "disable sign-ups" confirmed? Unknown.

## To do (mobile)
- [ ] Install, align versions (`npx expo install --fix`), run typecheck, fix errors.
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
