
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Manual config since dotenv might not pick up .env if not called correctly or if env file is not standard
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const apiKey = envConfig.VITE_OPENROUTER_API_KEY;

if (!apiKey) {
    console.error("Error: VITE_OPENROUTER_API_KEY not found in .env file.");
    process.exit(1);
}

// Mask key for safety in logs
const maskedKey = apiKey.substring(0, 10) + '...';
console.log(`Using API Key: ${maskedKey}`);

async function checkLimit() {
    try {
        const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(text);
            return;
        }

        const data = await response.json();
        console.log("\n--- API Key Information ---");
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Fetch failed:", error);
    }
}

checkLimit();
