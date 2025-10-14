// /api/generate-analysis.ts
import { GoogleGenAI } from '@google/genai';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { prompt } = request.body;

    if (!prompt) {
      return response.status(400).json({ error: 'Prompt is required.' });
    }

    if (!process.env.API_KEY) {
        return response.status(500).json({ error: 'The API_KEY environment variable is not set on the server.' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const genAIResponse = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
    });
    
    const text = genAIResponse.text;

    return response.status(200).json({ text });

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return response.status(500).json({ error: 'Failed to generate analysis from Gemini.', details: errorMessage });
  }
}
