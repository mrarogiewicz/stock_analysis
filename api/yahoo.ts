// /api/yahoo.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Use require for robust CJS module loading in a Node.js serverless environment.
// This is more stable than ES6 imports for certain libraries.
const yahooFinance = require('yahoo-finance2');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ticker = (req.query.ticker as string || 'AAPL').toUpperCase().trim();
  if (!ticker) {
      return res.status(400).json({ error: 'Ticker query parameter is required.' });
  }

  try {
    // Defensively access the quoteSummary function, which may be on the default export
    const quoteSummaryFn = yahooFinance.default?.quoteSummary || yahooFinance.quoteSummary;
    
    if (typeof quoteSummaryFn !== 'function') {
        // This will now be a clean JSON error response instead of a server crash
        return res.status(500).json({ error: 'Server configuration error: Financial data library failed to load.' });
    }

    const summary = await quoteSummaryFn(ticker, { 
        modules: ['financialData', 'defaultKeyStatistics', 'price', 'summaryDetail'] 
    });
    
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300');
    
    return res.status(200).json({ 
        ticker, 
        summary, 
        fetchedAt: new Date().toISOString() 
    });

  } catch (err) {
    console.error(`Error fetching Yahoo Finance data for ${ticker}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
    
    if (errorMessage.includes('Not Found') || (err as any).code === 404) {
        return res.status(404).json({ error: `Data not found for ticker: ${ticker}. It may be an invalid ticker.` });
    }
    
    // Ensure all error paths return valid JSON
    return res.status(500).json({ error: errorMessage });
  }
}
