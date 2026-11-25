SET local check_function_bodies = off;

REVOKE ALL ON TABLE "public"."waitlist" FROM "anon";

REVOKE ALL ON TABLE "public"."waitlist" FROM "authenticated";

DROP POLICY "Allow public to unsubscribe from waitlist" ON "public"."waitlist";

DROP POLICY "Allow public to view waitlist" ON "public"."waitlist";

DROP POLICY "Allow public waitlist signup" ON "public"."waitlist";

CREATE TABLE "public"."guest_claims" (
  "token"      uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "guest_id"   uuid                     NOT NULL,
  "expires_at" timestamp with time zone NOT NULL DEFAULT (now() + '01:00:00'::interval),
  CONSTRAINT "guest_claims_pkey" PRIMARY KEY (token)
);

ALTER TABLE "public"."guest_claims"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."guest_claims" FROM "anon", "authenticated";

CREATE TABLE "public"."waitlist_admins" (
  "email" text NOT NULL,
  CONSTRAINT "waitlist_admins_pkey" PRIMARY KEY (email)
);

ALTER TABLE "public"."waitlist_admins"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."waitlist_admins" FROM "anon", "authenticated";

ALTER TABLE "public"."waitlist"
  ADD COLUMN "order" integer NOT NULL;

CREATE OR REPLACE FUNCTION public.assign_waitlist_order()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  -- Only assign order if it's null (new insert)
  IF NEW."order" IS NULL THEN
    -- Get the next order number atomically
    SELECT COALESCE(MAX("order"), 0) + 1 INTO NEW."order"
    FROM waitlist;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.campaigns_keep_created_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.create_guest_claim()
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_uid uuid := auth.uid();
  v_token uuid;
begin
  if v_uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false then
    raise exception 'only a guest can create a claim' using errcode = '42501';
  end if;
  delete from public.guest_claims where guest_id = v_uid or expires_at < now();
  insert into public.guest_claims (guest_id) values (v_uid) returning token into v_token;
  return v_token;
end
$function$;

CREATE OR REPLACE FUNCTION public.redeem_guest_claim (
  p_token uuid
)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_uid uuid := auth.uid();
  v_guest uuid;
  v_moved integer;
begin
  if v_uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'sign in before claiming guest campaigns' using errcode = '42501';
  end if;
  delete from public.guest_claims
  where token = p_token and expires_at > now()
  returning guest_id into v_guest;
  if v_guest is null or v_guest = v_uid then
    return 0;
  end if;
  update public.campaigns set user_id = v_uid where user_id = v_guest;
  get diagnostics v_moved = row_count;
  return v_moved;
end
$function$;

CREATE OR REPLACE FUNCTION public.waitlist_admin_list()
  RETURNS SETOF public.waitlist
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  select w.*
  from public.waitlist w
  where coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and exists (
      select 1 from public.waitlist_admins a where a.email = lower(auth.jwt() ->> 'email')
    )
  order by w."order";
$function$;

CREATE OR REPLACE FUNCTION public.waitlist_join (
  p_email             text,
  p_name              text,
  p_privacy_consent   boolean,
  p_marketing_consent boolean,
  p_consent_timestamp text,
  p_user_region       text
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.waitlist_unsubscribe (
  p_email text
)
  RETURNS void
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  delete from public.waitlist where email = lower(trim(p_email));
$function$;

ALTER TABLE "public"."waitlist"
  ADD CONSTRAINT "unique_waitlist_order" UNIQUE ("order");

CREATE INDEX idx_waitlist_order ON public.waitlist USING btree ("order");

CREATE TRIGGER campaigns_keep_created_at
  BEFORE INSERT OR UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.campaigns_keep_created_at();

CREATE TRIGGER trigger_assign_waitlist_order
  BEFORE INSERT ON public.waitlist
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_waitlist_order();

GRANT EXECUTE ON FUNCTION "public"."assign_waitlist_order"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."assign_waitlist_order"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."assign_waitlist_order"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."assign_waitlist_order"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."campaigns_keep_created_at"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."campaigns_keep_created_at"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."campaigns_keep_created_at"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."campaigns_keep_created_at"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."create_guest_claim"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."create_guest_claim"() TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."create_guest_claim"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_guest_claim"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_guest_claim"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."redeem_guest_claim"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."redeem_guest_claim"(uuid) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."redeem_guest_claim"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."redeem_guest_claim"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."redeem_guest_claim"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."waitlist_admin_list"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."waitlist_admin_list"() TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."waitlist_admin_list"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."waitlist_admin_list"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."waitlist_admin_list"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."waitlist_join"(text, text, boolean, boolean, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."waitlist_join"(text, text, boolean, boolean, text, text) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."waitlist_join"(text, text, boolean, boolean, text, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."waitlist_join"(text, text, boolean, boolean, text, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."waitlist_join"(text, text, boolean, boolean, text, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."waitlist_unsubscribe"(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."waitlist_unsubscribe"(text) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."waitlist_unsubscribe"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."waitlist_unsubscribe"(text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."waitlist_unsubscribe"(text) TO "service_role";

REVOKE ALL ON TABLE "public"."guest_claims" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."guest_claims" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."guest_claims" TO "service_role";

REVOKE ALL ON TABLE "public"."waitlist_admins" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."waitlist_admins" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."waitlist_admins" TO "service_role";
