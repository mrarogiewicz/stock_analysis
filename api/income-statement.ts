// /api/income-statement.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { ticker } = req.query;

    if (!ticker || typeof ticker !== 'string') {
        return res.status(400).json({ error: "Ticker is required and must be a string." });
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
