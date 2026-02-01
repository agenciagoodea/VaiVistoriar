CREATE TABLE IF NOT EXISTS cookie_consents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    user_agent TEXT,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE cookie_consents ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert consent (for anon session tracking)
CREATE POLICY "Enable insert for all users" ON cookie_consents
    FOR INSERT WITH CHECK (true);

-- Allow admins to read
CREATE POLICY "Enable read for admin only" ON cookie_consents
    FOR SELECT USING (auth.role() = 'service_role');
