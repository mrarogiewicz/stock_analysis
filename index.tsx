import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { marked } from 'marked';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area
} from 'recharts';

// --- HOOKS ---
const useStockAnalysisGenerator = () => {
  const [ticker, setTicker] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [generatedSimpleContent, setGeneratedSimpleContent] = useState('');
  const [generatedDetailContent, setGeneratedDetailContent] = useState('');
  const [displayType, setDisplayType] = useState('simple');

  const [generatedForTicker, setGeneratedForTicker] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [geminiResponse, setGeminiResponse] = useState('');
  const [isGeneratingWithGemini, setIsGeneratingWithGemini] = useState(false);
  const [geminiError, setGeminiError] = useState(null);

  const [incomeStatement, setIncomeStatement] = useState(null);
  const [isFetchingIncomeStatement, setIsFetchingIncomeStatement] = useState(false);
  const [incomeStatementError, setIncomeStatementError] = useState(null);

  const [companyOverview, setCompanyOverview] = useState(null);
  const [isFetchingOverview, setIsFetchingOverview] = useState(false);
  const [overviewError, setOverviewError] = useState(null);

  const [stockChartData, setStockChartData] = useState(null);
  const [isFetchingChart, setIsFetchingChart] = useState(false);
  const [chartError, setChartError] = useState(null);
  const [chartRange, setChartRange] = useState('3M'); // Default range

  // Transcript & Summary State
  const [transcriptData, setTranscriptData] = useState(null);
  const [isFetchingTranscript, setIsFetchingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState(null);
  
  const [transcriptSummary, setTranscriptSummary] = useState(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  const [resultOrder, setResultOrder] = useState<string[]>([]);

  const addToResultOrder = useCallback((type) => {
    setResultOrder(prev => [type, ...prev.filter(item => item !== type)]);
  }, []);


  const generateAnalysis = useCallback(async () => {
    if (!ticker.trim()) {
      setError('Please enter a stock ticker');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSaveError(null);
    setSaveSuccess(false);
    setGeminiResponse('');
    setGeminiError(null);
    setIncomeStatement(null);
    setIncomeStatementError(null);
    setCompanyOverview(null);
    setOverviewError(null);
    setStockChartData(null);
    setChartError(null);
    setTranscriptData(null);
    setTranscriptError(null);
    setTranscriptSummary(null);
    setSummaryError(null);
    setResultOrder([]);


    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const simpleUrl = 'https://raw.githubusercontent.com/mrarogiewicz/prompts/refs/heads/main/stock_analysis_simple.md';
      const detailUrl = 'https://raw.githubusercontent.com/mrarogiewicz/prompts/refs/heads/main/stock_analysis_detail.md';

      const [simpleResponse, detailResponse] = await Promise.all([
          fetch(simpleUrl),
          fetch(detailUrl)
      ]);

      if (!simpleResponse.ok || !detailResponse.ok) {
        throw new Error(`Failed to fetch prompt templates.`);
      }
      
      const [simpleTemplate, detailTemplate] = await Promise.all([
          simpleResponse.text(),
          detailResponse.text()
      ]);
      
      const finalSimplePrompt = simpleTemplate.replace(/XXX/g, ticker.toUpperCase());
      const finalDetailPrompt = detailTemplate.replace(/XXX/g, ticker.toUpperCase());
      
      setGeneratedSimpleContent(finalSimplePrompt);
      setGeneratedDetailContent(finalDetailPrompt);
      setDisplayType('simple'); // Default to showing simple view
      setGeneratedForTicker(ticker.toUpperCase());
      setTicker(''); // Clear the input field

    } catch (e) {
      console.error(e);
      setError(e.message || 'An error occurred while fetching the prompts.');
    } finally {
      setIsLoading(false);
    }

  }, [ticker]);
  
  const saveAnalysis = useCallback(async () => {
    const contentToSave = displayType === 'simple' ? generatedSimpleContent : generatedDetailContent;
    if (!contentToSave || !generatedForTicker) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
        const res = await fetch('/api/save-analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ticker: generatedForTicker,
                content: contentToSave,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to save analysis.');
        }

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);

    } catch (e) {
        console.error(e);
        setSaveError(e.message);
    } finally {
        setIsSaving(false);
    }
  }, [generatedSimpleContent, generatedDetailContent, generatedForTicker, displayType]);

  const generateWithGemini = useCallback(async () => {
    const content = displayType === 'simple' ? generatedSimpleContent : generatedDetailContent;
    if (!content) return;

    addToResultOrder('gemini');
    setIsGeneratingWithGemini(true);
    setGeminiError(null);
    setGeminiResponse('');

    try {
      const res = await fetch('/api/generate-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: content }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate analysis with Gemini.');
      }

      const data = await res.json();
      setGeminiResponse(data.text);

    } catch (e) {
      console.error(e);
      setGeminiError(e.message);
    } finally {
      setIsGeneratingWithGemini(false);
    }
  }, [generatedSimpleContent, generatedDetailContent, displayType, addToResultOrder]);

  const fetchIncomeStatement = useCallback(async () => {
    if (!generatedForTicker) return;

    addToResultOrder('income');
    setIsFetchingIncomeStatement(true);
    setIncomeStatementError(null);
    setIncomeStatement(null);

    try {
        const res = await fetch(`/api/income-statement?ticker=${generatedForTicker}`);
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Failed to fetch financial data.');
        }

        setIncomeStatement(data);

    } catch (e) {
        console.error(e);
        setIncomeStatementError(e.message);
    } finally {
        setIsFetchingIncomeStatement(false);
    }
  }, [generatedForTicker, addToResultOrder]);

  const fetchCompanyOverview = useCallback(async () => {
    if (!generatedForTicker) return;

    addToResultOrder('overview');
    setIsFetchingOverview(true);
    setOverviewError(null);
    setCompanyOverview(null);

    try {
        const res = await fetch(`/api/company-overview?ticker=${generatedForTicker}`);
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Failed to fetch company overview.');
        }

        setCompanyOverview(data);
        return data; // Return data for other functions to use

    } catch (e) {
        console.error(e);
        setOverviewError(e.message);
        return null;
    } finally {
        setIsFetchingOverview(false);
    }
  }, [generatedForTicker, addToResultOrder]);

  const fetchStockChart = useCallback(async () => {
    if (!generatedForTicker) return;

    addToResultOrder('chart');
    
    // Fetch fresh on click
    setIsFetchingChart(true);
    setChartError(null);
    setStockChartData(null); 

    try {
        // Fetch all data at once
        const res = await fetch(`/api/stock-chart?ticker=${generatedForTicker}`);
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Failed to fetch chart data.');
        }

        setStockChartData(data);

    } catch (e) {
        console.error(e);
        setChartError(e.message);
    } finally {
        setIsFetchingChart(false);
    }
  }, [generatedForTicker, addToResultOrder]);

  // Combined function to fetch transcript AND immediately summarize it
  const fetchAndSummarizeTranscript = useCallback(async () => {
      if (!generatedForTicker) return;

      // Do NOT add to resultOrder ('transcript') as we show it in Overview now.
      
      setIsFetchingTranscript(true);
      setIsGeneratingSummary(true);
      
      setTranscriptError(null);
      setSummaryError(null);
      setTranscriptData(null);
      setTranscriptSummary(null);

      try {
          // 1. Get Company Details for Dates
          let overview = companyOverview;
          if (!overview) {
              const res = await fetch(`/api/company-overview?ticker=${generatedForTicker}`);
              if (!res.ok) throw new Error("Could not fetch company details needed for transcript.");
              overview = await res.json();
              setCompanyOverview(overview);
          }

          if (!overview || !overview.LatestQuarter) {
              throw new Error("Could not determine latest quarter for transcript.");
          }

          let transcriptYear = '';
          let transcriptQuarter = '';
          const d = new Date(overview.LatestQuarter);
          if (!isNaN(d.getTime())) {
              transcriptYear = d.getFullYear().toString();
              const m = d.getMonth();
              const q = Math.floor(m / 3) + 1;
              transcriptQuarter = q.toString();
          }

          if (!transcriptYear || !transcriptQuarter) {
              throw new Error("Invalid dates for transcript.");
          }

          // 2. Fetch Raw Transcript
          const res = await fetch('/api/summarize-earnings', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                 ticker: generatedForTicker,
                 year: transcriptYear,
                 quarter: transcriptQuarter
             })
         });

         const data = await res.json();
         if (!res.ok) {
             if (data.debugUrl) {
                 throw new Error(`${data.error || 'Failed to fetch transcript'} (Debug: ${data.debugUrl})`);
             }
             throw new Error(data.error || 'Failed to fetch transcript.');
         }
         
         // Set transcript data so it displays
         setTranscriptData(data);
         setIsFetchingTranscript(false); // Transcript fetch done

         // 3. Generate Summary immediately
         if (!data.transcript || data.transcript.length === 0) {
             throw new Error("Transcript empty, cannot summarize.");
         }

         const transcriptText = data.transcript.map(item => `${item.speaker}: ${item.content}`).join('\n\n');
         
         const summaryRes = await fetch('/api/generate-transcript-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transcriptText,
                ticker: generatedForTicker,
                quarter: data.quarter
            })
         });
         
         const summaryData = await summaryRes.json();
         if (!summaryRes.ok) {
             throw new Error(`${summaryData.error || "Failed to generate summary"}${summaryData.details ? `: ${summaryData.details}` : ''}`);
         }
         
         setTranscriptSummary(summaryData.text);

      } catch (e) {
          console.error(e);
          // If we failed at transcript stage, setIsFetchingTranscript needs to be false
          setIsFetchingTranscript(false);
          
          if (!transcriptData) {
              setTranscriptError(e.message);
          } else {
              setSummaryError(e.message);
          }
      } finally {
          setIsGeneratingSummary(false);
          setIsFetchingTranscript(false);
      }
  }, [generatedForTicker, companyOverview]);
  
  // Helper to just switch range in UI without fetching
  const setRange = (range) => {
      setChartRange(range);
  };

  const handleSetTicker = (value) => {
    setTicker(value.toUpperCase());
    if (error) setError(null);
  };

  return {
    ticker,
    setTicker: handleSetTicker,
    displayType,
    setDisplayType,
    isLoading,
    error,
    generatedSimpleContent,
    generatedDetailContent,
    generateAnalysis,
    generatedForTicker,
    isSaving,
    saveError,
    saveSuccess,
    saveAnalysis,
    geminiResponse,
    isGeneratingWithGemini,
    geminiError,
    generateWithGemini,
    incomeStatement,
    isFetchingIncomeStatement,
    incomeStatementError,
    fetchIncomeStatement,
    companyOverview,
    isFetchingOverview,
    overviewError,
    fetchCompanyOverview,
    stockChartData,
    isFetchingChart,
    chartError,
    fetchStockChart,
    chartRange,
    setRange,
    
    // Transcript props
    transcriptData,
    isFetchingTranscript,
    transcriptError,
    transcriptSummary,
    isGeneratingSummary,
    summaryError,
    fetchAndSummarizeTranscript,
    
    resultOrder,
  };
};

// --- ICONS ---
const ChartIcon = (props) => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const CheckIcon = (props) => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
);

const Spinner = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    className={`animate-spin ${props.className || ''}`}
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

// --- COMPONENTS ---
const Header = ({ isTickerPresent, generatedForTicker }) => {
  return (
    <header className="text-center mb-8">
      <div className="inline-flex items-center justify-center gap-3 mb-4">
        <ChartIcon className={`w-8 h-8 transition-colors duration-300 ${isTickerPresent || generatedForTicker ? 'text-[#38B6FF]' : 'text-black'}`} />
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 whitespace-nowrap">
          Stock Analysis
          {generatedForTicker && (
            <span className="ml-3 text-2xl font-semibold text-[#38B6FF]">
              [{generatedForTicker}]
            </span>
          )}
        </h1>
      </div>
    </header>
  );
};

const InputForm = ({ ticker, setTicker, isLoading, onSubmit, hasContent, content }) => {
  const [isPerplexityBusy, setIsPerplexityBusy] = useState(false);
  const [isGeminiBusy, setIsGeminiBusy] = useState(false);
  const [isChatGptBusy, setIsChatGptBusy] = useState(false);

  const perplexityUrl = 'https://perplexity.ai/search';
  const geminiUrl = 'https://gemini.google.com/app';
  const chatGptUrl = 'https://chatgpt.com/';

  const handlePerplexityClick = useCallback(async (e) => {
      e.preventDefault();
      setIsPerplexityBusy(true);

      try {
          await navigator.clipboard.writeText(content);
      } catch (err) {
          console.error('Failed to copy text to clipboard:', err);
      }

      window.open(perplexityUrl, '_blank', 'noopener,noreferrer');

      setTimeout(() => setIsPerplexityBusy(false), 2500);
  }, [content]);

  const handleGeminiClick = useCallback(async (e) => {
      e.preventDefault();
      setIsGeminiBusy(true);

      try {
          await navigator.clipboard.writeText(content);
      } catch (err) {
          console.error('Failed to copy text to clipboard for Gemini:', err);
      }

      window.open(geminiUrl, '_blank', 'noopener,noreferrer');

      setTimeout(() => setIsGeminiBusy(false), 2500);
  }, [content]);
  
  const handleChatGptClick = useCallback(async (e) => {
      e.preventDefault();
      setIsChatGptBusy(true);

      try {
          await navigator.clipboard.writeText(content);
      } catch (err) {
          console.error('Failed to copy text to clipboard for ChatGPT:', err);
      }

      window.open(chatGptUrl, '_blank', 'noopener,noreferrer');

      setTimeout(() => setIsChatGptBusy(false), 2500);
  }, [content]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };
  const isDisabledAndNotLoading = !isLoading && !ticker.trim();
    
  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="tickerInput" className="block text-gray-700 font-medium mb-2 text-center">
            Enter stock ticker
          </label>
          <input
            id="tickerInput"
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="e.g., AAPL"
            maxLength={10}
            autoFocus
            className="w-full px-4 py-3 bg-white/80 border border-gray-300 rounded-xl text-gray-800 text-base placeholder-gray-400 focus:ring-1 focus:ring-gray-400 focus:border-gray-500 outline-none transition duration-200 text-center"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !ticker.trim()}
          className="relative overflow-hidden w-full flex items-center justify-center px-4 py-3 bg-[#38B6FF] text-white font-bold rounded-2xl hover:bg-[#32a3e6] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#38B6FF] transition-colors duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Spinner className="w-5 h-5 mr-2" />
              <span>Processing...</span>
            </>
          ) : (
            <span className={isDisabledAndNotLoading ? 'text-transparent' : ''}>Generate</span>
          )}
          {isDisabledAndNotLoading && (
              <div aria-hidden="true" className="bubbles absolute inset-0 pointer-events-none">
                  {[...Array(10)].map((_, i) => (
                      <div key={i} className="bubble"></div>
                  ))}
              </div>
          )}
        </button>
      </form>
      
      {hasContent && (
         <div className="space-y-4 pt-2 border-t border-gray-100 animate-[fadeIn_0.5s_ease-in-out]">
            <div className="flex items-center justify-center gap-4">
                <a
                href={perplexityUrl}
                onClick={handlePerplexityClick}
                target="_blank"
                rel="noopener noreferrer"
                title="Copy & Open in Perplexity"
                className="w-11 h-11 p-1.5 flex items-center justify-center rounded-lg bg-white shadow-md hover:shadow-lg active:shadow-inner transition-all duration-200"
                >
                {isPerplexityBusy ? (
                    <CheckIcon className="w-full h-full text-green-500" />
                ) : (
                    <img
                    src="https://images.seeklogo.com/logo-png/61/1/perplexity-ai-icon-black-logo-png_seeklogo-611679.png"
                    alt="Perplexity Logo"
                    className="w-full h-full object-contain"
                    />
                )}
                </a>
                <a
                href={geminiUrl}
                onClick={handleGeminiClick}
                target="_blank"
                rel="noopener noreferrer"
                title="Copy & Open in Gemini"
                className="w-11 h-11 p-1.5 flex items-center justify-center rounded-lg bg-white shadow-md hover:shadow-lg active:shadow-inner transition-all duration-200"
                >
                {isGeminiBusy ? (
                    <CheckIcon className="w-full h-full text-green-500" />
                ) : (
                    <img
                    src="https://img.icons8.com/ios_filled/512/gemini-ai.png"
                    alt="Gemini Logo"
                    className="w-full h-full object-contain"
                    />
                )}
                </a>
                <a
                href={chatGptUrl}
                onClick={handleChatGptClick}
                target="_blank"
                rel="noopener noreferrer"
                title="Copy & Open in ChatGPT"
                className="w-11 h-11 p-1.5 flex items-center justify-center rounded-lg bg-white shadow-md hover:shadow-lg active:shadow-inner transition-all duration-200"
                >
                {isChatGptBusy ? (
                    <CheckIcon className="w-full h-full text-green-500" />
                ) : (
                    <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/ChatGPT-Logo.svg/1024px-ChatGPT-Logo.svg.png"
                    alt="ChatGPT Logo"
                    className="w-full h-full object-contain"
                    />
                )}
                </a>
            </div>
         </div>
      )}
    </div>
  );
};

const ErrorMessage = ({ message }) => {
  if (!message) return null;
  return (
    <div className="mt-4 bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm break-words">
      {message}
    </div>
  );
};

const SuccessDisplay = ({ 
    ticker,
    companyOverview,
    isSaving, 
    saveSuccess, 
    onSaveAnalysis, 
    displayType, 
    onDisplayTypeChange, 
    onFetchIncomeStatement, 
    isFetchingIncomeStatement,
    onFetchOverview,
    isFetchingOverview,
    onGenerateWithGemini,
    isGeneratingWithGemini,
    onFetchStockChart,
    isFetchingChart,
    onFetchTranscript,
    isFetchingTranscript,
    isGeneratingSummary,
    transcriptSummary
}) => {
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-gray-200 shadow-lg">
      <div className="text-center mb-4">
        <p className="text-xl font-bold text-gray-800">
          {companyOverview?.Name}
        </p>
      </div>

      <div className="max-w-xs mx-auto flex w-full bg-gray-200/80 rounded-lg p-1 mb-5">
          <button
              type="button"
              onClick={() => onDisplayTypeChange('simple')}
              aria-pressed={displayType === 'simple'}
              className={`w-1/2 py-2 rounded-md text-sm font-medium transition-all duration-200 focus:outline-none ${
              displayType === 'simple' ? 'bg-white text-gray-500 shadow-sm' : 'bg-transparent text-gray-500 hover:bg-white/50'
              }`}
          >
              Simple
          </button>
          <button
              type="button"
              onClick={() => onDisplayTypeChange('detail')}
              aria-pressed={displayType === 'detail'}
              className={`w-1/2 py-2 rounded-md text-sm font-medium transition-all duration-200 focus:outline-none ${
              displayType === 'detail' ? 'bg-white text-gray-500 shadow-sm' : 'bg-transparent text-gray-500 hover:bg-white/50'
              }`}
          >
              Detail
          </button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
             <div className="flex flex-col gap-2">
                <button
                    onClick={onFetchOverview}
                    disabled={isFetchingOverview}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white text-gray-800 font-medium text-sm border border-gray-300 shadow-md hover:bg-gray-50 active:shadow-inner disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 transition-all duration-200"
                >
                    {isFetchingOverview ? (
                        <Spinner className="w-4 h-4 text-gray-600" />
                    ) : (
                        <>
                            <img 
                                src="https://cdn-icons-png.flaticon.com/128/8016/8016700.png" 
                                alt="" 
                                className="w-4 h-4 object-contain" 
                            />
                            <span>Overview</span>
                        </>
                    )}
                </button>
                
                <button
                    onClick={() => onFetchStockChart()}
                    disabled={isFetchingChart}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white text-gray-800 font-medium text-sm border border-gray-300 shadow-md hover:bg-gray-50 active:shadow-inner disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 transition-all duration-200"
                >
                    {isFetchingChart ? (
                        <Spinner className="w-4 h-4 text-gray-600" />
                    ) : (
                        <>
                            <img 
                                src="https://cdn-icons-png.flaticon.com/128/2152/2152656.png" 
                                alt="" 
                                className="w-4 h-4 object-contain" 
                            />
                            <span>Chart</span>
                        </>
                    )}
                </button>

                <button
                    onClick={onFetchIncomeStatement}
                    disabled={isFetchingIncomeStatement}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white text-gray-800 font-medium text-sm border border-gray-300 shadow-md hover:bg-gray-50 active:shadow-inner disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 transition-all duration-200"
                >
                    {isFetchingIncomeStatement ? (
                        <Spinner className="w-4 h-4 text-gray-600" />
                    ) : (
                        <>
                            <img 
                                src="https://cdn-icons-png.flaticon.com/128/3076/3076626.png" 
                                alt="" 
                                className="w-4 h-4 object-contain" 
                            />
                            <span>Financials</span>
                        </>
                    )}
                </button>

                <button
                    type="button"
                    onClick={onGenerateWithGemini}
                    disabled={isGeneratingWithGemini}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white text-gray-800 font-medium text-sm border border-gray-300 shadow-md hover:bg-gray-50 active:shadow-inner disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 transition-all duration-200"
                >
                    {isGeneratingWithGemini ? (
                        <Spinner className="w-4 h-4 text-gray-600" />
                    ) : (
                        <>
                            <img 
                                src="https://registry.npmmirror.com/@lobehub/icons-static-png/1.74.0/files/dark/gemini-color.png" 
                                alt="" 
                                className="w-4 h-4 object-contain" 
                            />
                            <span>Analyse via Gemini Pro</span>
                        </>
                    )}
                </button>
               
                {displayType === 'detail' && (
                    <button
                        onClick={onSaveAnalysis}
                        disabled={isSaving || saveSuccess}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white text-gray-800 font-medium text-sm border border-gray-300 shadow-md hover:bg-gray-50 active:shadow-inner disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 transition-all duration-200"
                    >
                        {isSaving ? (
                            <Spinner className="w-4 h-4 text-gray-600" />
                        ) : saveSuccess ? (
                            <CheckIcon className="w-4 h-4 text-green-500" />
                        ) : (
                            <>
                                <img 
                                    src="https://cdn-icons-png.flaticon.com/128/489/489707.png" 
                                    alt="" 
                                    className="w-4 h-4 object-contain" 
                                />
                                <span>Save notes</span>
                            </>
                        )}
                    </button>
                )}
             </div>
        </div>
      </div>
    </div>
  );
};

const Preview = ({ content }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div onClick={toggleExpand}>
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-gray-200 shadow-lg overflow-hidden cursor-pointer">
        <div className="p-4">
          <div className="relative">
            <pre 
              className={`text-xs text-gray-600 whitespace-pre-wrap break-words bg-gray-50 p-3 rounded-lg transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[25rem] overflow-y-auto' : 'max-h-24 overflow-y-hidden'}`}
            >
              {content}
            </pre>
            {!isExpanded && (
              <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none rounded-b-lg"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const GeminiResponseDisplay = ({ content, ticker, title }: { content: any; ticker: any; title?: string }) => {
    if (!content) return null;
    
    const getHtmlContent = () => {
      try {
        return marked.parse(content);
      } catch (error) {
        console.error("Error parsing markdown:", error);
        return `<p>Error rendering analysis.</p>`;
      }
    };
  
    return (
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="p-6">
          <h3 className="text-center font-medium text-gray-700 mb-4">
            {title || `Gemini Pro Analysis for `}
            {!title && <span style={{ color: '#38B6FF' }} className="font-bold">
              {ticker}
            </span>}
          </h3>
          <div 
            className="prose text-sm text-gray-700 max-w-none bg-gray-50 p-4 rounded-lg max-h-[30rem] overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: getHtmlContent() }}
          >
          </div>
        </div>
      </div>
    );
};

const CompanyOverviewDisplay = ({ data, onSummarize, isSummarizing, transcriptSummary }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  if (!data) return null;

  const globalQuote = data['Global Quote'];
  const currentPrice = globalQuote ? globalQuote['05. price'] : null;
  const targetPrice = data.AnalystTargetPrice;

  let upside = null;
  let priceDiff = null;
  if (currentPrice && targetPrice && targetPrice !== 'None' && currentPrice !== 'None') {
      const c = parseFloat(currentPrice);
      const t = parseFloat(targetPrice);
      if (!isNaN(c) && !isNaN(t) && c !== 0) {
          upside = ((t - c) / c) * 100;
          priceDiff = t - c;
      }
  }
  
  // Helper to format large numbers
  const formatLargeNumber = (num) => {
     if (!num || num === 'None') return 'N/A';
     const n = parseFloat(num);
     if (isNaN(n)) return num;
     if (n >= 1.0e+12) return (n / 1.0e+12).toFixed(2) + " T";
     if (n >= 1.0e+9) return (n / 1.0e+9).toFixed(2) + " B";
     if (n >= 1.0e+6) return (n / 1.0e+6).toFixed(2) + " M";
     return n.toLocaleString();
  }

  // Helper for currency
  const formatCurrency = (num) => {
      if (!num || num === 'None') return 'N/A';
      const n = parseFloat(num);
      return isNaN(n) ? num : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  }

  // Helper for percent
  const formatPercent = (num) => {
      if (!num || num === 'None') return 'N/A';
      const n = parseFloat(num);
      return isNaN(n) ? num : (n * 100).toFixed(2) + "%";
  }
  
  // Helper for simple number
  const formatNumber = (num) => {
      if (!num || num === 'None') return 'N/A';
      const n = parseFloat(num);
      return isNaN(n) ? num : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Determine start of Fiscal Year and Current Quarter for Transcript
  const getFiscalYearStart = (fyEndStr) => {
    if (!fyEndStr || fyEndStr === 'None') return new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    
    const months = {
        "january": 0, "february": 1, "march": 2, "april": 3, "may": 4, "june": 5,
        "july": 6, "august": 7, "september": 8, "october": 9, "november": 10, "december": 11
    };
    
    const fyEndMonth = months[fyEndStr.toLowerCase()];
    if (fyEndMonth === undefined) return new Date(new Date().setFullYear(new Date().getFullYear() - 1));

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    let fyStartYear = currentYear;
    if (currentMonth <= fyEndMonth) {
        fyStartYear = currentYear - 1;
    }
    return new Date(fyStartYear, fyEndMonth + 1, 1);
  };

  const fyStartDate = getFiscalYearStart(data.FiscalYearEnd);
  
  // Calculate Insider Activity for Current FY
  let insiderBuyShares = 0;
  let insiderBuyValue = 0;
  let insiderSellShares = 0;
  let insiderSellValue = 0;

  if (data.insiderTransactions && data.insiderTransactions.data) {
      data.insiderTransactions.data.forEach(t => {
          const tDate = new Date(t.transaction_date);
          if (tDate >= fyStartDate) {
              const shares = parseFloat(t.shares);
              const price = parseFloat(t.share_price);
              
              if (!isNaN(shares) && !isNaN(price)) {
                  const val = shares * price;
                  const isAcquisition = t.acquisition_or_disposal === 'A';
                  const isDisposal = t.acquisition_or_disposal === 'D';

                  if (isAcquisition) {
                      insiderBuyShares += shares;
                      insiderBuyValue += val;
                  } else if (isDisposal) {
                      insiderSellShares += shares;
                      insiderSellValue += val;
                  }
              }
          }
      });
  }

  const formatMoneyShort = (num) => {
    const absVal = Math.abs(num);
    if (absVal >= 1.0e+9) return '$' + (absVal / 1.0e+9).toFixed(2) + "B";
    if (absVal >= 1.0e+6) return '$' + (absVal / 1.0e+6).toFixed(2) + "M";
    if (absVal >= 1.0e+3) return '$' + (absVal / 1.0e+3).toFixed(0) + "K";
    return '$' + absVal.toFixed(0);
  };
  
  const netInsiderShares = insiderBuyShares - insiderSellShares;
  const netInsiderValue = insiderBuyValue - insiderSellValue;
  const netInsiderColor = netInsiderValue >= 0 ? 'text-green-600' : 'text-red-600';

  const getSummaryHtml = () => {
    if (!transcriptSummary) return '';
    try {
        return marked.parse(transcriptSummary);
    } catch {
        return transcriptSummary;
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-gray-200 shadow-lg overflow-hidden p-6">
       {/* Header: Basic Info */}
       <div className="border-b border-gray-200 pb-4 mb-6">
          <div className="flex justify-between items-start">
             <div>
                <h2 className="text-2xl font-bold text-gray-800">{data.Name} ({data.Symbol})</h2>
                <div className="flex flex-wrap gap-2 mt-3 text-sm text-gray-600">
                   <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200">{data.Exchange}</span>
                   <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200">{data.Sector}</span>
                   <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200">{data.Industry}</span>
                   <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200">{data.Country}</span>
                </div>
             </div>
             <div className="text-right text-xs text-gray-500 hidden sm:flex flex-col items-end gap-1">
                <p>Fiscal Year End: {data.FiscalYearEnd}</p>
                <p>Latest Qtr: {data.LatestQuarter}</p>
                <button
                    onClick={onSummarize}
                    disabled={isSummarizing}
                    className="bg-[#38B6FF]/10 text-[#38B6FF] px-3 py-1.5 rounded-lg hover:bg-[#38B6FF]/20 transition-all flex items-center gap-2 disabled:opacity-50 mt-2 text-xs font-semibold shadow-sm"
                    title="Fetch and summarize earnings call"
                >
                     {isSummarizing ? (
                         <Spinner className="w-3 h-3 text-[#38B6FF]" />
                     ) : (
                         <>
                             <img src="https://cdn-icons-png.flaticon.com/128/16921/16921758.png" className="w-3 h-3" alt="" />
                             <span>Summarize Earnings</span>
                         </>
                     )}
                </button>
             </div>
          </div>
          
          <div 
            className="mt-4 cursor-pointer group"
            onClick={() => setIsExpanded(!isExpanded)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsExpanded(!isExpanded) }}
          >
             <p className={`text-gray-700 leading-relaxed text-sm transition-all duration-200 ${isExpanded ? '' : 'line-clamp-1'}`}>
                {data.Description}
             </p>
             {!isExpanded && (
                 <span className="text-xs text-[#38B6FF] font-medium mt-1 inline-block group-hover:underline">Read more</span>
             )}
          </div>
          
          {transcriptSummary && (
              <div 
                className="mt-4 cursor-pointer group border-t border-gray-100 pt-3"
                onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsSummaryExpanded(!isSummaryExpanded) }}
              >
                 <h4 className="text-sm font-bold text-gray-800 mb-1">Earnings Call Executive Summary</h4>
                 <div 
                    className={`prose prose-sm text-gray-700 leading-relaxed text-sm transition-all duration-200 max-w-none ${isSummaryExpanded ? '' : 'line-clamp-1'}`}
                    dangerouslySetInnerHTML={{ __html: getSummaryHtml() }}
                 />
                 {!isSummaryExpanded && (
                     <span className="text-xs text-[#38B6FF] font-medium mt-1 inline-block group-hover:underline">Read more</span>
                 )}
                 {isSummaryExpanded && (
                     <span className="text-xs text-gray-400 font-medium mt-1 inline-block group-hover:underline">Show less</span>
                 )}
              </div>
          )}
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
          
          {/* Valuation */}
          <div>
             <h3 className="font-semibold text-gray-800 mb-3 text-base border-b pb-2 border-gray-100 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 p-1 rounded">💰</span> Valuation
             </h3>
             <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-gray-500">Market Cap</dt> <dd className="text-right font-medium text-gray-900">{formatLargeNumber(data.MarketCapitalization)}</dd>
                <dt className="text-gray-500">Trailing P/E</dt> <dd className="text-right font-medium text-gray-900">{formatNumber(data.TrailingPE)}</dd>
                <dt className="text-gray-500">Forward P/E</dt> <dd className="text-right font-medium text-gray-900">{formatNumber(data.ForwardPE)}</dd>
                <dt className="text-gray-500">PEG Ratio</dt> <dd className="text-right font-medium text-gray-900">{formatNumber(data.PEGRatio)}</dd>
                <dt className="text-gray-500">Price/Sales</dt> <dd className="text-right font-medium text-gray-900">{formatNumber(data.PriceToSalesRatioTTM)}</dd>
             </dl>
          </div>

          {/* Financial Performance */}
          <div>
             <h3 className="font-semibold text-gray-800 mb-3 text-base border-b pb-2 border-gray-100 flex items-center gap-2">
                <span className="bg-green-100 text-green-600 p-1 rounded">📈</span> Financials (TTM)
             </h3>
             <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-gray-500">Revenue</dt> <dd className="text-right font-medium text-gray-900">{formatLargeNumber(data.RevenueTTM)}</dd>
                <dt className="text-gray-500">Net Income (EPS)</dt> <dd className="text-right font-medium text-gray-900">{formatCurrency(data.DilutedEPSTTM)}</dd>
                <dt className="text-gray-500">Profit Margin</dt> <dd className="text-right font-medium text-gray-900">{formatPercent(data.ProfitMargin)}</dd>
                <dt className="text-gray-500">Operating Margin</dt> <dd className="text-right font-medium text-gray-900">{formatPercent(data.OperatingMarginTTM)}</dd>
             </dl>
          </div>

          {/* Share Statistics */}
          <div>
             <h3 className="font-semibold text-gray-800 mb-3 text-base border-b pb-2 border-gray-100 flex items-center gap-2">
                <span className="bg-purple-100 text-purple-600 p-1 rounded">📊</span> Share Stats
             </h3>
             <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-gray-500">Shares Outstanding</dt> <dd className="text-right font-medium text-gray-900">{formatLargeNumber(data.SharesOutstanding)}</dd>
                <dt className="text-gray-500">Float Shares</dt> <dd className="text-right font-medium text-gray-900">{formatLargeNumber(data.SharesFloat)}</dd>
                <dt className="text-gray-500">% Insiders</dt> <dd className="text-right font-medium text-gray-900">{data.PercentInsiders ? parseFloat(data.PercentInsiders).toFixed(2) + '%' : 'N/A'}</dd>
                <dt className="text-gray-500">% Institutions</dt> <dd className="text-right font-medium text-gray-900">{data.PercentInstitutions ? parseFloat(data.PercentInstitutions).toFixed(2) + '%' : 'N/A'}</dd>
                <dt className="text-gray-500">Net Insider (FY)</dt> <dd className={`text-right font-medium ${netInsiderColor}`}>{formatLargeNumber(Math.abs(netInsiderShares))} / {formatMoneyShort(netInsiderValue)}</dd>
             </dl>
          </div>
          
          {/* Trading & Dividends */}
          <div>
             <h3 className="font-semibold text-gray-800 mb-3 text-base border-b pb-2 border-gray-100 flex items-center gap-2">
                <span className="bg-orange-100 text-orange-600 p-1 rounded">📉</span> Trading & Dividends
             </h3>
             <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-gray-500">52 Week Range</dt> <dd className="text-right font-medium text-gray-900">{formatCurrency(data['52WeekLow'])} / {formatCurrency(data['52WeekHigh'])}</dd>
                <dt className="text-gray-500">50 Day MA</dt> <dd className="text-right font-medium text-gray-900">{formatCurrency(data['50DayMovingAverage'])}</dd>
                <dt className="text-gray-500">200 Day MA</dt> <dd className="text-right font-medium text-gray-900">{formatCurrency(data['200DayMovingAverage'])}</dd>
                <dt className="text-gray-500">Dividends (Yield/Share)</dt> <dd className="text-right font-medium text-gray-900">{formatPercent(data.DividendYield)} / {formatCurrency(data.DividendPerShare)}</dd>
             </dl>
          </div>

          {/* Analyst Ratings */}
          <div className="md:col-span-2">
             <h3 className="font-semibold text-gray-800 mb-3 text-base border-b pb-2 border-gray-100 flex items-center gap-2">
                <span className="bg-yellow-100 text-yellow-600 p-1 rounded">⭐</span> Analyst Ratings
             </h3>
             <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm flex flex-col gap-1">
                    <div>
                        <span className="text-gray-500">Current Price: </span>
                        <span className="font-bold text-gray-900 text-lg">{formatCurrency(currentPrice)}</span>
                    </div>
                    <div>
                        <span className="text-gray-500">Target Price: </span>
                        <span className="font-bold text-gray-900 text-lg">{formatCurrency(data.AnalystTargetPrice)}</span>
                    </div>
                    {upside !== null && (
                         <div className={`font-bold ${upside >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                             {upside >= 0 ? 'Upside' : 'Downside'}: {upside.toFixed(2)}% ({priceDiff >= 0 ? '+' : ''}{formatNumber(priceDiff)})
                         </div>
                    )}
                </div>
                <div className="flex flex-grow justify-end gap-1 sm:gap-4 text-xs sm:text-sm font-medium text-gray-700">
                   <div className="flex flex-col items-center p-2 bg-green-50 rounded border border-green-100 min-w-[60px]">
                       <span className="text-green-700 font-bold text-lg">{data.AnalystRatingStrongBuy}</span>
                       <span className="text-gray-500 uppercase text-[10px]">Str Buy</span>
                   </div>
                   <div className="flex flex-col items-center p-2 bg-green-50 rounded border border-green-100 min-w-[60px]">
                       <span className="text-green-600 font-bold text-lg">{data.AnalystRatingBuy}</span>
                       <span className="text-gray-500 uppercase text-[10px]">Buy</span>
                   </div>
                   <div className="flex flex-col items-center p-2 bg-yellow-50 rounded border border-yellow-100 min-w-[60px]">
                       <span className="text-yellow-600 font-bold text-lg">{data.AnalystRatingHold}</span>
                       <span className="text-gray-500 uppercase text-[10px]">Hold</span>
                   </div>
                   <div className="flex flex-col items-center p-2 bg-orange-50 rounded border border-orange-100 min-w-[60px]">
                       <span className="text-orange-600 font-bold text-lg">{data.AnalystRatingSell}</span>
                       <span className="text-gray-500 uppercase text-[10px]">Sell</span>
                   </div>
                   <div className="flex flex-col items-center p-2 bg-red-50 rounded border border-red-100 min-w-[60px]">
                       <span className="text-red-700 font-bold text-lg">{data.AnalystRatingStrongSell}</span>
                       <span className="text-gray-500 uppercase text-[10px]">Str Sell</span>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

const EarningsTranscriptDisplay = ({ data, ticker, summary, isSummarizing, summaryError }) => {
    if (!data || !data.transcript) return null;
    
    return (
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="p-6">
           <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                 <h3 className="font-bold text-gray-800 text-lg">Earnings Call Transcript</h3>
                 <p className="text-sm text-gray-500">{data.quarter ? `Quarter: ${data.quarter}` : ''}</p>
              </div>
           </div>
           
           {summaryError && <ErrorMessage message={summaryError} />}
           
           <div className="bg-gray-50 rounded-lg p-4 max-h-[500px] overflow-y-auto space-y-6">
               {data.transcript.map((item, idx) => (
                   <div key={idx} className="text-sm">
                       <div className="flex items-center gap-2 mb-1">
                           <span className="font-bold text-gray-800">{item.speaker}</span>
                           {item.title && <span className="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">{item.title}</span>}
                       </div>
                       <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{item.content}</p>
                   </div>
               ))}
           </div>
        </div>
      </div>
    );
};


const IncomeStatementDisplay = ({ data, ticker }) => {
    const [reportType, setReportType] = useState('annual'); // 'annual' or 'quarterly'

    // Data structure is now { income, balance }
    // Check availability based on Income Statement as primary
    const incomeReports = data?.income ? (reportType === 'annual' ? data.income.annualReports : data.income.quarterlyReports) : [];
    const balanceReports = data?.balance ? (reportType === 'annual' ? data.balance.annualReports : data.balance.quarterlyReports) : [];

    const hasAnnualData = data?.income?.annualReports?.length > 0;
    const hasQuarterlyData = data?.income?.quarterlyReports?.length > 0;

    // Default to annual if it exists, otherwise quarterly.
    useEffect(() => {
        if (hasAnnualData) {
            setReportType('annual');
        } else if (hasQuarterlyData) {
            setReportType('quarterly');
        }
    }, [hasAnnualData, hasQuarterlyData]);

    if (!data || (!hasAnnualData && !hasQuarterlyData)) {
        if (!data) return null;
        return (
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-gray-200 shadow-lg overflow-hidden p-6 text-center text-gray-600">
                Financial data not available for {ticker}.
            </div>
        );
    }
  
    const formatValue = (value) => {
      if (value === 'None' || value === null || value === undefined) {
        return 'N/A';
      }
      const num = Number(value);
      if (isNaN(num)) {
          return value;
      }
      
      if (Math.abs(num) >= 1000000) {
        const millions = num / 1000000;
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(millions) + 'M';
      } else {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(num);
      }
    };
    
    const formatLargeNumber = (value) => {
        if (value === 'None' || value === null || value === undefined) return 'N/A';
        const num = Number(value);
        if (isNaN(num)) return value;
        if (Math.abs(num) >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
        if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(2) + 'M';
        return num.toLocaleString();
    };

    const formatQuarter = (dateString) => {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-11
        const quarter = Math.floor(month / 3) + 1;
        return `${year}Q${quarter}`;
    };

    const sections: {
        title: string;
        metrics: Record<string, string>;
        data: any[];
        formatter?: (val: any) => string;
    }[] = [
        {
            title: 'Income Statement',
            metrics: {
                'totalRevenue': 'Total Revenue',
                'grossProfit': 'Gross Profit',
                'netIncome': 'Net Income'
            },
            data: incomeReports
        },
        {
            title: 'Balance Sheet',
            metrics: {
                'totalCurrentAssets': 'Total Current Assets',
                'totalCurrentLiabilities': 'Total Current Liabilities',
                'totalLiabilities': 'Total Liabilities',
                'shortLongTermDebtTotal': 'Total Debt'
            },
            data: balanceReports
        }
    ];

    const reportsToShow = reportType === 'annual' ? 5 : 6;
    const dates = incomeReports.slice(0, reportsToShow).map(r => r.fiscalDateEnding);
  
    return (
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="p-6">
            <div className="flex justify-between items-center mb-5">
                <h3 className="font-medium text-gray-700">
                    Financials
                </h3>
                
                <div className="flex bg-gray-200/80 rounded-lg p-1">
                    <button
                        type="button"
                        onClick={() => setReportType('annual')}
                        disabled={!hasAnnualData}
                        aria-pressed={reportType === 'annual'}
                        className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                        reportType === 'annual' ? 'bg-white text-gray-800 shadow-sm' : 'bg-transparent text-gray-500 hover:bg-white/50'
                        }`}
                    >
                        Annual
                    </button>
                    <button
                        type="button"
                        onClick={() => setReportType('quarterly')}
                        disabled={!hasQuarterlyData}
                        aria-pressed={reportType === 'quarterly'}
                        className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                        reportType === 'quarterly' ? 'bg-white text-gray-800 shadow-sm' : 'bg-transparent text-gray-500 hover:bg-white/50'
                        }`}
                    >
                        Quarterly
                    </button>
                </div>
          </div>

          {dates.length > 0 ? (
            <>
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr>
                        <th scope="col" className="px-4 py-3 sticky left-0 bg-gray-100 z-10 w-1/3">Metric</th>
                        {dates.map(date => (
                            <th scope="col" className="px-4 py-3 text-right" key={date}>
                            {reportType === 'annual' ? new Date(date).getFullYear() : formatQuarter(date)}
                            </th>
                        ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sections.map((section, sIdx) => (
                            <React.Fragment key={section.title}>
                                {/* Section Header */}
                                <tr className="bg-gray-50 border-b">
                                    <td colSpan={dates.length + 1} className="px-4 py-2 font-bold text-gray-800 sticky left-0 z-10 bg-gray-50">
                                        {section.title}
                                    </td>
                                </tr>
                                {/* Metrics */}
                                {Object.entries(section.metrics).map(([key, displayName]) => (
                                <tr className="bg-white border-b hover:bg-gray-50" key={key}>
                                    <th scope="row" className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10 align-top pl-8">
                                    {displayName}
                                    </th>
                                    {dates.map((date, idx) => {
                                        const report = section.data[idx];
                                        // The section.data array might be sparse or not aligned if logic failed, but here we sliced logic above based on index matching
                                        // Actually better to lookup by date to be safe if arrays drifted, but assuming slice alignment is standard
                                        const val = report ? report[key] : null;
                                        return (
                                            <td className="px-4 py-3 text-right align-top" key={`${date}-${key}`}>
                                                {section.formatter ? section.formatter(val) : formatValue(val)}
                                            </td>
                                        );
                                    })}
                                </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="block md:hidden space-y-6">
                    {dates.map((date, idx) => (
                        <div key={date} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                            <h4 className="font-semibold text-base text-gray-800 mb-3 pb-2 border-b border-gray-200">
                                {reportType === 'annual' ? `Year ${new Date(date).getFullYear()}` : formatQuarter(date)}
                            </h4>
                            {sections.map(section => (
                                <div key={section.title} className="mb-4 last:mb-0">
                                    <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">{section.title}</h5>
                                    <dl className="space-y-2 text-sm">
                                        {Object.entries(section.metrics).map(([key, displayName]) => {
                                            const report = section.data[idx];
                                            const val = report ? report[key] : null;
                                            return (
                                                <div key={key} className="flex justify-between items-center">
                                                    <dt className="text-gray-600">{displayName}</dt>
                                                    <dd className="font-medium text-gray-900 text-right">
                                                        {section.formatter ? section.formatter(val) : formatValue(val)}
                                                    </dd>
                                                </div>
                                            );
                                        })}
                                    </dl>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </>
          ) : (
            <p className="text-center text-gray-500 mt-4">No {reportType} data available.</p>
          )}
        </div>
      </div>
    );
};

const CustomTooltip = ({ active, payload, label, range }: any) => {
  if (active && payload && payload.length) {
    // Format the timestamp back to a readable string for the tooltip
    const date = new Date(label); // label is the timestamp number
    let dateStr = '';
    
    if (range === '1D' || range === '1W') {
        dateStr = date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } else {
        dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    return (
      <div className="bg-white/95 border border-gray-200 shadow-lg p-3 rounded text-xs">
        <p className="font-bold text-gray-700 mb-1">{dateStr}</p>
        {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
                {entry.name}: {
                    entry.name === 'Volume' 
                    ? (entry.value / 1000000).toFixed(2) + 'M' 
                    : '$' + Number(entry.value).toFixed(2)
                }
            </p>
        ))}
      </div>
    );
  }
  return null;
};

const StockChartDisplay = ({ data, ticker, range, onRangeChange, isFetching }) => {
    const [parsingError, setParsingError] = useState(null);

    // Transform data based on range and available datasets
    const chartData = useMemo(() => {
        if (!data) return [];
        setParsingError(null);
        
        let timeSeries = null;
        let type = '';

        // Pick the correct dataset from the composite object based on the current range
        if (range === '1D') {
             if (data.intraday?.error) {
                 setParsingError(data.intraday.error);
                 return [];
             }
             timeSeries = data.intraday ? data.intraday['Time Series (15min)'] : null;
             type = '15min';
        } else if (range === '1W') {
             // 1W now uses intraday30 with specific params
             if (data.intraday30?.error) {
                 setParsingError(data.intraday30.error);
                 return [];
             }
             timeSeries = data.intraday30 ? data.intraday30['Time Series (30min)'] : null;
             type = '30min';
        } else if (range === '1M' || range === '3M') {
             if (data.daily?.error) {
                 setParsingError(data.daily.error);
                 return [];
             }
             timeSeries = data.daily ? data.daily['Time Series (Daily)'] : null;
             type = 'Daily';
        } else if (range === '1Y' || range === 'YTD') {
             if (data.weekly?.error) {
                 setParsingError(data.weekly.error);
                 return [];
             }
             timeSeries = data.weekly ? data.weekly['Weekly Time Series'] : null;
             type = 'Weekly';
        } else if (range === '5Y' || range === 'All') {
             if (data.monthly?.error) {
                 setParsingError(data.monthly.error);
                 return [];
             }
             timeSeries = data.monthly ? data.monthly['Monthly Time Series'] : null;
             type = 'Monthly';
        }

        // If the specific dataset is missing or has error, return empty
        if (!timeSeries) return [];

        return Object.keys(timeSeries).map(dateStr => {
             // For intraday, parsing 'YYYY-MM-DD HH:MM:SS' works directly in Date()
             // For daily/weekly/monthly, 'YYYY-MM-DD' works too.
             // We create a timestamp for numeric axis sorting
             const dateObj = new Date(dateStr);
             return {
                date: dateStr,
                timestamp: dateObj.getTime(),
                price: parseFloat(timeSeries[dateStr]['4. close']),
                volume: parseInt(timeSeries[dateStr]['5. volume']),
                type
            };
        }).sort((a, b) => a.timestamp - b.timestamp);
    }, [data, range]);

    // Filter data based on range
    const filteredData = useMemo(() => {
        if (chartData.length === 0) return [];

        // For 'All', return everything
        if (range === 'All') return chartData;
        
        const lastItem = chartData[chartData.length - 1];
        const lastDate = new Date(lastItem.timestamp);
        let startDate = new Date(lastDate);

        if (range === '1D') {
             // Show only the last available date (last trading day)
             // We filter by checking if year, month, and day match the last available point.
             const targetDay = lastDate.getDate();
             const targetMonth = lastDate.getMonth();
             const targetYear = lastDate.getFullYear();
             
             return chartData.filter(item => {
                 const d = new Date(item.timestamp);
                 return d.getDate() === targetDay && 
                        d.getMonth() === targetMonth && 
                        d.getFullYear() === targetYear;
             });
        }

        if (range === '1M') {
            startDate.setMonth(lastDate.getMonth() - 1);
        } else if (range === '3M') {
             startDate.setMonth(lastDate.getMonth() - 3);
        } else if (range === '1Y') {
            startDate.setFullYear(lastDate.getFullYear() - 1);
        } else if (range === 'YTD') {
            startDate = new Date(lastDate.getFullYear(), 0, 1);
        } else if (range === '5Y') {
            startDate.setFullYear(lastDate.getFullYear() - 5);
        } else {
            // For 1W (Intraday), we usually just show what's returned by compact (approx 100 points)
            return chartData;
        }

        // Filter by date
        const startTime = startDate.getTime();
        return chartData.filter(item => item.timestamp >= startTime);
    }, [chartData, range]);

    const dateRangeText = useMemo(() => {
        if (filteredData.length === 0) return '';
        const start = new Date(filteredData[0].timestamp);
        const end = new Date(filteredData[filteredData.length - 1].timestamp);
        const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
        
        // Include time if it's intraday 1D. For 1W we removed it per request.
        if (range === '1D') {
             return `${start.toLocaleString('en-US', { ...opts, hour: '2-digit', minute: '2-digit'})} - ${end.toLocaleString('en-US', { ...opts, hour: '2-digit', minute: '2-digit'})}`;
        }

        return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', opts)}`;
    }, [filteredData, range]);
    
    const priceChangeInfo = useMemo(() => {
        if (!filteredData || filteredData.length === 0) return null;
        const first = filteredData[0];
        const last = filteredData[filteredData.length - 1];
        
        const change = last.price - first.price;
        const percent = (change / first.price) * 100;
        
        return {
            change,
            percent,
            isPositive: change >= 0
        };
    }, [filteredData]);


    if (!data) return null;

    // Check for missing data or errors
    if ((filteredData.length === 0 && !isFetching) || parsingError) {
         return (
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-gray-200 shadow-lg p-6 text-center break-words">
                <p className="text-gray-600 font-semibold">No data available for range {range}.</p>
                {parsingError && <p className="text-red-500 text-xs mt-2">{parsingError}</p>}
                
                <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200 text-left">
                     <p className="text-xs font-bold text-gray-500 mb-2">Debug Endpoint URLs (Click to test):</p>
                     <ul className="space-y-1 text-[10px] text-blue-600">
                         <li><strong>Intraday (1D):</strong> <a href={data.intraday?._debugUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{data.intraday?._debugUrl || 'N/A'}</a></li>
                         <li><strong>Intraday (1W):</strong> <a href={data.intraday30?._debugUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{data.intraday30?._debugUrl || 'N/A'}</a></li>
                         <li><strong>Daily (1M/3M):</strong> <a href={data.daily?._debugUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{data.daily?._debugUrl || 'N/A'}</a></li>
                         <li><strong>Weekly (1Y/YTD):</strong> <a href={data.weekly?._debugUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{data.weekly?._debugUrl || 'N/A'}</a></li>
                         <li><strong>Monthly (5Y/All):</strong> <a href={data.monthly?._debugUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{data.monthly?._debugUrl || 'N/A'}</a></li>
                     </ul>
                </div>
            </div>
         );
    }

    return (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-gray-200 shadow-lg overflow-hidden p-6">
            <div className="flex justify-between items-start mb-4">
                 <div>
                    <h3 className="text-lg font-bold text-gray-800">Price & Volume - {ticker}</h3>
                    <p className="text-xs text-gray-500 mt-1">{dateRangeText}</p>
                    {priceChangeInfo && (
                        <div className={`text-sm font-semibold mt-1 ${priceChangeInfo.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {priceChangeInfo.isPositive ? '+' : ''}{priceChangeInfo.change.toFixed(2)} ({priceChangeInfo.isPositive ? '+' : ''}{priceChangeInfo.percent.toFixed(2)}%)
                        </div>
                    )}
                 </div>
                 {isFetching && <Spinner className="w-5 h-5 text-[#38B6FF]" />}
            </div>
            
            <div className="h-[300px] w-full">
                {filteredData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={filteredData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                            <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#38B6FF" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#38B6FF" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis 
                                dataKey="timestamp" 
                                tick={{fontSize: 10, fill: '#6b7280'}} 
                                tickFormatter={(unixTime) => {
                                    const date = new Date(unixTime);
                                    // If 1D (Intraday), show time
                                    if (range === '1D') {
                                         return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    }
                                    // If 1W, show Date only (e.g. Nov 21) per request
                                    if (range === '1W') {
                                         return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                    }
                                    // Else show date
                                    return date.toLocaleDateString(undefined, {
                                        month:'short', 
                                        day:'numeric', 
                                        year: range === '5Y' || range === 'All' ? '2-digit' : undefined
                                    } as Intl.DateTimeFormatOptions);
                                }}
                                minTickGap={30}
                            />
                            {/* Hide Left YAxis visual elements but keep it for scaling */}
                            <YAxis 
                                yAxisId="left" 
                                orientation="left" 
                                width={0}
                                tick={false}
                                domain={[0, 'dataMax * 16']} // Make volume bars shorter
                            />
                            <YAxis 
                                yAxisId="right" 
                                orientation="right" 
                                tick={{fontSize: 10, fill: '#6b7280'}} 
                                domain={['auto', 'auto']}
                                tickFormatter={(val) => `$${val}`}
                            />
                            <Tooltip content={<CustomTooltip range={range} />} />
                            <Bar yAxisId="left" dataKey="volume" name="Volume" fill="#e5e7eb" barSize={20} isAnimationActive={false} />
                            <Line 
                                yAxisId="right" 
                                type="monotone" 
                                dataKey="price" 
                                name="Price" 
                                stroke="#38B6FF" 
                                strokeWidth={2} 
                                dot={false} 
                                activeDot={{ r: 4 }}
                                isAnimationActive={false}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full items-center justify-center text-gray-400 text-sm">
                        No data for selected range
                    </div>
                )}
            </div>

            <div className="flex justify-center gap-2 mt-4 flex-wrap">
                {['1D', '1W', '1M', '3M', 'YTD', '1Y', '5Y', 'All'].map((r) => (
                    <button
                        key={r}
                        onClick={() => onRangeChange(r)}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                            range === r 
                            ? 'bg-[#38B6FF] text-white shadow-sm' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {r}
                    </button>
                ))}
            </div>
        </div>
    );
};

// --- MAIN APP ---
const App = () => {
  const {
    ticker,
    setTicker,
    displayType,
    setDisplayType,
    isLoading,
    error,
    generatedSimpleContent,
    generatedDetailContent,
    generateAnalysis,
    generatedForTicker,
    isSaving,
    saveError,
    saveSuccess,
    saveAnalysis,
    geminiResponse,
    isGeneratingWithGemini,
    geminiError,
    generateWithGemini,
    incomeStatement,
    isFetchingIncomeStatement,
    incomeStatementError,
    fetchIncomeStatement,
    companyOverview,
    isFetchingOverview,
    overviewError,
    fetchCompanyOverview,
    stockChartData,
    isFetchingChart,
    chartError,
    fetchStockChart,
    chartRange,
    setRange,
    
    // Transcript Props
    transcriptData,
    isFetchingTranscript,
    transcriptError,
    transcriptSummary,
    isGeneratingSummary,
    summaryError,
    fetchAndSummarizeTranscript,
    
    resultOrder,
  } = useStockAnalysisGenerator();

  const isTickerPresent = ticker.trim().length > 0;
  const contentToDisplay = displayType === 'simple' ? generatedSimpleContent : generatedDetailContent;
  const hasContent = !!(contentToDisplay && !error);

  const renderResultItem = (type) => {
    switch (type) {
      case 'overview':
        if (!companyOverview && !overviewError) return null;
        return (
          <div key="overview">
            {overviewError && <ErrorMessage message={overviewError} />}
            {companyOverview && (
                <CompanyOverviewDisplay 
                    data={companyOverview} 
                    onSummarize={fetchAndSummarizeTranscript}
                    isSummarizing={isGeneratingSummary}
                    transcriptSummary={transcriptSummary}
                />
            )}
          </div>
        );
      case 'income':
        if (!incomeStatement && !incomeStatementError) return null;
        return (
          <div key="income">
            {incomeStatementError && <ErrorMessage message={incomeStatementError} />}
            {incomeStatement && <IncomeStatementDisplay data={incomeStatement} ticker={generatedForTicker} />}
          </div>
        );
      case 'chart':
        if (!stockChartData && !chartError && !isFetchingChart) return null;
        
        if (chartError && !stockChartData) return <div key="chart"><ErrorMessage message={chartError} /></div>;
        
        return (
          <div key="chart">
             {chartError && <ErrorMessage message={chartError} />}
             {(stockChartData || isFetchingChart) && (
                 <StockChartDisplay 
                    data={stockChartData} 
                    ticker={generatedForTicker} 
                    range={chartRange}
                    onRangeChange={setRange}
                    isFetching={isFetchingChart}
                 />
             )}
          </div>
        );
      case 'transcript':
        if (!transcriptData && !transcriptError && !isGeneratingSummary) return null;
        return (
            <div key="transcript">
                {transcriptError && <ErrorMessage message={transcriptError} />}
                {transcriptData && (
                    <EarningsTranscriptDisplay 
                        data={transcriptData} 
                        ticker={generatedForTicker} 
                        summary={transcriptSummary}
                        isSummarizing={isGeneratingSummary}
                        summaryError={summaryError}
                    />
                )}
            </div>
        );
      case 'gemini':
         if ((!geminiResponse && !geminiError)) return null;
         return (
          <div key="gemini">
            {geminiError && <ErrorMessage message={geminiError} />}
            <GeminiResponseDisplay content={geminiResponse} ticker={generatedForTicker} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-[#f8f9fa] from-[#f8f9fa] via-[#e9ecef] to-[#f8f9fa] bg-gradient-to-br font-sans text-gray-800 flex flex-col">
      <div className="container mx-auto px-2 py-8 flex flex-col flex-grow">
        <Header isTickerPresent={isTickerPresent} generatedForTicker={generatedForTicker} />

        <div className={`md:flex md:gap-8 flex-grow ${hasContent ? 'md:items-start' : 'md:items-center md:justify-center'}`}>
          
          {/* --- LEFT COLUMN --- */}
          <div className={`md:w-fit md:flex-shrink-0 ${!hasContent ? 'max-w-md w-full' : ''}`}>
            <div className={`mx-auto md:max-w-none md:mx-0 mb-8 ${hasContent ? 'max-w-md' : ''}`}>
                <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-gray-200 shadow-lg">
                    <InputForm
                        ticker={ticker}
                        setTicker={setTicker}
                        isLoading={isLoading}
                        onSubmit={generateAnalysis}
                        hasContent={hasContent}
                        content={contentToDisplay}
                    />
                    <ErrorMessage message={error} />
                </div>
            </div>

            {hasContent && (
              <div className="mb-8 md:mb-0">
                <SuccessDisplay 
                  ticker={generatedForTicker}
                  companyOverview={companyOverview}
                  isSaving={isSaving}
                  saveSuccess={saveSuccess}
                  onSaveAnalysis={saveAnalysis}
                  displayType={displayType}
                  onDisplayTypeChange={setDisplayType}
                  onFetchIncomeStatement={fetchIncomeStatement}
                  isFetchingIncomeStatement={isFetchingIncomeStatement}
                  onFetchOverview={fetchCompanyOverview}
                  isFetchingOverview={isFetchingOverview}
                  onGenerateWithGemini={generateWithGemini}
                  isGeneratingWithGemini={isGeneratingWithGemini}
                  onFetchStockChart={fetchStockChart}
                  isFetchingChart={isFetchingChart}
                  onFetchTranscript={fetchAndSummarizeTranscript} // Updated usage, though button removed in component
                  isFetchingTranscript={isFetchingTranscript}
                  isGeneratingSummary={isGeneratingSummary}
                  transcriptSummary={transcriptSummary}
                />
                <ErrorMessage message={saveError} />
              </div>
            )}
          </div>
          
          {/* --- RIGHT COLUMN --- */}
          {hasContent && (
            <div className="md:flex-1 min-w-0">
              <div className="space-y-8">
                {resultOrder.map(type => renderResultItem(type))}
                <Preview content={contentToDisplay} />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

// --- RENDER ---
const rootElement = document.getElementById('root');
const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);