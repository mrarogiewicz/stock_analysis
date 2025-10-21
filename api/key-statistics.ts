// /api/key-statistics.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Helper function to strip all HTML tags from a string
const stripHtml = (html) => html ? html.replace(/<[^>]*>?/gm, '') : '';

// Helper function to decode common HTML entities
const decodeEntities = (encodedString) => {
    if (!encodedString) return '';
    const translate_re = /&(nbsp|amp|quot|lt|gt);/g;
    const translate = {
        "nbsp": " ",
        "amp" : "&",
        "quot": "\"",
        "lt"  : "<",
        "gt"  : ">"
    };
    return encodedString.replace(translate_re, (match, entity) => translate[entity])
                      .replace(/&#(\d+);/gi, (match, numStr) => String.fromCharCode(parseInt(numStr, 10)));
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { ticker } = req.query;

    if (!ticker || typeof ticker !== 'string') {
        return res.status(400).json({ error: "Ticker is required and must be a string." });
    }

    const url = `https://finance.yahoo.com/quote/${ticker.toUpperCase()}/key-statistics`;
    
    try {
        // We must set a User-Agent header to mimic a browser, otherwise Yahoo Finance may block the request.
        const yahooResponse = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!yahooResponse.ok) {
            let errorMessage = `Failed to fetch data from Yahoo Finance. Status: ${yahooResponse.status}`;
            if (yahooResponse.status === 404) {
                errorMessage = `Could not find key statistics for ticker "${ticker.toUpperCase()}". This could mean the ticker is invalid, delisted, or does not have statistics available on Yahoo Finance. Please verify the ticker is correct on finance.yahoo.com. (URL attempted: ${url})`;
            }
            return res.status(yahooResponse.status).json({ error: errorMessage });
        }

        const html = await yahooResponse.text();

        // --- Brittle Parsing Logic ---
        // This logic is highly dependent on Yahoo's page structure and might break if they update their website.
        // A more robust solution would use a dedicated HTML parsing library (e.g., Cheerio), but we are avoiding extra dependencies here.
        
        // Isolate the main content area where statistics are located.
        const mainContentMatch = html.match(/<div id="Main"[\s\S]*?>(.*?)<footer/s);
        if (!mainContentMatch || !mainContentMatch[1]) {
            return res.status(404).json({ error: 'Could not find main content on the page. The page structure might have changed.' });
        }
        const contentHtml = mainContentMatch[1];
        
        // The page is broken into sections, each with a title and a table.
        // We split the content by a common wrapper class to isolate these sections.
        const sections = contentHtml.split('data-test="qsp-table"');
        if (sections.length < 2) {
             return res.status(404).json({ error: 'Could not parse statistics sections from the page. The page structure may have changed.' });
        }
        
        const statistics = [];

        // We start from the second element because the first split is the content before the first table.
        for (const sectionHtml of sections.slice(1)) {
            // Find the table title which is usually in an h2 or h3 tag just before the table structure.
            const titleMatch = sectionHtml.match(/<h\d class="[^"]*Fz\(m\) Fw\(b\)[^"]*"[^>]*>([^<]+)<\//);
            if (!titleMatch || !titleMatch[1]) continue;
            
            const title = titleMatch[1].trim();

            const tableMatch = sectionHtml.match(/<tbody[\s\S]*?>([\s\S]*?)<\/tbody>/);
            if (!tableMatch || !tableMatch[1]) continue;

            const tableHtml = tableMatch[1];
            // Find all table rows within the table body.
            const rowsMatch = tableHtml.matchAll(/<tr[\s\S]*?>([\s\S]*?)<\/tr>/g);

            const rowsData = [];
            for (const row of rowsMatch) {
                // In each row, find all the data cells (td).
                const cellsMatch = [...row[1].matchAll(/<td[\s\S]*?>([\s\S]*?)<\/td>/g)];
                if (cellsMatch.length >= 2) {
                    const key = decodeEntities(stripHtml(cellsMatch[0][1])).trim();
                    const value = decodeEntities(stripHtml(cellsMatch[1][1])).trim();
                    // Add the row only if it has a valid metric name.
                    if (key) {
                       rowsData.push([key, value]);
                    }
                }
            }

            // Add the entire table to our results if it has data.
            if (rowsData.length > 0) {
                statistics.push({ title, rows: rowsData });
            }
        }
        
        if (statistics.length === 0) {
            return res.status(404).json({ error: 'Successfully fetched page, but failed to extract any statistics. The page layout may have changed.' });
        }
        
        return res.status(200).json(statistics);

    } catch (error) {
        console.error('Error in /api/key-statistics:', error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return res.status(500).json({ error: errorMessage });
    }
}