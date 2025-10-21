// /api/yahoo.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import yahooFinanceModule from 'yahoo-finance2';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ticker = (req.query.ticker as string || 'AAPL').toUpperCase().trim();
  if (!ticker) {
      return res.status(400).json({ error: 'Ticker query parameter is required.' });
  }

  try {
    // Handle CJS/ESM interop issues where the actual library object might be on the .default property.
    const yahooFinance = (yahooFinanceModule as any).default || yahooFinanceModule;

    const summary = await yahooFinance.quoteSummary(ticker, { 
        modules: ['financialData', 'defaultKeyStatistics', 'price'] 
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
    // yahoo-finance2 often throws specific error messages
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
    
    // Check for common 'Not Found' errors
    if (errorMessage.includes('Not Found') || (err as any).code === 404) {
        return res.status(404).json({ error: `Data not found for ticker: ${ticker}. It may be an invalid ticker.` });
    }
    
    return res.status(500).json({ error: errorMessage });
  }
}
