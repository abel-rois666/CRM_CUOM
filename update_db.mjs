import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Cargar env
const envContent = fs.readFileSync('../api-rest/.env', 'utf-8');
const envVars = envContent.split('\n').reduce((acc, line) => {
    const [key, ...value] = line.split('=');
    if (key && value) {
        acc[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
    }
    return acc;
}, {});

const supabase = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Running SQL...');
    const { data, error } = await supabase.rpc('run_sql', { query: `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS interaction_types TEXT[] DEFAULT '{}';` });
    if (error) {
        console.error('RPC run_sql might not exist, trying raw fetch to pgmeta...');
        console.error(error);
    } else {
        console.log('Success:', data);
    }
}
run();
