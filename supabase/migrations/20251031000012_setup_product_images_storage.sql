-- Migration: Setup product images storage bucket

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view product images (public bucket)
CREATE POLICY "Public can view product images" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'product-images');

-- Policy: Admins can upload product images
CREATE POLICY "Admins can upload product images" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images' AND
    is_admin()
  );

-- Policy: Admins can update product images
CREATE POLICY "Admins can update product images" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images' AND
    is_admin()
  );

-- Policy: Admins can delete product images
CREATE POLICY "Admins can delete product images" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images' AND
    is_admin()
  );

-- Comment
COMMENT ON TABLE storage.buckets IS 'Storage buckets for file uploads';
