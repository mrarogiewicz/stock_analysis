import React, { useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { marked } from 'marked';

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
            throw new Error(data.error || 'Failed to fetch income statement.');
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

    } catch (e) {
        console.error(e);
        setOverviewError(e.message);
    } finally {
        setIsFetchingOverview(false);
    }
  }, [generatedForTicker, addToResultOrder]);

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
const Header = ({ isTickerPresent }) => {
  return (
    <header className="text-center mb-8">
      <div className="inline-flex items-center justify-center gap-3 mb-4">
        <ChartIcon className={`w-8 h-8 transition-colors duration-300 ${isTickerPresent ? 'text-[#38B6FF]' : 'text-black'}`} />
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 whitespace-nowrap">Stock Analysis Generator</h1>
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
    <div className="mt-4 bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
      {message}
    </div>
  );
};

const SuccessDisplay = ({ 
    ticker, 
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
    isGeneratingWithGemini
}) => {
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-gray-200 shadow-lg">
      <div className="text-center mb-4">
        <p className="font-medium text-gray-700">
          Analysis for ticker -{' '}
          <span style={{ color: '#38B6FF' }} className="font-bold">
            {ticker}
          </span>
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
                                src="https://icon-library.com/images/overview-icon/overview-icon-7.jpg" 
                                alt="" 
                                className="w-4 h-4 object-contain" 
                            />
                            <span>Overview</span>
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
                                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS8LzpNbop14ZIV69sK22MLFRAqkzB0L_bG-g&s" 
                                alt="" 
                                className="w-4 h-4 object-contain" 
                            />
                            <span>Income Statement</span>
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

const GeminiResponseDisplay = ({ content, ticker }) => {
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
            Gemini Pro Analysis for{' '}
            <span style={{ color: '#38B6FF' }} className="font-bold">
              {ticker}
            </span>
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

const CompanyOverviewDisplay = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!data) return null;
  
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
             <div className="text-right text-xs text-gray-500 hidden sm:block">
                <p>Fiscal Year End: {data.FiscalYearEnd}</p>
                <p>Latest Qtr: {data.LatestQuarter}</p>
             </div>
          </div>
          
          <div 
            className="mt-4 cursor-pointer group"
            onClick={() => setIsExpanded(!isExpanded)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsExpanded(!isExpanded) }}
          >
             <p className={`text-gray-700 leading-relaxed text-sm transition-all duration-200 ${isExpanded ? '' : 'line-clamp-3'}`}>
                {data.Description}
             </p>
             {!isExpanded && (
                 <span className="text-xs text-[#38B6FF] font-medium mt-1 inline-block group-hover:underline">Read more</span>
             )}
          </div>
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
                <dt className="text-gray-500">Price/Book</dt> <dd className="text-right font-medium text-gray-900">{formatNumber(data.PriceToBookRatio)}</dd>
                <dt className="text-gray-500">Price/Sales</dt> <dd className="text-right font-medium text-gray-900">{formatNumber(data.PriceToSalesRatioTTM)}</dd>
                <dt className="text-gray-500">EV/Revenue</dt> <dd className="text-right font-medium text-gray-900">{formatNumber(data.EVToRevenue)}</dd>
                <dt className="text-gray-500">EV/EBITDA</dt> <dd className="text-right font-medium text-gray-900">{formatNumber(data.EVToEBITDA)}</dd>
                <dt className="text-gray-500">Book Value</dt> <dd className="text-right font-medium text-gray-900">{formatNumber(data.BookValue)}</dd>
             </dl>
          </div>

          {/* Financial Performance */}
          <div>
             <h3 className="font-semibold text-gray-800 mb-3 text-base border-b pb-2 border-gray-100 flex items-center gap-2">
                <span className="bg-green-100 text-green-600 p-1 rounded">📈</span> Financials (TTM)
             </h3>
             <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-gray-500">Revenue</dt> <dd className="text-right font-medium text-gray-900">{formatLargeNumber(data.RevenueTTM)}</dd>
                <dt className="text-gray-500">Rev. Growth (YOY)</dt> <dd className="text-right font-medium text-gray-900">{formatPercent(data.QuarterlyRevenueGrowthYOY)}</dd>
                <dt className="text-gray-500">Gross Profit</dt> <dd className="text-right font-medium text-gray-900">{formatLargeNumber(data.GrossProfitTTM)}</dd>
                <dt className="text-gray-500">EBITDA</dt> <dd className="text-right font-medium text-gray-900">{formatLargeNumber(data.EBITDA)}</dd>
                <dt className="text-gray-500">Net Income (EPS)</dt> <dd className="text-right font-medium text-gray-900">{formatCurrency(data.DilutedEPSTTM)}</dd>
                 <dt className="text-gray-500">Earn. Growth (YOY)</dt> <dd className="text-right font-medium text-gray-900">{formatPercent(data.QuarterlyEarningsGrowthYOY)}</dd>
                <dt className="text-gray-500">Profit Margin</dt> <dd className="text-right font-medium text-gray-900">{formatPercent(data.ProfitMargin)}</dd>
                <dt className="text-gray-500">Operating Margin</dt> <dd className="text-right font-medium text-gray-900">{formatPercent(data.OperatingMarginTTM)}</dd>
                <dt className="text-gray-500">Return on Assets</dt> <dd className="text-right font-medium text-gray-900">{formatPercent(data.ReturnOnAssetsTTM)}</dd>
                <dt className="text-gray-500">Return on Equity</dt> <dd className="text-right font-medium text-gray-900">{formatPercent(data.ReturnOnEquityTTM)}</dd>
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
                <dt className="text-gray-500">% Insiders</dt> <dd className="text-right font-medium text-gray-900">{formatPercent(data.PercentInsiders)}</dd>
                <dt className="text-gray-500">% Institutions</dt> <dd className="text-right font-medium text-gray-900">{formatPercent(data.PercentInstitutions)}</dd>
                <dt className="text-gray-500">Beta</dt> <dd className="text-right font-medium text-gray-900">{formatNumber(data.Beta)}</dd>
             </dl>
          </div>
          
          {/* Trading & Dividends */}
          <div>
             <h3 className="font-semibold text-gray-800 mb-3 text-base border-b pb-2 border-gray-100 flex items-center gap-2">
                <span className="bg-orange-100 text-orange-600 p-1 rounded">📉</span> Trading & Dividends
             </h3>
             <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-gray-500">52 Week High</dt> <dd className="text-right font-medium text-gray-900">{formatCurrency(data['52WeekHigh'])}</dd>
                <dt className="text-gray-500">52 Week Low</dt> <dd className="text-right font-medium text-gray-900">{formatCurrency(data['52WeekLow'])}</dd>
                <dt className="text-gray-500">50 Day MA</dt> <dd className="text-right font-medium text-gray-900">{formatCurrency(data['50DayMovingAverage'])}</dd>
                <dt className="text-gray-500">200 Day MA</dt> <dd className="text-right font-medium text-gray-900">{formatCurrency(data['200DayMovingAverage'])}</dd>
                <dt className="text-gray-500">Dividend Yield</dt> <dd className="text-right font-medium text-gray-900">{formatPercent(data.DividendYield)}</dd>
                <dt className="text-gray-500">Div. Per Share</dt> <dd className="text-right font-medium text-gray-900">{formatCurrency(data.DividendPerShare)}</dd>
                <dt className="text-gray-500">Ex-Dividend Date</dt> <dd className="text-right font-medium text-gray-900">{data.ExDividendDate !== 'None' ? data.ExDividendDate : 'N/A'}</dd>
             </dl>
          </div>

          {/* Analyst Ratings */}
          <div className="md:col-span-2">
             <h3 className="font-semibold text-gray-800 mb-3 text-base border-b pb-2 border-gray-100 flex items-center gap-2">
                <span className="bg-yellow-100 text-yellow-600 p-1 rounded">⭐</span> Analyst Ratings
             </h3>
             <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm">
                    <span className="text-gray-500">Target Price: </span>
                    <span className="font-bold text-gray-900 text-lg">{formatCurrency(data.AnalystTargetPrice)}</span>
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

const IncomeStatementDisplay = ({ data, ticker }) => {
    const [reportType, setReportType] = useState('annual'); // 'annual' or 'quarterly'

    const hasAnnualData = data?.annualReports?.length > 0;
    const hasQuarterlyData = data?.quarterlyReports?.length > 0;

    // Default to annual if it exists, otherwise quarterly.
    React.useEffect(() => {
        if (hasAnnualData) {
            setReportType('annual');
        } else if (hasQuarterlyData) {
            setReportType('quarterly');
        }
    }, [hasAnnualData, hasQuarterlyData]);

    if (!data || (!hasAnnualData && !hasQuarterlyData)) {
        if (!data) return null; // Don't show anything if data object doesn't exist yet
        return (
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-gray-200 shadow-lg overflow-hidden p-6 text-center text-gray-600">
                Income statement data not available for {ticker}.
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

    const formatQuarter = (dateString) => {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; // Fallback for invalid dates
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-11
        const quarter = Math.floor(month / 3) + 1;
        return `${year}Q${quarter}`;
    };
  
    const metricsToShow = {
        'totalRevenue': 'Total Revenue',
        'grossProfit': 'Gross Profit',
        'netIncome': 'Net Income'
    };

    const reportsToShow = reportType === 'annual' ? 5 : 6;
    const reports = (reportType === 'annual' ? data.annualReports : data.quarterlyReports)?.slice(0, reportsToShow) || [];
  
    return (
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="p-6">
            <div className="flex justify-between items-center mb-5">
                <h3 className="font-medium text-gray-700">
                    Income Statement
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

          {reports.length > 0 ? (
            <>
                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr>
                        <th scope="col" className="px-4 py-3 sticky left-0 bg-gray-100 z-10">Metric</th>
                        {reports.map(report => (
                            <th scope="col" className="px-4 py-3 text-right" key={report.fiscalDateEnding}>
                            {reportType === 'annual' ? new Date(report.fiscalDateEnding).getFullYear() : formatQuarter(report.fiscalDateEnding)}
                            </th>
                        ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(metricsToShow).map(([key, displayName]) => (
                        <tr className="bg-white border-b hover:bg-gray-50" key={key}>
                            <th scope="row" className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10 align-top">
                            {displayName}
                            </th>
                            {reports.map((report) => (
                                <td className="px-4 py-3 text-right align-top" key={`${report.fiscalDateEnding}-${key}`}>
                                    {formatValue(report[key])}
                                </td>
                            ))}
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="block md:hidden space-y-4">
                    {reports.map(report => (
                        <div key={report.fiscalDateEnding} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                            <h4 className="font-semibold text-base text-gray-800 mb-3 pb-2 border-b border-gray-200">
                                {reportType === 'annual' ? `Year ${new Date(report.fiscalDateEnding).getFullYear()}` : formatQuarter(report.fiscalDateEnding)}
                            </h4>
                            <dl className="space-y-2 text-sm">
                                {Object.entries(metricsToShow).map(([key, displayName]) => (
                                    <div key={key} className="flex justify-between items-center">
                                        <dt className="text-gray-600">{displayName}</dt>
                                        <dd className="font-medium text-gray-900 text-right">{formatValue(report[key])}</dd>
                                    </div>
                                ))}
                            </dl>
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
            {companyOverview && <CompanyOverviewDisplay data={companyOverview} />}
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
        <Header isTickerPresent={isTickerPresent} />

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