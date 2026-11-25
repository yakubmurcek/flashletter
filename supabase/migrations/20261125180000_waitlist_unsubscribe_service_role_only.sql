-- Only the server may unsubscribe someone from the waitlist.
--
-- waitlist_unsubscribe(p_email) deletes by bare email and was executable by
-- anon, whose key is public: anyone could call /rest/v1/rpc/waitlist_unsubscribe
-- with someone else's address and skip the signed-link check in
-- app/api/waitlist/unsubscribe/route.ts. The route now calls it with the
-- service-role key after verifying the token.
--
-- Rollback: GRANT EXECUTE ON FUNCTION public.waitlist_unsubscribe(text) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.waitlist_unsubscribe(text) FROM anon, authenticated;
