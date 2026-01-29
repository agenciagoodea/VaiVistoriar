
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cmrgzaoexmjilvbuduek.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_jD3NgKax7-Hji9-5zvUWGw_2KdanWcU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
