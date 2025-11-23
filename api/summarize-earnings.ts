
// /api/summarize-earnings.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

// Helper function to fetch a specific URL with key rotation (Reused logic)
async function fetchWithKeyRotation(baseUrl: string, keys: string[]) {
    let lastData = null;
    let lastUrl = "";

    for (const apiKey of keys) {
        const url = `${baseUrl}&apikey=${apiKey}`;
        lastUrl = url;

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
                return { error: data["Error Message"], _debugUrl: url };
            }
            
            // Alpha Vantage transcript usually returns symbol, quarter, and transcript array.
            // If empty object or just meta data without transcript, it's failed.
            if (!data.symbol && !data.transcript) {
                 return { ...data, _debugUrl: url };
            }

            return { ...data, _debugUrl: url };

        } catch (error) {
            console.error(`Error with key ending ...${apiKey?.slice(-4)}:`, error);
            continue;
        }
    }

    // Exhausted all keys
    if (lastData && (lastData["Note"] || lastData["Information"])) {
        const msg = lastData["Note"] || lastData["Information"];
        return { error: "API rate limit exceeded on all keys.", details: msg, _debugUrl: lastUrl };
    }

    return { error: "Failed to fetch transcript data or data unavailable.", _debugUrl: lastUrl };
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
        const quarterParam = `${year}Q${quarter}`;
        
        const transcriptUrl = `https://www.alphavantage.co/query?function=EARNINGS_CALL_TRANSCRIPT&symbol=${ticker}&quarter=${quarterParam}`;
        
        const transcriptData = await fetchWithKeyRotation(transcriptUrl, alphaKeys);

        if (transcriptData.error) {
            return res.status(400).json({ 
                error: transcriptData.error, 
                details: transcriptData.details,
                debugUrl: transcriptData._debugUrl 
            });
        }
        
        // Parse the transcript data based on structure: { symbol: "...", quarter: "...", transcript: [ { speaker: "...", content: "..." }, ... ] }
        let fullTranscriptText = "";

        if (Array.isArray(transcriptData.transcript)) {
            fullTranscriptText = transcriptData.transcript
                .map((item: any) => `${item.speaker || 'Speaker'}: ${item.content}`)
                .join("\n\n");
        } else if (transcriptData.content && typeof transcriptData.content === 'string') {
             // Fallback if structure is different (single string)
             fullTranscriptText = transcriptData.content;
        }
        
        if (!fullTranscriptText) {
            return res.status(404).json({ 
                error: `No transcript found for ${ticker} ${quarterParam}`,
                debugUrl: transcriptData._debugUrl
            });
        }

        // 3. Summarize with Gemini
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
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
        ${fullTranscriptText.substring(0, 100000)} 
        `; // Limit characters to avoid token limits if transcript is massive

        const genAIResponse = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Using pro model for complex summarization
            contents: promptText,
        });

        return res.status(200).json({ summary: genAIResponse.text });

    } catch (error) {
        console.error("Error in summarize-earnings:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return res.status(500).json({ error: "Internal server error summarizing earnings.", details: errorMessage });
    }
}
