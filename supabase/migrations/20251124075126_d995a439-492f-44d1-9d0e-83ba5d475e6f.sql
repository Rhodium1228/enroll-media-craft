-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload service images" ON storage.objects;
DROP POLICY IF EXISTS "Service images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update service images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete service images" ON storage.objects;

-- Allow authenticated users to upload service images
CREATE POLICY "Authenticated users can upload service images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'service-images');

-- Allow public read access to service images
CREATE POLICY "Service images are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'service-images');

-- Allow authenticated users to update service images
CREATE POLICY "Authenticated users can update service images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'service-images')
WITH CHECK (bucket_id = 'service-images');

-- Allow authenticated users to delete service images
CREATE POLICY "Authenticated users can delete service images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'service-images');