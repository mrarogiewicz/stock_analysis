// /api/yahoo.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { quoteSummary } from 'yahoo-finance2';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ticker = (req.query.ticker as string || 'AAPL').toUpperCase().trim();
  if (!ticker) {
      return res.status(400).json({ error: 'Ticker query parameter is required.' });
  }

  try {
    // The named import directly provides the function, resolving previous module issues.
    if (typeof quoteSummary !== 'function') {
      // This is a defensive check; the import itself should fail if the function doesn't exist.
      console.error("[api/yahoo] Critical error: 'quoteSummary' could not be imported as a function.");
      throw new Error("Server configuration error: Failed to load financial data library.");
    }

    const summary = await quoteSummary(ticker, { 
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
    
    if (errorMessage.includes("Failed to load financial data library")) {
        return res.status(500).json({ error: errorMessage });
    }
    
    // Check for 404-like errors from the library
    if (errorMessage.includes('Not Found') || (err as any).code === 404 || errorMessage.includes('No data found')) {
        return res.status(404).json({ error: `Data not found for ticker: ${ticker}. It may be an invalid ticker.` });
    }
    
    return res.status(500).json({ error: `An unexpected error occurred while fetching Yahoo Finance data: ${errorMessage}` });
  }
}
