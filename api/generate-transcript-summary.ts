
import { GoogleGenAI } from '@google/genai';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { transcriptText, ticker, quarter } = request.body;
    if (!transcriptText) {
        return response.status(400).json({ error: 'Transcript text is required.' });
    }

    if (!process.env.API_KEY) {
        return response.status(500).json({ error: 'Server API key configuration missing.' });
    }

    // Fetch the prompt template from GitHub
    const promptUrl = 'https://raw.githubusercontent.com/mrarogiewicz/prompts/58a7ec6c1a7a09ff0271acf466b6997a2d8ad609/earnings_transcript_summarization.md';
    const promptResponse = await fetch(promptUrl);

    if (!promptResponse.ok) {
        throw new Error(`Failed to fetch prompt template from GitHub: ${promptResponse.statusText}`);
    }

    const systemInstruction = await promptResponse.text();

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const userPrompt = `Now produce the investor-style executive summary for the following transcript for ${ticker} (${quarter}):\n\n${transcriptText}`;

    // Using gemini-2.5-flash for reliable summarization and large context handling
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction
      }
    });

    return response.status(200).json({ text: result.text });

  } catch (error) {
    console.error('Error generating summary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Return details so frontend can show them
    return response.status(500).json({ error: 'Failed to generate summary.', details: errorMessage });
  }
}
