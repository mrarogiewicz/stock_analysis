
// /api/company-overview.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

async function fetchWithRetry(urlBase: string, keys: string[]) {
    let lastData = null;
    for (const apiKey of keys) {
        const url = `${urlBase}&apikey=${apiKey}`;
        try {
            const resp = await fetch(url);
            if (!resp.ok) {
                console.error(`Failed fetch with key ending ...${apiKey?.slice(-4)} status: ${resp.status}`);
                continue;
            }
            const data = await resp.json();
            lastData = data;
            
            const note = data["Note"] || data["Information"];
            if (note && (note.includes("rate limit") || note.includes("call frequency"))) {
                console.log(`Rate limit hit for key ending ...${apiKey?.slice(-4)}`);
                continue;
            }
            if (data["Error Message"]) return { error: data["Error Message"] };
            
            return data;
        } catch (e) {
            console.error(`Error with key ending ...${apiKey?.slice(-4)}:`, e);
            continue;
        }
    }
    
    if (lastData && (lastData["Note"] || lastData["Information"])) {
         return { error: "Rate limit exceeded on all keys." };
    }
    return { error: "Failed to fetch data." };
}

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

    const overviewUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}`;
    const quoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}`;

    // Fetch Overview
    const overviewData = await fetchWithRetry(overviewUrl, keys);
    
    if (overviewData.error) {
         return res.status(400).json(overviewData);
    }
    if (Object.keys(overviewData).length === 0) {
        return res.status(404).json({ error: 'No overview data found for this ticker.' });
    }

    // Fetch Current Price
    const quoteData = await fetchWithRetry(quoteUrl, keys);

    // Merge results
    const result = {
        ...overviewData,
        ...quoteData
    };

    return res.status(200).json(result);
}
