
// /api/summarize-earnings.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

// Helper function to fetch a specific URL with key rotation (Reused logic)
async function fetchWithKeyRotation(baseUrl: string, keys: string[]) {
    let lastData = null;

    for (const apiKey of keys) {
        const url = `${baseUrl}&apikey=${apiKey}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.error(`Failed fetch with key ending ...${apiKey?.slice(-4)} status: ${response.status}`);
                continue;
            }

            const data = await response.json();
            lastData = data;

            // Check for rate limit messages
            const note = data["Note"] || data["Information"];
            if (note && (
                note.includes("rate limit") || 
                note.includes("call frequency") || 
                note.includes("requests per day") ||
                note.includes("higher API call frequency")
            )) {
                console.log(`Rate limit hit for key ending ...${apiKey?.slice(-4)}. trying next key.`);
                continue;
            }

            // Check for specific error messages or empty content
            if (data["Error Message"]) {
                console.error(`API Error with key ending ...${apiKey?.slice(-4)}: ${data["Error Message"]}`);
                return { error: data["Error Message"] };
            }
            
            // Alpha Vantage transcript usually returns simply the symbol and content, or empty if not found
            if (!data.symbol && !data.content) {
                 // Sometimes it returns just {} if no data
                 continue; 
            }

            return data;

        } catch (error) {
            console.error(`Error with key ending ...${apiKey?.slice(-4)}:`, error);
            continue;
        }
    }

    // Exhausted all keys
    if (lastData && (lastData["Note"] || lastData["Information"])) {
        const msg = lastData["Note"] || lastData["Information"];
        return { error: "API rate limit exceeded on all keys.", details: msg };
    }

    return { error: "Failed to fetch transcript data or data unavailable." };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { ticker, year, quarter } = req.body;

    if (!ticker || !year || !quarter) {
        return res.status(400).json({ error: "Ticker, year, and quarter are required." });
    }

    // 1. Setup Keys
    const alphaKeys = [
        process.env.ALPHA_KEY,
        process.env.ALPHA_KEY_2,
        process.env.ALPHA_KEY_3,
        process.env.ALPHA_KEY_4,
        process.env.ALPHA_KEY_5
    ].filter(Boolean);

    if (alphaKeys.length === 0) {
        return res.status(500).json({ error: "The 'ALPHA_KEY' environment variables are not set." });
    }
    
    if (!process.env.API_KEY) {
        return res.status(500).json({ error: "The Gemini 'API_KEY' is not set." });
    }

    try {
        // 2. Fetch Transcript
        // Docs: function=EARNINGS_CALL_TRANSCRIPT&symbol=IBM&quarter=2025Q3&apikey=demo
        // Wait, endpoint param is 'quarter=2025Q3' (string), not separate year/quarter numbers?
        // Let's construct the string based on user input. User provided example "2025Q3".
        // Alpha Vantage docs say: "quarter" (optional) "The earnings quarter to query... e.g. 2025Q1"
        
        // Ensure format YYYYQq
        // We expect `year` (number/string) and `quarter` (number/string 1-4) from body
        const quarterParam = `${year}Q${quarter}`;
        
        const transcriptUrl = `https://www.alphavantage.co/query?function=EARNINGS_CALL_TRANSCRIPT&symbol=${ticker}&quarter=${quarterParam}`;
        
        const transcriptData = await fetchWithKeyRotation(transcriptUrl, alphaKeys);

        if (transcriptData.error) {
            return res.status(400).json({ error: transcriptData.error, details: transcriptData.details });
        }
        
        const content = transcriptData.content;
        
        if (!content) {
            return res.status(404).json({ error: `No transcript found for ${ticker} ${quarterParam}` });
        }

        // 3. Summarize with Gemini
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Truncate if excessively long to avoid token limits (though 2.5/3 models have large context)
        // A typical transcript can be 5k-10k words. Safe to pass whole thing usually.
        
        const promptText = `
        You are a financial analyst. 
        Read the following earnings call transcript for ${ticker} (${quarterParam}).
        
        Task: Create a single paragraph executive summary.
        Requirements:
        - Highlight the most important metrics reported.
        - Mention sales/revenue performance.
        - Summarize the future outlook provided by management.
        - Keep it concise and professional.
        
        Transcript:
        ${content}
        `;

        const genAIResponse = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Using pro model for complex summarization
            contents: promptText,
        });

        return res.status(200).json({ summary: genAIResponse.text });

    } catch (error) {
        console.error("Error in summarize-earnings:", error);
        return res.status(500).json({ error: "Internal server error summarizing earnings." });
    }
}
