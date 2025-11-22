
// /api/stock-chart.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { ticker, range } = req.query;

    if (!ticker || typeof ticker !== 'string') {
        return res.status(400).json({ error: "Ticker is required and must be a string." });
    }

    // Use environment variable for the API key
    const apiKey = process.env.ALPHA_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "The 'ALPHA_KEY' environment variable is not set on the server." });
    }

    // Determine the function and parameters based on the requested range
    let func = 'TIME_SERIES_DAILY';
    let interval = '';
    
    // range maps to: 
    // '1D' -> INTRADAY (15min)
    // '1M', '3M' -> DAILY (90 days compact)
    // '1Y', 'YTD' -> WEEKLY (Full history)
    // '5Y', 'All' -> MONTHLY (Full history)
    
    switch (range) {
        case '1D':
            func = 'TIME_SERIES_INTRADAY';
            interval = '&interval=15min';
            break;
        case '1M':
        case '3M':
            func = 'TIME_SERIES_DAILY';
            break;
        case '1Y':
        case 'YTD':
            func = 'TIME_SERIES_WEEKLY';
            break;
        case '5Y':
        case 'All':
            func = 'TIME_SERIES_MONTHLY';
            break;
        default:
            func = 'TIME_SERIES_DAILY'; // Default fallback
    }

    const alphaVantageUrl = `https://www.alphavantage.co/query?function=${func}&symbol=${ticker}${interval}&apikey=${apiKey}`;

    try {
        const alphaVantageResponse = await fetch(alphaVantageUrl);
        if (!alphaVantageResponse.ok) {
            return res.status(alphaVantageResponse.status).json({ error: "Failed to fetch data from Alpha Vantage." });
        }
        
        const data = await alphaVantageResponse.json();

        // Alpha Vantage returns an error message or note in the JSON payload for invalid requests/limits.
        if (data["Error Message"] || data["Note"]) {
             return res.status(400).json({ error: data["Error Message"] || data["Note"] || 'Invalid request to Alpha Vantage API.' });
        }

        // Inject debug info (optional, can be removed in prod)
        data._debugUrl = alphaVantageUrl; 
        data._requestedRange = range;

        return res.status(200).json(data);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return res.status(500).json({ error: errorMessage });
    }
}
