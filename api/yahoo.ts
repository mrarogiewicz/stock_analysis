// /api/yahoo.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { quoteSummary } from 'yahoo-finance2';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ticker = (req.query.ticker as string || 'AAPL').toUpperCase().trim();
  if (!ticker) {
      return res.status(400).json({ error: 'Ticker query parameter is required.' });
  }

  try {
    const summary = await quoteSummary(ticker, { 
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
