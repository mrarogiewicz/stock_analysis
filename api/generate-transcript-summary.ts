
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

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const systemInstruction = `Act as a senior buy-side analyst preparing a fast-read investor brief.
Summarize the following earnings call transcript into a clear, investor-ready executive summary that highlights the elements most relevant to shareholders and market reaction.

Required Output Structure:

1. Quick Take (5–10 bullets)
– Only the most material positives/negatives
– Focus on revenue, margins, cash flow, guidance, demand trends, and anything unexpected
– Label items as Positive / Negative / Neutral

2. Key Numbers
– Revenue, YoY/QoQ growth, margins, cash flow, TCV, net retention, customer counts
– Only include metrics explicitly stated in the transcript

3. Guidance & Outlook
– Management expectations for next quarter/full year
– Pipeline strength, demand visibility, macro commentary
– Highlight guidance raises/cuts and sentiment

4. Demand & GTM Trends
– Sales cycles, customer behavior, segment performance
– Enterprise adoption, product attach, deal size trends

5. Technology / Product Highlights
– New product features, platform updates, ecosystem changes
– Any competitive moat or differentiation statements

6. Risks & Watch-Items
– Segment/regional weakness, operational bottlenecks, customer concentration, geopolitical or regulatory concerns
– Any commentary that may concern investors

7. Management Tone
– Extract the CEO/CFO tone: confident, cautious, aggressive, defensive, overly promotional, etc.
– Note any emphasis on competition, macro risks, market positioning

Style Requirements:
– Use concise professional investor language
– No fluff or storytelling
– Do not repeat the call verbatim
– Highlight only what is material to investors
– Use numbered bullet points and tight formatting`;

    const prompt = `Now produce the investor-style executive summary for the following transcript for ${ticker} (${quarter}):\n\n${transcriptText}`;

    // Using gemini-2.5-flash for reliable summarization and large context handling
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
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
