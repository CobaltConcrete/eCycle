import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL;
const key = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY;

// Only a publishable (or legacy anon) key belongs in the browser bundle.
export const supabase = url && key ? createClient(url, key) : null;

export function requireSupabase() {
    if (!supabase) throw new Error('Sign-in is not configured. Please contact the site owner.');
    return supabase;
}
