// /api/key-statistics.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// A helper to safely access the formatted ('fmt') value from nested Yahoo Finance API objects.
const getFmt = (sourceObject, key) => {
    return sourceObject && typeof sourceObject === 'object' && sourceObject[key] ? sourceObject[key].fmt : null;
};

// Defines the structure of the tables and maps human-readable labels to API data points.
const tableDefinitions = [
    {
        title: 'Valuation Measures',
        source: 'summaryDetail',
        rows: [
            ['Market Cap (intraday)', 'marketCap'],
            ['Trailing P/E', 'trailingPE'],
            ['Forward P/E', 'forwardPE'],
            ['Price/Sales (ttm)', 'priceToSalesTrailing12Months'],
        ]
    },
    {
        title: '', // Second part of Valuation Measures
        source: 'defaultKeyStatistics',
        rows: [
            ['Enterprise Value', 'enterpriseValue'],
            ['PEG Ratio (5 yr expected)', 'pegRatio'],
            ['Price/Book (mrq)', 'priceToBook'],
            ['Enterprise Value/Revenue', 'enterpriseToRevenue'],
            ['Enterprise Value/EBITDA', 'enterpriseToEbitda'],
        ]
    },
    {
        title: 'Financial Highlights',
        source: 'defaultKeyStatistics',
        rows: [
            ['Fiscal Year Ends', 'lastFiscalYearEnd'],
            ['Most Recent Quarter (mrq)', 'mostRecentQuarter'],
            ['Profit Margin', 'profitMargins'],
            ['Net Income Avi to Common (ttm)', 'netIncomeToCommon'],
            ['Diluted EPS (ttm)', 'trailingEps'],
            ['Book Value Per Share (mrq)', 'bookValue'],
        ]
    },
    {
        title: '', // Second part of Financial Highlights
        source: 'financialData',
        rows: [
            ['Operating Margin (ttm)', 'operatingMargins'],
            ['Return on Assets (ttm)', 'returnOnAssets'],
            ['Return on Equity (ttm)', 'returnOnEquity'],
            ['Revenue (ttm)', 'totalRevenue'],
            ['Revenue Per Share (ttm)', 'revenuePerShare'],
            ['Gross Profit (ttm)', 'grossProfits'],
            ['EBITDA', 'ebitda'],
            ['Total Cash (mrq)', 'totalCash'],
            ['Total Cash Per Share (mrq)', 'totalCashPerShare'],
            ['Total Debt (mrq)', 'totalDebt'],
            ['Total Debt/Equity (mrq)', 'debtToEquity'],
            ['Current Ratio (mrq)', 'currentRatio'],
            ['Operating Cash Flow (ttm)', 'operatingCashflow'],
            ['Levered Free Cash Flow (ttm)', 'freeCashflow'],
        ]
    },
    {
        title: 'Trading Information',
        source: 'summaryDetail',
        rows: [
             ['Beta (5Y Monthly)', 'beta'],
             ['52 Week High', 'fiftyTwoWeekHigh'],
             ['52 Week Low', 'fiftyTwoWeekLow'],
             ['50-Day Moving Average', 'fiftyDayAverage'],
             ['200-Day Moving Average', 'twoHundredDayAverage'],
             ['Avg Vol (3 month)', 'averageVolume'],
             ['Avg Vol (10 day)', 'averageDailyVolume10Day'],
             ['Forward Annual Dividend Rate', 'dividendRate'],
             ['Forward Annual Dividend Yield', 'dividendYield'],
             ['Trailing Annual Dividend Rate', 'trailingAnnualDividendRate'],
             ['Trailing Annual Dividend Yield', 'trailingAnnualDividendYield'],
             ['5 Year Average Dividend Yield', 'fiveYearAvgDividendYield'],
             ['Payout Ratio', 'payoutRatio'],
             ['Dividend Date', 'exDividendDate'],
        ]
    },
    {
        title: '', // Second part of Trading Information
        source: 'defaultKeyStatistics',
        rows: [
            ['52-Week Change', '52WeekChange'],
            ['S&P500 52-Week Change', 'SandP52WeekChange'],
            ['Shares Outstanding', 'sharesOutstanding'],
            ['Implied Shares Outstanding', 'impliedSharesOutstanding'],
            ['Float', 'floatShares'],
            ['% Held by Insiders', 'heldPercentInsiders'],
            ['% Held by Institutions', 'heldPercentInstitutions'],
            ['Shares Short', 'sharesShort'],
            ['Short Ratio', 'shortRatio'],
            ['Short % of Float', 'shortPercentOfFloat'],
            ['Short % of Shares Outstanding', 'sharesPercentSharesOut'],
            ['Last Split Factor', 'lastSplitFactor'],
            ['Last Split Date', 'lastSplitDate'],
        ]
    }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { ticker } = req.query;

    if (!ticker || typeof ticker !== 'string') {
        return res.status(400).json({ error: "Ticker is required and must be a string." });
    }

    const modules = ['summaryDetail', 'defaultKeyStatistics', 'financialData'].join(',');
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker.toUpperCase()}?modules=${modules}`;

    try {
        const yahooResponse = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!yahooResponse.ok) {
            // Pass Yahoo's status code and a generic error to the client.
            return res.status(yahooResponse.status).json({ error: `Failed to fetch data from Yahoo Finance API. Status: ${yahooResponse.status}` });
        }

        const json = await yahooResponse.json();

        if (!json.quoteSummary || !json.quoteSummary.result || json.quoteSummary.result.length === 0) {
            return res.status(404).json({ error: `Could not find key statistics for ticker "${ticker.toUpperCase()}". The ticker may be invalid, delisted, or not supported by the API.` });
        }

        const data = json.quoteSummary.result[0];
        
        const rawStatistics = tableDefinitions.map(tableDef => {
            const sourceData = data[tableDef.source];
            if (!sourceData) return null;

            const rows = tableDef.rows
                .map(([label, key]) => {
                    const value = getFmt(sourceData, key);
                    return value ? [label, value] : null;
                })
                .filter(Boolean); // remove entries where value was not found

            return { title: tableDef.title, rows };
        }).filter(table => table && table.rows.length > 0);

        // Merge consecutive tables that were split for definition clarity (where title is '')
        const statistics = [];
        for (const table of rawStatistics) {
            if (table.title === '' && statistics.length > 0) {
                statistics[statistics.length - 1].rows.push(...table.rows);
            } else {
                statistics.push(table);
            }
        }

        if (statistics.length === 0) {
            return res.status(404).json({ error: `Successfully connected to API, but no key statistics were found for ticker "${ticker.toUpperCase()}".` });
        }
        
        return res.status(200).json(statistics);

    } catch (error) {
        console.error('Error in /api/key-statistics:', error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return res.status(500).json({ error: errorMessage });
    }
}
