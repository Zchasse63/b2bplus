-- Migration: Standardize all TIMESTAMP columns to TIMESTAMPTZ
-- Description: Convert all timezone-naive TIMESTAMP columns to TIMESTAMPTZ
-- BEST PRACTICE: Always use TIMESTAMPTZ in PostgreSQL to avoid timezone issues
-- SECURITY: Timezone-aware timestamps prevent data integrity issues across regions

-- ===========================================================================
-- INVOICES TABLE
-- ===========================================================================

-- Convert invoices table timestamps
ALTER TABLE invoices
  ALTER COLUMN issue_date TYPE TIMESTAMPTZ USING issue_date AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

COMMENT ON COLUMN invoices.issue_date IS 'Invoice issue date (timezone-aware)';
COMMENT ON COLUMN invoices.created_at IS 'Record creation timestamp (timezone-aware)';
COMMENT ON COLUMN invoices.updated_at IS 'Record last update timestamp (timezone-aware)';

-- ===========================================================================
-- PROFILES TABLE (if role column was added with TIMESTAMP)
-- ===========================================================================

-- Check if role_audit table exists from add_admin_roles migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'role_audit'
  ) THEN
    -- Convert role_audit timestamps
    ALTER TABLE role_audit
      ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

    COMMENT ON COLUMN role_audit.created_at IS 'Audit log timestamp (timezone-aware)';
  END IF;
END $$;

-- ===========================================================================
-- CRM TABLES (Lead Management)
-- ===========================================================================

-- Convert leads table timestamps
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'leads'
  ) THEN
    EXECUTE '
      ALTER TABLE leads
        ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE ''UTC'',
        ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE ''UTC''';

    COMMENT ON COLUMN leads.created_at IS 'Lead creation timestamp (timezone-aware)';
    COMMENT ON COLUMN leads.updated_at IS 'Lead last update timestamp (timezone-aware)';
  END IF;
END $$;

-- Convert lead_activities table timestamps
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'lead_activities'
  ) THEN
    EXECUTE '
      ALTER TABLE lead_activities
        ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE ''UTC'',
        ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE ''UTC''';

    COMMENT ON COLUMN lead_activities.created_at IS 'Activity timestamp (timezone-aware)';
    COMMENT ON COLUMN lead_activities.updated_at IS 'Activity update timestamp (timezone-aware)';
  END IF;
END $$;

-- Convert lead_notes table timestamps
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'lead_notes'
  ) THEN
    EXECUTE '
      ALTER TABLE lead_notes
        ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE ''UTC'',
        ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE ''UTC''';

    COMMENT ON COLUMN lead_notes.created_at IS 'Note creation timestamp (timezone-aware)';
    COMMENT ON COLUMN lead_notes.updated_at IS 'Note update timestamp (timezone-aware)';
  END IF;
END $$;

-- Convert lead_documents table timestamps
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'lead_documents'
  ) THEN
    EXECUTE '
      ALTER TABLE lead_documents
        ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE ''UTC''';

    COMMENT ON COLUMN lead_documents.created_at IS 'Document upload timestamp (timezone-aware)';
  END IF;
END $$;

-- Convert magic_links table timestamps
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'magic_links'
  ) THEN
    EXECUTE '
      ALTER TABLE magic_links
        ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at AT TIME ZONE ''UTC'',
        ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE ''UTC''';

    COMMENT ON COLUMN magic_links.expires_at IS 'Link expiration timestamp (timezone-aware)';
    COMMENT ON COLUMN magic_links.created_at IS 'Link creation timestamp (timezone-aware)';
  END IF;
END $$;

-- Convert opportunities table timestamps
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'opportunities'
  ) THEN
    EXECUTE '
      ALTER TABLE opportunities
        ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE ''UTC'',
        ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE ''UTC''';

    COMMENT ON COLUMN opportunities.created_at IS 'Opportunity creation timestamp (timezone-aware)';
    COMMENT ON COLUMN opportunities.updated_at IS 'Opportunity update timestamp (timezone-aware)';
  END IF;
END $$;

-- Convert opportunity_products table timestamps
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'opportunity_products'
  ) THEN
    EXECUTE '
      ALTER TABLE opportunity_products
        ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE ''UTC''';

    COMMENT ON COLUMN opportunity_products.created_at IS 'Product added timestamp (timezone-aware)';
  END IF;
END $$;

-- Convert sales_pipeline table timestamps
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'sales_pipeline'
  ) THEN
    EXECUTE '
      ALTER TABLE sales_pipeline
        ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE ''UTC'',
        ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE ''UTC''';

    COMMENT ON COLUMN sales_pipeline.created_at IS 'Pipeline stage creation timestamp (timezone-aware)';
    COMMENT ON COLUMN sales_pipeline.updated_at IS 'Pipeline stage update timestamp (timezone-aware)';
  END IF;
END $$;

-- Convert lead_tags table timestamps
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'lead_tags'
  ) THEN
    EXECUTE '
      ALTER TABLE lead_tags
        ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE ''UTC'',
        ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE ''UTC''';

    COMMENT ON COLUMN lead_tags.created_at IS 'Tag creation timestamp (timezone-aware)';
    COMMENT ON COLUMN lead_tags.updated_at IS 'Tag update timestamp (timezone-aware)';
  END IF;
END $$;

-- Convert lead_tag_assignments table timestamps
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'lead_tag_assignments'
  ) THEN
    EXECUTE '
      ALTER TABLE lead_tag_assignments
        ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE ''UTC'',
        ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE ''UTC''';

    COMMENT ON COLUMN lead_tag_assignments.created_at IS 'Tag assignment timestamp (timezone-aware)';
    COMMENT ON COLUMN lead_tag_assignments.updated_at IS 'Tag assignment update timestamp (timezone-aware)';
  END IF;
END $$;

-- ===========================================================================
-- VERIFICATION QUERY
-- ===========================================================================

-- List any remaining non-timezone-aware TIMESTAMP columns
-- This query helps verify the migration was successful
DO $$
DECLARE
  rec RECORD;
  found_issues BOOLEAN := FALSE;
BEGIN
  FOR rec IN
    SELECT
      table_name,
      column_name,
      data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type = 'timestamp without time zone'
    ORDER BY table_name, column_name
  LOOP
    IF NOT found_issues THEN
      RAISE NOTICE '==================================================';
      RAISE NOTICE 'WARNING: Found remaining non-timezone-aware timestamps:';
      RAISE NOTICE '==================================================';
      found_issues := TRUE;
    END IF;
    RAISE NOTICE 'Table: %, Column: %', rec.table_name, rec.column_name;
  END LOOP;

  IF NOT found_issues THEN
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'SUCCESS: All timestamps are now timezone-aware!';
    RAISE NOTICE '==================================================';
  END IF;
END $$;

-- ===========================================================================
-- BEST PRACTICES REMINDER
-- ===========================================================================

COMMENT ON SCHEMA public IS
  'TIMESTAMP BEST PRACTICE: Always use TIMESTAMPTZ (timestamp with time zone) instead of TIMESTAMP. '
  'This ensures timestamps are stored in UTC and properly converted for different timezones. '
  'Updated: ' || NOW()::TEXT;
