-- Torito / xnomads — review moderation.
-- Run once in the Supabase SQL editor: paste this whole file and press Run.
-- Safe to re-run: it never drops data, and a second run does not approve
-- anything that is waiting for you.
--
-- What it does:
--   * every review gets a status: 'pending', 'approved' or 'rejected'
--   * reviews that already exist become 'approved' (they were live before)
--   * new reviews start as 'pending' and the public cannot see them until an
--     admin approves them at /admin/reviews
--   * an author who edits an approved review sends it back to 'pending'
--   * only an admin can change a status
--
-- RUN-THIS-IN-SUPABASE.sql and supabase-schema.sql use the same read policies,
-- so re-running either of them keeps pending reviews private. They do not add
-- the trigger below, so run this file after them on a fresh database.

-- ============================================================
-- COLUMNS
-- status is added without a default first, so the rows that already exist
-- come in as null and can be told apart from new ones: those are the reviews
-- that were already public, and they become 'approved'. On a re-run the column
-- already exists, nothing is null, and the update below changes nothing.
-- ============================================================
alter table public.tour_reviews add column if not exists status      text;
alter table public.tour_reviews add column if not exists reviewed_at timestamptz;
alter table public.tour_reviews add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

update public.tour_reviews set status = 'approved' where status is null;

alter table public.tour_reviews alter column status set default 'pending';
alter table public.tour_reviews alter column status set not null;

alter table public.tour_reviews drop constraint if exists tour_reviews_status_check;
alter table public.tour_reviews add constraint tour_reviews_status_check
  check (status in ('pending','approved','rejected'));

-- the public listing filters on approved; the admin page lists by status
create index if not exists tour_reviews_status_idx
  on public.tour_reviews (status, created_at desc);

-- ============================================================
-- WHO MAY SET THE STATUS
-- The "edit own review" policy lets an author update their row, and a policy
-- cannot say "every column except status". This trigger is that rule:
--   * a non-admin's new review is always 'pending', whatever they send
--   * a non-admin's edit to what the public sees (stars, text, recommend,
--     name, trip) puts it back to 'pending' for another look
--   * any other non-admin update keeps the status it had
-- auth.uid() is null in the SQL editor and for the service role — both are
-- already trusted, the same rule the profiles role guard uses.
-- ============================================================
create or replace function public.moderate_tour_review()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    -- stamp who decided and when, so the admin list can show it later
    if tg_op = 'INSERT' and new.status is distinct from 'pending' then
      new.reviewed_at := now();
      new.reviewed_by := auth.uid();
    elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
      new.reviewed_at := now();
      new.reviewed_by := auth.uid();
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status      := 'pending';
    new.reviewed_at := null;
    new.reviewed_by := null;
    return new;
  end if;

  if new.rating      is distinct from old.rating
     or new.body        is distinct from old.body
     or new.recommend   is distinct from old.recommend
     or new.author_name is distinct from old.author_name
     or new.tour_slug   is distinct from old.tour_slug then
    new.status      := 'pending';
    new.reviewed_at := null;
    new.reviewed_by := null;
  else
    new.status      := old.status;
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
  end if;
  return new;
end;
$$;

drop trigger if exists tour_reviews_moderate on public.tour_reviews;
create trigger tour_reviews_moderate
  before insert or update on public.tour_reviews
  for each row execute function public.moderate_tour_review();

-- ============================================================
-- WHO MAY READ WHAT
-- Policies add up (a row is visible if any one of them allows it):
--   * everyone, signed in or not: approved reviews only
--   * the author: their own review at any status, so the dialog can show
--     "waiting for approval" instead of an empty form
--   * admins: everything, through "admins manage reviews" (for all)
-- The old "reviews are public" policy (using true) must go, or it would
-- override all of this.
-- ============================================================
alter table public.tour_reviews enable row level security;

drop policy if exists "reviews are public"          on public.tour_reviews;
drop policy if exists "approved reviews are public" on public.tour_reviews;
drop policy if exists "read own review"             on public.tour_reviews;
drop policy if exists "admins manage reviews"       on public.tour_reviews;

create policy "approved reviews are public" on public.tour_reviews
  for select using (status = 'approved');

create policy "read own review" on public.tour_reviews
  for select using (user_id = auth.uid());

create policy "admins manage reviews" on public.tour_reviews
  for all using (public.is_admin()) with check (public.is_admin());

-- "write own review", "edit own review" and "delete own review" from
-- RUN-THIS-IN-SUPABASE.sql stay as they are; the trigger above is what keeps
-- an author from approving their own review.

-- ============================================================
-- AVERAGE RATINGS
-- There is no database view or function for averages: lib/ratings.js adds the
-- stars up in the browser, and it now asks for status = 'approved' only. So
-- nothing to change here.
-- ============================================================
