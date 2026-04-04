import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// TODO: Replace with your actual Supabase project credentials
export const supabaseUrl = 'https://uvolelwvfldepogojgdl.supabase.co';
export const supabaseAnonKey = 'sb_publishable_tQqeObmCj2pHzs5019o-SQ_RKZbg1id';

export const isSupabaseConfigured = supabaseUrl !== 'YOUR_SUPABASE_URL';

export let supabase;

try {
    if (isSupabaseConfigured) {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
        console.log("Supabase correctly initialized!");
    } else {
        console.warn("Supabase config is missing placeholder values. DB actions are disabled.");
    }
} catch (e) {
    console.error("Supabase initialization failed.", e);
}
