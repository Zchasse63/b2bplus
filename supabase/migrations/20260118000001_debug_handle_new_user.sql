-- Migration: Fixed handle_new_user trigger
-- Bypasses RLS and uses unique slugs

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  org_name TEXT;
  org_slug TEXT;
BEGIN
  -- Calculate org name
  org_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  ) || '''s Organization';

  -- Calculate slug with timestamp for uniqueness
  org_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  org_slug := org_slug || '-' || to_char(now(), 'YYYYMMDDHH24MISS');

  -- Create organization (bypasses RLS due to SECURITY DEFINER + search_path)
  INSERT INTO public.organizations (name, slug, type)
  VALUES (org_name, org_slug, 'restaurant')
  RETURNING id INTO new_org_id;

  -- Create organization membership
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, current_organization_id)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', new_org_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

COMMENT ON FUNCTION handle_new_user() IS 'Creates profile and organization for new users (debug version with better error handling)';
