-- ============================================================================
-- Migration: security_rls_fixes
-- Date: 2025-11-14T18:43:30Z
-- Purpose:
--   - Enable/patch RLS on exposed public tables
--   - Add minimal, safe policies where missing
--   - Move extensions out of the public schema
--   - Harden function search_path across public schema functions
--   - Ensure views run with INVOKER rights (security_invoker = on)
--
-- Notes:
-- - This migration is defensive and idempotent:
--   * Checks object existence before altering
--   * Creates policies only when absent
--   * Skips changes if already in desired state
-- - Some policies below are intentionally minimal read access for reference
--   data; refine as needed for your business rules.
-- ============================================================================

/* ----------------------------------------------------------------------------
   0) Safety settings
---------------------------------------------------------------------------- */
SET search_path TO public, extensions, pg_temp;

/* ----------------------------------------------------------------------------
   1) Move extensions out of public schema (if currently installed in 'public')
---------------------------------------------------------------------------- */

-- Ensure 'extensions' schema exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_trgm to extensions if currently in public
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm'
      AND n.nspname = 'public'
  ) THEN
    EXECUTE 'ALTER EXTENSION pg_trgm SET SCHEMA extensions';
  END IF;
END$$;

-- Move vector to extensions if currently in public
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'vector'
      AND n.nspname = 'public'
  ) THEN
    EXECUTE 'ALTER EXTENSION vector SET SCHEMA extensions';
  END IF;
END$$;

/* ----------------------------------------------------------------------------
   2) Enable RLS on exposed tables (no-ops if table missing)
   These were flagged by the security advisor
---------------------------------------------------------------------------- */

ALTER TABLE IF EXISTS public.container_types                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.discount_stacking_rules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_templates                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.template_shares                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.regions                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leads                           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.buying_groups                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customer_annual_usage           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.public_chatbot_conversations    ENABLE ROW LEVEL SECURITY;

-- "RLS enabled but no policies" findings
ALTER TABLE IF EXISTS public.email_verification_audit        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_verification_tokens       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pricing_audit                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promotional_code_audit          ENABLE ROW LEVEL SECURITY;

/* ----------------------------------------------------------------------------
   3) Minimal, safe RLS policies (create if missing)
---------------------------------------------------------------------------- */

-- 3a) email_verification_tokens
DO $policies$
BEGIN
  IF to_regclass('public.email_verification_tokens') IS NOT NULL THEN
    -- Users can read their own tokens
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = 'email_verification_tokens'
        AND policyname = 'users_can_view_own_verification_tokens'
    ) THEN
      EXECUTE $SQL$
        CREATE POLICY "users_can_view_own_verification_tokens"
          ON public.email_verification_tokens
          FOR SELECT
          USING (auth.uid() = user_id)
      $SQL$;
    END IF;

    -- Service role full control
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = 'email_verification_tokens'
        AND policyname = 'service_role_can_manage_verification_tokens'
    ) THEN
      EXECUTE $SQL$
        CREATE POLICY "service_role_can_manage_verification_tokens"
          ON public.email_verification_tokens
          FOR ALL
          USING (auth.role() = 'service_role')
          WITH CHECK (auth.role() = 'service_role')
      $SQL$;
    END IF;
  END IF;
END
$policies$;

-- 3b) email_verification_audit
DO $policies$
BEGIN
  IF to_regclass('public.email_verification_audit') IS NOT NULL THEN
    -- Users can read their own audit entries
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = 'email_verification_audit'
        AND policyname = 'users_can_view_own_verification_audit'
    ) THEN
      EXECUTE $SQL$
        CREATE POLICY "users_can_view_own_verification_audit"
          ON public.email_verification_audit
          FOR SELECT
          USING (auth.uid() = user_id)
      $SQL$;
    END IF;

    -- Service role full control
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = 'email_verification_audit'
        AND policyname = 'service_role_can_manage_verification_audit'
    ) THEN
      EXECUTE $SQL$
        CREATE POLICY "service_role_can_manage_verification_audit"
          ON public.email_verification_audit
          FOR ALL
          USING (auth.role() = 'service_role')
          WITH CHECK (auth.role() = 'service_role')
      $SQL$;
    END IF;
  END IF;
END
$policies$;

-- 3c) pricing_audit (org-scoped visibility + service role)
DO $policies$
BEGIN
  IF to_regclass('public.pricing_audit') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = 'pricing_audit'
        AND policyname = 'users_can_view_org_pricing_audit'
    ) THEN
      EXECUTE $SQL$
        CREATE POLICY "users_can_view_org_pricing_audit"
          ON public.pricing_audit
          FOR SELECT
          USING (
            organization_id IS NULL
            OR organization_id IN (
              SELECT om.organization_id
              FROM public.organization_members om
              WHERE om.user_id = auth.uid()
            )
            OR auth.role() = 'service_role'
          )
      $SQL$;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = 'pricing_audit'
        AND policyname = 'service_role_can_manage_pricing_audit'
    ) THEN
      EXECUTE $SQL$
        CREATE POLICY "service_role_can_manage_pricing_audit"
          ON public.pricing_audit
          FOR ALL
          USING (auth.role() = 'service_role')
          WITH CHECK (auth.role() = 'service_role')
      $SQL$;
    END IF;
  END IF;
END
$policies$;

-- 3d) promotional_code_audit (admin/service visibility)
DO $policies$
BEGIN
  IF to_regclass('public.promotional_code_audit') IS NOT NULL THEN
    -- Basic admin visibility via JWT claim, and service_role
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = 'promotional_code_audit'
        AND policyname = 'admins_can_view_promo_audit'
    ) THEN
      EXECUTE $SQL$
        CREATE POLICY "admins_can_view_promo_audit"
          ON public.promotional_code_audit
          FOR SELECT
          USING (
            auth.role() = 'service_role'
            OR (auth.jwt() ->> 'is_admin') = 'true'
          )
      $SQL$;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = 'promotional_code_audit'
        AND policyname = 'service_role_can_manage_promo_audit'
    ) THEN
      EXECUTE $SQL$
        CREATE POLICY "service_role_can_manage_promo_audit"
          ON public.promotional_code_audit
          FOR ALL
          USING (auth.role() = 'service_role')
          WITH CHECK (auth.role() = 'service_role')
      $SQL$;
    END IF;
  END IF;
END
$policies$;

-- 3e) Reference/config tables (read-only for authenticated users)
DO $policies$
BEGIN
  -- regions
  IF to_regclass('public.regions') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='regions'
  ) THEN
    EXECUTE 'CREATE POLICY "authenticated_can_read_regions" ON public.regions FOR SELECT TO authenticated USING (true)';
  END IF;

  -- buying_groups
  IF to_regclass('public.buying_groups') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='buying_groups'
  ) THEN
    EXECUTE 'CREATE POLICY "authenticated_can_read_buying_groups" ON public.buying_groups FOR SELECT TO authenticated USING (true)';
  END IF;

  -- container_types
  IF to_regclass('public.container_types') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='container_types'
  ) THEN
    EXECUTE 'CREATE POLICY "authenticated_can_read_container_types" ON public.container_types FOR SELECT TO authenticated USING (true)';
  END IF;

  -- discount_stacking_rules
  IF to_regclass('public.discount_stacking_rules') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='discount_stacking_rules'
  ) THEN
    EXECUTE 'CREATE POLICY "authenticated_can_read_discount_rules" ON public.discount_stacking_rules FOR SELECT TO authenticated USING (true)';
  END IF;

  -- order_templates
  IF to_regclass('public.order_templates') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='order_templates'
  ) THEN
    EXECUTE 'CREATE POLICY "authenticated_can_read_order_templates" ON public.order_templates FOR SELECT TO authenticated USING (true)';
  END IF;

  -- template_shares
  IF to_regclass('public.template_shares') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='template_shares'
  ) THEN
    EXECUTE 'CREATE POLICY "authenticated_can_read_template_shares" ON public.template_shares FOR SELECT TO authenticated USING (true)';
  END IF;
END
$policies$;

-- 3f) Leads (limit visibility to creator or admins; service role can do all)
DO $policies$
BEGIN
  IF to_regclass('public.leads') IS NOT NULL THEN
    -- Add a single SELECT policy only if no policies exist at all
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='leads'
    ) THEN
      EXECUTE $SQL$
        CREATE POLICY "leads_creator_or_admin_can_read"
          ON public.leads
          FOR SELECT TO authenticated
          USING (
            auth.role() = 'service_role'
            OR (auth.jwt() ->> 'is_admin') = 'true'
            OR created_by = auth.uid()
          )
      $SQL$;
    END IF;
  END IF;
END
$policies$;

-- 3g) Customer Annual Usage (org-scoped read for members + service role)
DO $policies$
BEGIN
  IF to_regclass('public.customer_annual_usage') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='customer_annual_usage'
    ) THEN
      EXECUTE $SQL$
        CREATE POLICY "org_members_can_read_customer_usage"
          ON public.customer_annual_usage
          FOR SELECT TO authenticated
          USING (
            organization_id IN (
              SELECT organization_id
              FROM public.organization_members
              WHERE user_id = auth.uid()
            )
            OR auth.role() = 'service_role'
          )
      $SQL$;
    END IF;
  END IF;
END
$policies$;

-- 3h) Public Chatbot Conversations (public-readable history; allow inserts for anon/auth)
DO $policies$
BEGIN
  IF to_regclass('public.public_chatbot_conversations') IS NOT NULL THEN
    -- SELECT visible to all (including anon)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='public_chatbot_conversations'
        AND policyname='public_chat_select'
    ) THEN
      EXECUTE 'CREATE POLICY "public_chat_select" ON public.public_chatbot_conversations FOR SELECT USING (true)';
    END IF;

    -- INSERT from authenticated
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='public_chatbot_conversations'
        AND policyname='public_chat_insert_auth'
    ) THEN
      EXECUTE 'CREATE POLICY "public_chat_insert_auth" ON public.public_chatbot_conversations FOR INSERT TO authenticated WITH CHECK (true)';
    END IF;

    -- INSERT from anon
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='public_chatbot_conversations'
        AND policyname='public_chat_insert_anon'
    ) THEN
      EXECUTE 'CREATE POLICY "public_chat_insert_anon" ON public.public_chatbot_conversations FOR INSERT TO anon WITH CHECK (true)';
    END IF;
  END IF;
END
$policies$;

/* ----------------------------------------------------------------------------
   4) Ensure views are SECURITY INVOKER (run with query user's rights)
---------------------------------------------------------------------------- */

DO $$
BEGIN
  -- products_without_embeddings view (if present)
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('v','m')
      AND n.nspname = 'public'
      AND c.relname = 'products_without_embeddings'
  ) THEN
    EXECUTE 'ALTER VIEW public.products_without_embeddings SET (security_invoker = on)';
  END IF;
END$$;

/* ----------------------------------------------------------------------------
   5) Harden function search_path across all public functions
   Rationale: prevent schema injection by fixing search_path to 'public, pg_temp'
---------------------------------------------------------------------------- */

DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS func_name,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f','p') -- functions and procedures
  LOOP
    -- Apply setting; ALTER FUNCTION is idempotent for SET search_path
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = %L',
      fn.schema_name,
      fn.func_name,
      fn.identity_args,
      'public, pg_temp'
    );
  END LOOP;
END$$;

/* ----------------------------------------------------------------------------
   6) Optional: tighten default privileges for future functions (commented)
   Uncomment if you want newly created functions to always inherit this.
---------------------------------------------------------------------------- */
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public
--   REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- End of migration
