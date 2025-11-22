
// /api/company-overview.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { ticker } = req.query;

    if (!ticker || typeof ticker !== 'string') {
        return res.status(400).json({ error: "Ticker is required and must be a string." });
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

    let lastData = null;

    for (const apiKey of keys) {
        const alphaVantageUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${apiKey}`;

        try {
            const alphaVantageResponse = await fetch(alphaVantageUrl);
            
            if (!alphaVantageResponse.ok) {
                console.error(`Failed fetch with key ending ...${apiKey?.slice(-4)} status: ${alphaVantageResponse.status}`);
                continue; 
            }
            
            const data = await alphaVantageResponse.json();
            lastData = data;

            // Check for rate limit messages
            const note = data["Note"] || data["Information"];
            if (note && (
                note.includes("rate limit") || 
                note.includes("call frequency") || 
                note.includes("requests per day") ||
                note.includes("higher API call frequency")
            )) {
                console.log(`Rate limit hit for key ending ...${apiKey?.slice(-4)}. trying next key.`);
                continue;
            }

            // Alpha Vantage returns an error message for invalid tickers
            if (data["Error Message"]) {
                 return res.status(400).json({ error: data["Error Message"] });
            }
            
            // If empty object is returned (sometimes happens with invalid tickers)
            if (Object.keys(data).length === 0) {
                 return res.status(404).json({ error: 'No overview data found for this ticker.' });
            }

            return res.status(200).json(data);

        } catch (error) {
            console.error(`Error with key ending ...${apiKey?.slice(-4)}:`, error);
            continue;
        }
    }

    // If we exhausted all keys
    if (lastData && (lastData["Note"] || lastData["Information"])) {
        const msg = lastData["Note"] || lastData["Information"];
        return res.status(429).json({ error: "API rate limit exceeded on all keys.", details: msg });
    }

    return res.status(500).json({ error: "Failed to fetch company overview data after trying all available API keys." });
}
