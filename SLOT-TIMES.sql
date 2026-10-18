-- Editable booking times. Run once in the Supabase SQL editor. Safe to re-run.
--
-- time_slots: the "What time?" buttons for lessons, snowmobile and paragliding,
--             e.g. '11:00, 12:00, 13:00'. Empty = every hour 09:00 – 16:00.
-- time_note:  a line shown under those buttons, e.g. a weather warning.

alter table public.tours add column if not exists time_slots text;
alter table public.tours add column if not exists time_note  text;
