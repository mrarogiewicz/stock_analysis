
import express from 'express';
import { createServer as createViteServer } from 'vite';
import type { Request, Response } from 'express';

// Import API handlers
// Note: We use .ts extension in imports because we are running with tsx
import companyOverviewHandler from './api/company-overview';
import generateAnalysisHandler from './api/generate-analysis';
import generateTranscriptSummaryHandler from './api/generate-transcript-summary';
import incomeStatementHandler from './api/income-statement';
import saveAnalysisHandler from './api/save-analysis';
import stockChartHandler from './api/stock-chart';
import summarizeEarningsHandler from './api/summarize-earnings';
import symbolSearchHandler from './api/symbol-search';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // API Routes
  // Wrap handlers to cast types if necessary, though VercelRequest/Response are compatible enough
  const wrap = (handler: any) => async (req: Request, res: Response) => {
      try {
          await handler(req, res);
      } catch (e) {
          console.error(e);
          if (!res.headersSent) {
              res.status(500).json({ error: 'Internal Server Error' });
          }
      }
  };

  app.get('/api/company-overview', wrap(companyOverviewHandler));
  app.post('/api/generate-analysis', wrap(generateAnalysisHandler));
  app.post('/api/generate-transcript-summary', wrap(generateTranscriptSummaryHandler));
  app.get('/api/income-statement', wrap(incomeStatementHandler));
  app.post('/api/save-analysis', wrap(saveAnalysisHandler));
  app.get('/api/stock-chart', wrap(stockChartHandler));
  app.post('/api/summarize-earnings', wrap(summarizeEarningsHandler));
  app.get('/api/symbol-search', wrap(symbolSearchHandler));

  // Add handler for /api/test
  app.get('/api/test', async (req, res) => {
    const { exec } = require('child_process');
    exec('python3 api/test.py', (error: any, stdout: string, stderr: string) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return res.status(500).json({ error: error.message, stderr });
      }
      try {
        // Try to parse as JSON first
        const jsonResponse = JSON.parse(stdout);
        res.json(jsonResponse);
      } catch (e) {
        // If not JSON, return as text in a JSON object
        res.json({ random_string: stdout.trim() });
      }
    });
  });

  // Vite middleware for development
  // In production, we would serve static files, but for this environment we use Vite middleware
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
