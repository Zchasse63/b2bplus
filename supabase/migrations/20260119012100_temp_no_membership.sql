-- Temporarily remove membership insert to isolate issue
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
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

  -- Skip membership - just create org and profile
  INSERT INTO public.profiles (id, email, full_name, current_organization_id)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', new_org_id);

  RETURN NEW;
END;
$$;
