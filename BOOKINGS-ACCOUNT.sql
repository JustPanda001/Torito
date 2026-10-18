-- My bookings: attach requests made before bookings carried an account.
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- New bookings are saved with user_id already. Older ones only have the email
-- the account had at the time, so this links each one to the account with that
-- same email. Rows whose email matches no account are left as they are.

update public.bookings b
set user_id = u.id
from auth.users u
where b.user_id is null
  and b.email is not null
  and lower(b.email) = lower(u.email);

-- My bookings lists rows newest first for one person; this keeps that fast.
create index if not exists bookings_user_idx on public.bookings (user_id, created_at desc);
