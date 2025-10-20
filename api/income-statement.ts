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
    const responseText = await apiResponse.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Alpha Vantage response is not valid JSON:', responseText);
      const detail = responseText.length < 500 ? responseText : 'The response from the financial data provider was not in the expected format.';
      return response.status(502).json({ error: 'Bad Gateway: Invalid response from data provider.', details: detail });
    }
    
    if (data["Error Message"]) {
      return response.status(400).json({ error: `Alpha Vantage API Error: ${data["Error Message"]}` });
    }

    if (data["Note"]) {
        return response.status(429).json({ error: `Alpha Vantage API Rate Limit: ${data["Note"]}` });
    }
    
    if (Object.keys(data).length === 0 || !data.symbol) {
        return response.status(404).json({ error: `No data found for ticker '${ticker}'. It might be an invalid ticker or delisted.` });
    }

    return response.status(200).json(data);
  } catch (error) {
    console.error('Error in income-statement handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return response.status(500).json({ error: 'Internal server error.', details: errorMessage });
  }
}
