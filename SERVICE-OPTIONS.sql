-- Service options. Run once in the Supabase SQL editor. Safe to re-run.
--
-- 1. tours.options: versions of one service, e.g. a 10 min and a 20 min
--    flight — [{ name, price, duration, note }]. Edited in the admin panel.
-- 2. tours.compare: the table comparing them — [{ feature, values: [...] }].
-- 3. Fills both in for the "paraglaiding in gudauri" page.

alter table public.tours add column if not exists options jsonb not null default '[]'::jsonb;
alter table public.tours add column if not exists compare jsonb not null default '[]'::jsonb;

update public.tours
set
  options = '[
    {"name": "Classic flight", "price": 350, "duration": "10 min in the air", "note": "A calm, scenic flight over the slopes"},
    {"name": "Acro flight",    "price": 480, "duration": "20 min in the air", "note": "Twice as long, plus barrel rolls, spirals and wingovers"}
  ]'::jsonb,
  compare = '[
    {"feature": "Tandem flight with a licensed pilot", "values": ["yes", "yes"]},
    {"feature": "Barrel rolls, spirals & wingovers",   "values": ["",    "yes"]},
    {"feature": "Group photos",                        "values": ["yes", "yes"]}
  ]'::jsonb,
  price = 350
where slug = 'paraglaiding-in-gudauri';
