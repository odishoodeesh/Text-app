-- Add image_url to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Storage Policies (Assuming bucket name is 'post-images')
-- Enable storage for anyone to view and authenticated to upload
-- Note: You MUST create the bucket named 'post-images' in the Supabase Dashboard first.

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'post-images');

CREATE POLICY "Authenticated users can upload images" ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'post-images');

CREATE POLICY "Users can delete their own image" ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'post-images' AND owner = auth.uid());
