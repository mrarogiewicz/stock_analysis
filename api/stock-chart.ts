
// /api/stock-chart.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Helper function to fetch a specific URL with key rotation
async function fetchWithKeyRotation(baseUrl: string, keys: string[]) {
    let lastData = null;

    for (const apiKey of keys) {
        const url = `${baseUrl}&apikey=${apiKey}`;

        try {
            const response = await fetch(url);
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
                // We treat this as a failure for this specific key/request
                console.error(`API Error with key ending ...${apiKey?.slice(-4)}: ${data["Error Message"]}`);
                // We might want to try another key if it's weird, or just return the error
                // For now, let's assume an error message means the ticker is wrong or param is wrong, 
                // but strictly, we return it so the caller can decide.
                return { error: data["Error Message"] };
            }

            // Success
            return data;

        } catch (error) {
            console.error(`Error with key ending ...${apiKey?.slice(-4)}:`, error);
            continue;
        }
    }

    // Exhausted all keys
    if (lastData && (lastData["Note"] || lastData["Information"])) {
        const msg = lastData["Note"] || lastData["Information"];
        return { error: "API rate limit exceeded on all keys.", details: msg };
    }

    return { error: "Failed to fetch data after trying all available API keys." };
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

    // Base URLs
    const baseIntraday = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${ticker}&interval=15min`;
    const baseDaily = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=full`;
    const baseWeekly = `https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY&symbol=${ticker}`;
    const baseMonthly = `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY&symbol=${ticker}`;

    try {
        // We fetch sequentially to respect the key rotation logic without triggering race conditions on the keys array
        // (though fetchWithKeyRotation uses a local copy of the array, the endpoints are distinct).
        // Parallel fetching is faster but risks hitting rate limits faster if keys are shared.
        // Given the requirement "run all endpoints", we do them all.

        const [intraday, daily, weekly, monthly] = await Promise.all([
            fetchWithKeyRotation(baseIntraday, keys),
            fetchWithKeyRotation(baseDaily, keys),
            fetchWithKeyRotation(baseWeekly, keys),
            fetchWithKeyRotation(baseMonthly, keys)
        ]);

        // Construct composite response
        const responseData = {
            intraday,
            daily,
            weekly,
            monthly,
            _debugUrl: `Fetched for ${ticker} using pooled keys.`
        };

        return res.status(200).json(responseData);

    } catch (error) {
        console.error("Global error in stock chart handler:", error);
        return res.status(500).json({ error: "An unexpected error occurred while fetching chart data." });
    }
}
