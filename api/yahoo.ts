// /api/yahoo.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ticker = (req.query.ticker as string || 'AAPL').toUpperCase().trim();
  if (!ticker) {
      return res.status(400).json({ error: 'Ticker query parameter is required.' });
  }

  try {
    // This robust import pattern handles various CJS/ESM module interop issues.
    const module = await import('yahoo-finance2');
    const yahooFinance = module.default || module;

    // Defensive check to ensure the function exists before calling it.
    if (typeof yahooFinance.quoteSummary !== 'function') {
      console.error("yahoo-finance2 module loaded incorrectly. 'quoteSummary' function not found.");
      return res.status(500).json({ error: "Server configuration error: Failed to load financial data library." });
    }

    const summary = await yahooFinance.quoteSummary(ticker, { 
        // Added 'summaryDetail' to get more data like 52-week range and price-to-sales
        modules: ['financialData', 'defaultKeyStatistics', 'price', 'summaryDetail'] 
    });
    
    // Set a small cache control header
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
    
    return res.status(500).json({ error: errorMessage });
  }
}
