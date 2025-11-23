
// /api/income-statement.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

async function fetchWithKeyRotation(baseUrl: string, keys: string[]) {
    let lastData = null;
    let lastUrl = "";

    for (const apiKey of keys) {
        const url = `${baseUrl}&apikey=${apiKey}`;
        lastUrl = url;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.error(`Failed fetch with key ending ...${apiKey?.slice(-4)} status: ${response.status}`);
                continue;
            }

            const data = await response.json();
            lastData = data;

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

            if (data["Error Message"]) {
                 return { error: data["Error Message"] };
            }

            return data;

        } catch (error) {
            console.error(`Error with key ending ...${apiKey?.slice(-4)}:`, error);
            continue;
        }
    }

    if (lastData && (lastData["Note"] || lastData["Information"])) {
        const msg = lastData["Note"] || lastData["Information"];
        return { error: "API rate limit exceeded.", details: msg };
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

    const incomeData = await fetchWithKeyRotation(incomeUrl, keys);
    const balanceData = await fetchWithKeyRotation(balanceUrl, keys);
    const sharesData = await fetchWithKeyRotation(sharesUrl, keys);

    // If critical income data is missing, fail. Balance/Shares are supplementary.
    if (incomeData.error || !incomeData.annualReports) {
        return res.status(400).json({ error: incomeData.error || "Failed to fetch income statement." });
    }

    return res.status(200).json({
        income: incomeData,
        balance: balanceData,
        shares: sharesData
    });
}
