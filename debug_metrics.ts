import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRPCs() {
    console.log('Testing get_dashboard_metrics...');
    const { data: metrics, error: metricsError } = await supabase.rpc('get_dashboard_metrics');

    if (metricsError) {
        console.error('FAILED get_dashboard_metrics:', JSON.stringify(metricsError, null, 2));
    } else {
        console.log('SUCCESS get_dashboard_metrics:', metrics);
    }

    console.log('\nTesting check_pending_alerts...');
    // Need a user ID to test this, will fail if no user, but if function misses it will say "function not found"
    // We'll just try invoking it. If it says "function not found", we know the issue.
    // If it says "argument missing" or similar, the function exists.
    const { data: alerts, error: alertsError } = await supabase.rpc('check_pending_alerts', { requesting_user_id: '00000000-0000-0000-0000-000000000000' });

    if (alertsError) {
        console.error('FAILED check_pending_alerts:', JSON.stringify(alertsError, null, 2));
    } else {
        console.log('SUCCESS check_pending_alerts:', alerts);
    }
}

testRPCs();
