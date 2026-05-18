import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://ltbejwoffguhrntmkskd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0YmVqd29mZmd1aHJudG1rc2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMzg4MTcsImV4cCI6MjA4MTM5ODgxN30.I0KHDKH_pfyAKyYh0E1sVB5T2JUxtD6jb-Bt22HrZFo');

async function test() {
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, role, full_name');
  console.log('Profiles:', profiles, pErr);
  const { data: routingData, error: rErr } = await supabase.from('system_settings').select('value').eq('key', 'whatsapp_routing').maybeSingle();
  console.log('Routing Data:', routingData, rErr);
}
test();
