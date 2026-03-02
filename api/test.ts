
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exec } from 'child_process';
import path from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log("Handler /api/test hit");
    
    // Resolve the path to the python script
    // In Vercel/serverless, files might be in different places, but for local dev:
    const scriptPath = path.join(process.cwd(), 'api', 'test.py');
    
    exec(`python3 "${scriptPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).json({ error: error.message, stderr });
        }
        try {
            // Try to parse as JSON first
            const jsonResponse = JSON.parse(stdout);
            res.json(jsonResponse);
        } catch (e) {
            // If not JSON, return as text in a JSON object
            res.json({ random_string: stdout.trim() });
        }
    });
}
