-- DUMMY TEST DATA FOR TEXTPOST
-- Copy and paste this into your Supabase SQL Editor

-- 1. Insert Dummy Users
INSERT INTO public.users (username, password)
VALUES 
  ('tester_alpha', 'password123'),
  ('tester_beta', 'password123'),
  ('admin_user', 'admin_pass')
ON CONFLICT (username) DO NOTHING;

-- 2. Insert Dummy Posts
INSERT INTO public.posts (username, content, created_at)
VALUES 
  ('tester_alpha', 'Hello world! This is my first test post.', NOW() - INTERVAL '2 hours'),
  ('tester_beta', 'Supabase is working great with this app!', NOW() - INTERVAL '1 hour'),
  ('admin_user', 'System maintenance scheduled for midnight.', NOW() - INTERVAL '30 minutes'),
  ('tester_alpha', 'Just testing the real-time feed updates.', NOW())
ON CONFLICT DO NOTHING;

-- 3. Verify the data
SELECT * FROM public.posts ORDER BY created_at DESC;
