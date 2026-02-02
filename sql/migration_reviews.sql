-- Create the table for storing user reviews
CREATE TABLE IF NOT EXISTS system_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE system_reviews ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to insert their own reviews
CREATE POLICY "Users can insert their own reviews" ON system_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to view their own reviews (to prevent duplicate prompts)
CREATE POLICY "Users can view their own reviews" ON system_reviews
  FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow admins to view all reviews (optional, add if needed)
-- CREATE POLICY "Admins can view all reviews" ON system_reviews
--   FOR SELECT USING (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
