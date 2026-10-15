-- Lock down the waitlist table (2026-10-15).
--
-- Before this, the public anon key (shipped in the JS bundle) could read the
-- whole waitlist straight from PostgREST: emails, names, consent, region.
-- After it, no client role can touch the table; the app goes through the
-- three SECURITY DEFINER functions below instead. Guests signed in with
-- signInAnonymously() use the `authenticated` role, so both roles lose access.
--
-- Safe to run more than once. Run it in the Supabase SQL editor.

begin;

alter table public.waitlist enable row level security;

-- Policy names were created in the dashboard and aren't in the repo: drop all.
do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies where schemaname = 'public' and tablename = 'waitlist'
  loop
    execute format('drop policy %I on public.waitlist', p.policyname);
  end loop;
end
$$;

revoke all on table public.waitlist from anon, authenticated;

-- Who may list the waitlist from /admin/waitlist (besides ADMIN_EMAILS in the app).
create table if not exists public.waitlist_admins (email text primary key);
alter table public.waitlist_admins enable row level security;
revoke all on table public.waitlist_admins from anon, authenticated;
insert into public.waitlist_admins (email) values ('murcja812@gmail.com') on conflict do nothing;

-- Join: insert once per address. json_populate_record casts every value to
-- the column's own type, so enum or timestamp columns need no casts here.
create or replace function public.waitlist_join(
  p_email text,
  p_name text,
  p_privacy_consent boolean,
  p_marketing_consent boolean,
  p_consent_timestamp text,
  p_user_region text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_row public.waitlist;
  v_total bigint;
begin
  select * into v_row from public.waitlist where email = v_email;
  if found then
    return json_build_object('id', v_row.id, 'already_joined', true);
  end if;

  insert into public.waitlist
    (email, name, source, status, privacy_consent, marketing_consent, consent_timestamp, user_region)
  select r.email, r.name, r.source, r.status, r.privacy_consent, r.marketing_consent,
         r.consent_timestamp, r.user_region
  from json_populate_record(null::public.waitlist, json_build_object(
    'email', v_email,
    'name', nullif(trim(p_name), ''),
    'source', 'landing_page',
    'status', 'pending',
    'privacy_consent', coalesce(p_privacy_consent, true),
    'marketing_consent', coalesce(p_marketing_consent, false),
    'consent_timestamp', coalesce(p_consent_timestamp, now()::text),
    'user_region', coalesce(p_user_region, 'OTHER')
  )) r
  returning * into v_row;

  select count(*) into v_total from public.waitlist;
  return json_build_object(
    'id', v_row.id, 'order', v_row."order", 'total_count', v_total, 'already_joined', false
  );
exception
  when unique_violation then
    select * into v_row from public.waitlist where email = v_email;
    return json_build_object('id', v_row.id, 'already_joined', true);
end
$$;

-- Unsubscribe: the route checks the signed token or takes the typed address.
create or replace function public.waitlist_unsubscribe(p_email text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.waitlist where email = lower(trim(p_email));
$$;

-- Admin list: only a signed-in, non-guest user whose email is in waitlist_admins.
create or replace function public.waitlist_admin_list()
returns setof public.waitlist
language sql
stable
security definer
set search_path = public
as $$
  select w.*
  from public.waitlist w
  where coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and exists (
      select 1 from public.waitlist_admins a where a.email = lower(auth.jwt() ->> 'email')
    )
  order by w."order";
$$;

revoke all on function public.waitlist_join(text, text, boolean, boolean, text, text) from public;
revoke all on function public.waitlist_unsubscribe(text) from public;
revoke all on function public.waitlist_admin_list() from public;
grant execute on function public.waitlist_join(text, text, boolean, boolean, text, text) to anon, authenticated;
grant execute on function public.waitlist_unsubscribe(text) to anon, authenticated;
grant execute on function public.waitlist_admin_list() to authenticated;

commit;
