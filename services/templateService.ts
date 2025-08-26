
const TEMPLATE_URLS = [
    'https://cdn.jsdelivr.net/gh/mrarogiewicz/prompts@main/stock_analysis_detail.md',
    'https://raw.githubusercontent.com/mrarogiewicz/prompts/main/stock_analysis_detail.md',
    'https://raw.githack.com/mrarogiewicz/prompts/main/stock_analysis_detail.md'
];

export const fetchTemplate = async (): Promise<string> => {
    for (const url of TEMPLATE_URLS) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache'
            });

            if (response.ok) {
                const template = await response.text();
                // Basic validation to ensure we got a reasonable template
                if (template && template.includes('XXX') && template.length > 500) {
                    return template;
                }
            }
        } catch (err) {
            console.warn(`Failed to fetch from ${url}:`, err);
            // Continue to the next URL
        }
    }
    throw new Error('Could not fetch template from any available source.');
};
