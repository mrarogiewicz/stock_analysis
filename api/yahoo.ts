// /api/yahoo.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ticker = (req.query.ticker as string || 'AAPL').toUpperCase().trim();
  if (!ticker) {
      return res.status(400).json({ error: 'Ticker query parameter is required.' });
  }

  try {
    // By placing require() inside the try block, we can catch errors
    // if the module fails to load, preventing a server crash and the resulting JSON.parse error on the client.
    const yahooFinance = require('yahoo-finance2');

    const summary = await yahooFinance.quoteSummary(ticker, { 
        modules: ['financialData', 'defaultKeyStatistics', 'price', 'summaryDetail'] 
    });
    
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300');
    
    return res.status(200).json({ 
        ticker, 
        summary, 
        fetchedAt: new Date().toISOString() 
    });

  } catch (err) {
    console.error(`[api/yahoo] Error for ticker ${ticker}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
    
    if (errorMessage.includes("Cannot find module 'yahoo-finance2'")) {
        return res.status(500).json({ error: 'Server dependency error: Could not load the financial data library.' });
    }
    
    if (errorMessage.includes('Not Found') || (err as any).code === 404) {
        return res.status(404).json({ error: `Data not found for ticker: ${ticker}. It may be an invalid ticker.` });
    }
    
    return res.status(500).json({ error: `An unexpected error occurred while fetching Yahoo Finance data: ${errorMessage}` });
  }
}
