-- Review against a backup/staging database first. Run as a trusted database owner.
-- PostgreSQL/Supabase only; no application data or legacy hashes are deleted.
BEGIN;
CREATE TABLE IF NOT EXISTS public.authidentity (
    auth_user_id varchar(36) PRIMARY KEY,
    userid integer NOT NULL UNIQUE REFERENCES public.usertable(userid),
    disabled boolean NOT NULL DEFAULT false
);

-- React must use FastAPI for application data, not bypass authorization via REST.
DO $$
DECLARE table_name text; browser_role text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['authidentity','usertable','shoptable',
        'checklistoptiontable','userchecklisttable','forumtable','commenttable',
        'userhistorytable','reporttable']
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', table_name);
        FOREACH browser_role IN ARRAY ARRAY['anon','authenticated'] LOOP
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = browser_role) THEN
                EXECUTE format('REVOKE ALL ON public.%I FROM %I', table_name, browser_role);
            END IF;
        END LOOP;
    END LOOP;
END $$;
COMMIT;
