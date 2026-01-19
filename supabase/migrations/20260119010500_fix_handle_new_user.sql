-- Migration: Fix handle_new_user trigger with last_active_at
-- Includes unique slugs and explicit column for organization_members

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

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
  org_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  ) || '''s Organization';

  org_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  org_slug := org_slug || '-' || to_char(now(), 'YYYYMMDDHH24MISS');

  INSERT INTO public.organizations (name, slug, type)
  VALUES (org_name, org_slug, 'restaurant')
  RETURNING id INTO new_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role, last_active_at)
  VALUES (new_org_id, NEW.id, 'owner', NOW());

  INSERT INTO public.profiles (id, email, full_name, current_organization_id)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', new_org_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
