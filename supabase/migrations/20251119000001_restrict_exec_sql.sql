-- Migration: Restrict exec_sql RPC to ops tooling only
-- Purpose: Ensure exec_sql can only be called from controlled ops tools (scripts, CLI)
--          and not from the application runtime
-- Date: 2025-11-19

-- Drop existing exec_sql function if it exists (to recreate with proper restrictions)
DROP FUNCTION IF EXISTS exec_sql(sql TEXT) CASCADE;
DROP FUNCTION IF EXISTS exec_sql(sql_query TEXT) CASCADE;

-- Create exec_sql function with restricted permissions
-- This function is intended ONLY for use by ops scripts and Supabase CLI
-- It should NEVER be called from the application runtime
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS TABLE(result TEXT) AS $$
BEGIN
  -- This function is restricted to postgres role only
  -- Application code should never call this function
  RETURN QUERY EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke all permissions from public and authenticated roles
REVOKE ALL ON FUNCTION exec_sql(sql TEXT) FROM public;
REVOKE ALL ON FUNCTION exec_sql(sql TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION exec_sql(sql TEXT) FROM anon;

-- Grant only to postgres role (for direct CLI/script access)
GRANT EXECUTE ON FUNCTION exec_sql(sql TEXT) TO postgres;

-- Add comment explaining the restriction
COMMENT ON FUNCTION exec_sql(sql TEXT) IS 
'SECURITY RESTRICTED: This function is for ops tooling only (Supabase CLI, scripts).
Application code must NEVER call this function. All schema changes must go through
Supabase migrations (supabase db push / supabase db reset).';

