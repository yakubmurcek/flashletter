-- Two waitlist signups at the same moment no longer drop one of them.
--
-- assign_waitlist_order() gave each new row MAX("order") + 1. Two concurrent inserts read the
-- same MAX, the second one then failed unique_waitlist_order, and waitlist_join's
-- unique_violation handler (meant for a duplicate email) found no row for that email and
-- answered {id: null, already_joined: true}: the person was told they were on the list and
-- was not. A sequence hands out each number exactly once, whatever the concurrency.

drop trigger if exists trigger_assign_waitlist_order on public.waitlist;
drop function if exists public.assign_waitlist_order();

create sequence public.waitlist_order_seq as integer owned by public.waitlist."order";
-- Continue after the highest position already handed out, so live rows keep theirs and the
-- first signup after this migration cannot collide with them.
select setval(
  'public.waitlist_order_seq',
  coalesce((select max("order") from public.waitlist), 0) + 1,
  false
);
alter table public.waitlist alter column "order" set default nextval('public.waitlist_order_seq');
-- Like the table itself: only waitlist_join (security definer) and service_role touch it.
revoke all on sequence public.waitlist_order_seq from anon, authenticated;

-- The unique_violation handler now only answers "already joined" when the email really is on
-- the list; any other unique violation is raised instead of being reported as a success.
create or replace function public.waitlist_join(
  p_email text,
  p_name text,
  p_privacy_consent boolean,
  p_marketing_consent boolean,
  p_consent_timestamp text,
  p_user_region text
) returns json
language plpgsql
security definer
set search_path to 'public'
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
    if not found then
      raise;
    end if;
    return json_build_object('id', v_row.id, 'already_joined', true);
end
$$;
