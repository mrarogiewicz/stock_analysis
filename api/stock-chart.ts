
// /api/stock-chart.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { ticker } = req.query;

    if (!ticker || typeof ticker !== 'string') {
        return res.status(400).json({ error: "Ticker is required and must be a string." });
    }

    // Use environment variable for the API key
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

        // Alpha Vantage returns an error message or note in the JSON payload for invalid requests/limits.
        // We will include the debugUrl even in error cases if possible, but usually we return early.
        // For this specific debugging request, let's try to pass the data through even if it looks suspicious, 
        // or attach the URL to the error response if possible, but standard JSON response is safer.
        
        if (data["Error Message"] || data["Note"]) {
             // Include URL in error for debugging if needed, but sticking to existing pattern mostly.
             return res.status(400).json({ 
                 error: data["Error Message"] || data["Note"] || 'Invalid request to Alpha Vantage API.',
                 debugUrl: alphaVantageUrl 
             });
        }

        // Return data with the debug URL injected
        return res.status(200).json({ ...data, debugUrl: alphaVantageUrl });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return res.status(500).json({ error: errorMessage });
    }
}
