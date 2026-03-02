
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { keywords } = req.query;

    if (!keywords || typeof keywords !== 'string') {
        return res.status(400).json({ error: "Keywords are required and must be a string." });
    }

    const keys = [
        process.env.ALPHA_KEY,
        process.env.ALPHA_KEY_2,
        process.env.ALPHA_KEY_3,
        process.env.ALPHA_KEY_4,
        process.env.ALPHA_KEY_5
    ].filter(Boolean);

    if (keys.length === 0) {
        return res.status(500).json({ error: "The 'ALPHA_KEY' environment variables are not set on the server." });
    }

    // Try keys sequentially until one works
    for (const apiKey of keys) {
        const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${keywords}&apikey=${apiKey}`;
        
        try {
            const resp = await fetch(url);
            if (!resp.ok) {
                console.error(`Failed fetch with key ending ...${apiKey?.slice(-4)} status: ${resp.status}`);
                continue;
            }
            
            const data = await resp.json();
            
            // Check for API limit note
            const note = data["Note"] || data["Information"];
            if (note && (note.includes("rate limit") || note.includes("call frequency"))) {
                console.log(`Rate limit hit for key ending ...${apiKey?.slice(-4)}`);
                continue;
            }
            
            if (data["Error Message"]) {
                // If specific error, maybe try next key or return error? 
                // Usually error message means bad input, not bad key, but let's be safe.
                console.error(`API Error with key ending ...${apiKey?.slice(-4)}:`, data["Error Message"]);
                continue; 
            }

            // Success
            return res.status(200).json(data);
            
        } catch (e) {
            console.error(`Error with key ending ...${apiKey?.slice(-4)}:`, e);
            continue;
        }
    }

    return res.status(429).json({ error: "Rate limit exceeded on all keys or failed to fetch data." });
}
