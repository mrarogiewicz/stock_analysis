// /api/save-analysis.ts
import { put } from '@vercel/blob';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Vercel's body parser middleware handles JSON parsing for this runtime
    const { ticker, content } = request.body;

    if (!ticker || !content) {
      return response.status(400).json({ error: 'Ticker and content are required.' });
    }

    // Sanitize ticker to be safe for filenames
    const safeTicker = ticker.replace(/[^a-zA-Z0-9]/g, '');
    const filename = `analysis/${safeTicker.toUpperCase()}-${Date.now()}.md`;

    const blob = await put(filename, content, {
      access: 'public', // The file will be publicly accessible
      contentType: 'text/markdown',
    });

    return response.status(200).json(blob);

  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return response.status(500).json({ error: 'Failed to save analysis to cloud storage.', details: errorMessage });
  }
}
