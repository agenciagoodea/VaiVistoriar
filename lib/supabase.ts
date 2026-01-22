
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmrgzaoexmjilvbuduek.supabase.co';
const supabaseAnonKey = 'sb_publishable_jD3NgKax7-Hji9-5zvUWGw_2KdanWcU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
