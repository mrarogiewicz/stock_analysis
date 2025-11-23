
// /api/income-statement.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Helper function to fetch a specific URL with key rotation
async function fetchWithKeyRotation(urlBase: string, keys: string[]) {
    let lastData = null;
    let lastUrl = "";

    for (const apiKey of keys) {
        const url = `${urlBase}&apikey=${apiKey}`;
        lastUrl = url;

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
        const msg = lastData["Note"] || lastData["Information"];
        return { error: "API rate limit exceeded on all keys.", details: msg };
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

    const incomeUrl = `https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${ticker}`;
    const balanceUrl = `https://www.alphavantage.co/query?function=BALANCE_SHEET&symbol=${ticker}`;
    const sharesUrl = `https://www.alphavantage.co/query?function=SHARES_OUTSTANDING&symbol=${ticker}`;
    const estimatesUrl = `https://www.alphavantage.co/query?function=EARNINGS_ESTIMATES&symbol=${ticker}`;

    // Fetch all data in parallel (or sequential if preferred, but distinct endpoints are usually okay)
    // Using sequential here to be safe with keys if they are shared, though logic handles rotation per call.
    const incomeData = await fetchWithKeyRotation(incomeUrl, keys);
    const balanceData = await fetchWithKeyRotation(balanceUrl, keys);
    const sharesData = await fetchWithKeyRotation(sharesUrl, keys);
    const estimatesData = await fetchWithKeyRotation(estimatesUrl, keys);

    // If main income data failed, return error
    if (incomeData.error) {
        return res.status(400).json({ error: incomeData.error, details: incomeData.details });
    }

    return res.status(200).json({
        income: incomeData,
        balance: balanceData,
        shares: sharesData,
        estimates: estimatesData
    });
}
