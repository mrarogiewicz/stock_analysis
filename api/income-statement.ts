
// /api/income-statement.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

async function fetchWithRetry(url: string, keys: string[]) {
    let lastData = null;
    let lastUrl = "";

    for (const apiKey of keys) {
        const fetchUrl = `${url}&apikey=${apiKey}`;
        lastUrl = fetchUrl;

        try {
            const response = await fetch(fetchUrl);
            if (!response.ok) {
                console.error(`Failed fetch with key ending ...${apiKey?.slice(-4)} status: ${response.status}`);
                continue;
            }

            const data = await response.json();
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

            // Check for specific error messages
            if (data["Error Message"]) {
                console.error(`API Error with key ending ...${apiKey?.slice(-4)}: ${data["Error Message"]}`);
                return { error: data["Error Message"] };
            }

            return data;

        } catch (error) {
            console.error(`Error with key ending ...${apiKey?.slice(-4)}:`, error);
            continue;
        }
    }

    // Exhausted all keys
    if (lastData && (lastData["Note"] || lastData["Information"])) {
        return { error: "API rate limit exceeded on all keys." };
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

    // Fetch Income Statement
    const incomeUrl = `https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${ticker}`;
    const incomeData = await fetchWithRetry(incomeUrl, keys);

    // Fetch Earnings (contains estimates)
    // using 'EARNINGS' as it contains reported and estimated EPS. 
    // If 'EARNINGS_ESTIMATES' was intended as a specific endpoint, sticking to 'EARNINGS' is safer for standard keys.
    const earningsUrl = `https://www.alphavantage.co/query?function=EARNINGS&symbol=${ticker}`;
    const earningsData = await fetchWithRetry(earningsUrl, keys);

    return res.status(200).json({
        income: incomeData.error ? null : incomeData,
        earnings: earningsData.error ? null : earningsData
    });
}
