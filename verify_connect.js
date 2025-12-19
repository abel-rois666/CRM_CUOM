
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

console.log(`Checking connection to: ${url}`);
console.log(`Using Key (first 10 chars): ${key ? key.substring(0, 10) + '...' : 'UNDEFINED'}`);

if (!url || !key) {
    console.error('ERROR: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
    try {
        // Try to fetch 1 row from leads (assuming public read access or simple anon check)
        // If RLS is ON and no policy allows anon select, this might return 0 rows but NOT an error (200 OK).
        // If Key is invalid, it will return 401 Error.
        const { data, error } = await supabase.from('leads').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Connection FAILED:', error.message, error.code, error.details);
        } else {
            console.log('✅ Connection SUCCESSFUL!');
            console.log('Data/Response:', data);
        }
    } catch (e) {
        console.error('❌ Unexpected Error:', e);
    }
}

check();
