// /api/income-statement.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { ticker, yahooStats } = req.query;

    if (!ticker || typeof ticker !== 'string') {
        return res.status(400).json({ error: "Ticker is required and must be a string." });
    }

    if (yahooStats === 'true') {
        const url = `https://finance.yahoo.com/quote/${ticker}/key-statistics/`;
        try {
            // Fetch with a user-agent to mimic a browser
            const yahooResponse = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            if (!yahooResponse.ok) {
                 if (yahooResponse.status === 404) {
                    return res.status(404).json({ error: `No key statistics found for ticker: ${ticker}. It may be an invalid ticker.` });
                }
                return res.status(yahooResponse.status).json({ error: "Failed to fetch data from Yahoo Finance." });
            }
            const htmlText = await yahooResponse.text();
            return res.status(200).send(htmlText);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred while fetching from Yahoo Finance.";
            return res.status(500).json({ error: errorMessage });
        }
    }


    // Existing Alpha Vantage logic
    const apiKey = process.env.ALPHA_KEY || "CEQPZ53439BEL78O";
    const alphaVantageUrl = `https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${ticker}&apikey=${apiKey}`;

    try {
        const alphaVantageResponse = await fetch(alphaVantageUrl);
        if (!alphaVantageResponse.ok) {
            return res.status(alphaVantageResponse.status).json({ error: "Failed to fetch data from Alpha Vantage." });
        }
        
        const data = await alphaVantageResponse.json();

        // Alpha Vantage returns an error message or note in the JSON payload for invalid requests.
        if (data["Error Message"] || data["Note"]) {
             return res.status(400).json({ error: data["Error Message"] || data["Note"] || 'Invalid request to Alpha Vantage API.' });
        }

        return res.status(200).json(data);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return res.status(500).json({ error: errorMessage });
    }
}
