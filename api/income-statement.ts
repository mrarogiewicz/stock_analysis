// /api/income-statement.ts
export default async function handler(request, response) {
  const { ticker } = request.query;
  
  if (!ticker) {
    return response.status(400).json({ error: "Ticker query parameter is required." });
  }

  // A fallback key is provided for demonstration purposes, but it's recommended to use an environment variable.
  const apiKey = process.env.ALPHA_KEY || "CEQPZ53439BEL78O";
  const url = `https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${ticker}&apikey=${apiKey}`;

  try {
    const apiResponse = await fetch(url);
    if (!apiResponse.ok) {
      return response.status(apiResponse.status).json({ error: `Failed to fetch data from Alpha Vantage. Status: ${apiResponse.status}` });
    }

    const data = await apiResponse.json();
    
    if (data["Error Message"]) {
      return response.status(400).json({ error: `Alpha Vantage API Error: ${data["Error Message"]}` });
    }
    
    if (Object.keys(data).length === 0 || !data.symbol) {
        return response.status(404).json({ error: `No data found for ticker '${ticker}'. It might be an invalid ticker or delisted.` });
    }

    return response.status(200).json(data);
  } catch (error) {
    console.error('Error fetching income statement:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return response.status(500).json({ error: 'Internal server error.', details: errorMessage });
  }
}