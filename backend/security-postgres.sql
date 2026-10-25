-- This schema is server-only, outside the Supabase public API schema.
REVOKE ALL ON SCHEMA rotom FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA rotom FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA rotom REVOKE ALL ON TABLES FROM PUBLIC;
DO $$
DECLARE t RECORD; r TEXT;
BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='rotom' LOOP
  EXECUTE format('ALTER TABLE rotom.%I ENABLE ROW LEVEL SECURITY',t.tablename);
 END LOOP;
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=r) THEN
   EXECUTE format('REVOKE ALL ON SCHEMA rotom FROM %I',r);
   EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA rotom FROM %I',r);
  END IF;
 END LOOP;
END $$;
