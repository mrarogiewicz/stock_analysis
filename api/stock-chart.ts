
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { ticker } = req.query;

    if (!ticker || typeof ticker !== 'string') {
        return res.status(400).json({ error: "Ticker is required and must be a string." });
    }

    const apiKey = process.env.ALPHA_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "The 'ALPHA_KEY' environment variable is not set on the server." });
    }

    const alphaVantageUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=full&apikey=${apiKey}`;

    try {
        const alphaVantageResponse = await fetch(alphaVantageUrl);
        if (!alphaVantageResponse.ok) {
            return res.status(alphaVantageResponse.status).json({ error: "Failed to fetch data from Alpha Vantage." });
        }
        
        const data = await alphaVantageResponse.json();

        if (data["Error Message"] || data["Note"]) {
             return res.status(400).json({ error: data["Error Message"] || data["Note"] || 'Invalid request to Alpha Vantage API.' });
        }
        
        if (!data["Time Series (Daily)"]) {
             return res.status(404).json({ error: 'No time series data found for this ticker.' });
        }

        return res.status(200).json(data);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return res.status(500).json({ error: errorMessage });
    }
}
