# Agent instructions

Before changing anything, read `memory-bank/activeContext.md` and `memory-bank/progress.md`, then `README.md`.
After finishing work, update both memory-bank files (state, decisions, next steps).

Rules: UI text stays Arabic/RTL; never ship the Supabase `service_role` key; roles are enforced by RLS in `supabase/schema.sql` (change policies there, not just in the UI); keep dependencies free to use.
