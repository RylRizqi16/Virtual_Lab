const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
const isSupabaseConfigured = supabaseUrl !== '' && (supabaseServiceKey !== '' || supabaseAnonKey !== '');

if (!isSupabaseConfigured) {
    console.warn(
        '⚠️ Supabase is not configured for backend. Please add to .env:\n' +
        'SUPABASE_URL=your-supabase-url\n' +
        'SUPABASE_SERVICE_KEY=your-service-key (for admin operations)\n' +
        'SUPABASE_ANON_KEY=your-anon-key\n'
    );
}

// Use service key for backend (has more permissions) or fallback to anon key
const supabase = isSupabaseConfigured 
    ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
    : null;

module.exports = {
    supabase,
    isSupabaseConfigured,
};
