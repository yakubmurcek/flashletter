-- Fake data for the local dev database and CI. Never real customers.
-- Two users with one campaign each: the ownership tests sign in as one and try to reach
-- the other's campaign. Password for both: password123

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'alice@example.com', crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Alice Test"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'bob@example.com', crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Bob Test"}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.email in ('alice@example.com', 'bob@example.com');

insert into public.campaigns (id, user_id, name, landing_page_url, tone, campaign_type, days, status)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Alice launch', 'https://example.com/alice', 'friendly', 'launch', 3, 'draft'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   'Bob onboarding', 'https://example.com/bob', 'professional', 'onboarding', 3, 'draft');

insert into public.emails (campaign_id, day, subject, preview, content)
select c.id, d.day, c.name || ': day ' || d.day, 'Preview ' || d.day, 'Body of email ' || d.day
from public.campaigns c
cross join (values (1), (2), (3)) as d(day);

insert into public.waitlist (email, name, source, status, privacy_consent, user_region)
values ('waitlist@example.com', 'Waitlist Test', 'landing_page', 'pending', true, 'EU');
