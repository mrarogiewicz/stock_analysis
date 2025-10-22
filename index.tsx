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
  const [displayType, setDisplayType] = useState('detail');

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
      setDisplayType('detail'); // Default to showing detail view
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
    if (displayType !== 'simple' || !generatedSimpleContent) return;

    setIsGeneratingWithGemini(true);
    setGeminiError(null);
    setGeminiResponse('');

    try {
      const res = await fetch('/api/generate-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: generatedSimpleContent }),
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
  }, [generatedSimpleContent, displayType]);

  const fetchIncomeStatement = useCallback(async () => {
    if (!generatedForTicker) return;

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
  }, [generatedForTicker]);

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

const CopyIcon = (props) => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CloudUploadIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
  </svg>
);

const AiIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.502L16.5 21.75l-.398-1.248a3.375 3.375 0 00-2.455-2.456L12.75 18l1.248-.398a3.375 3.375 0 002.455-2.456L16.5 14.25l.398 1.248a3.375 3.375 0 002.456 2.456l1.248.398-1.248.398a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
);

const ArrowUpIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" />
    </svg>
);
const ArrowDownIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
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

const InputForm = ({ ticker, setTicker, isLoading, onSubmit }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };
  const isDisabledAndNotLoading = !isLoading && !ticker.trim();
    
  return (
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

const SuccessDisplay = ({ ticker, content, isSaving, saveSuccess, onSaveAnalysis, displayType, onDisplayTypeChange, onGenerateWithGemini, isGeneratingWithGemini, onFetchIncomeStatement, isFetchingIncomeStatement }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isPerplexityBusy, setIsPerplexityBusy] = useState(false);
  const [isGeminiBusy, setIsGeminiBusy] = useState(false);
  const [isChatGptBusy, setIsChatGptBusy] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy to clipboard.');
    }
  }, [content]);

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
              onClick={() => onDisplayTypeChange('detail')}
              aria-pressed={displayType === 'detail'}
              className={`w-1/2 py-2 rounded-md text-sm font-medium transition-all duration-200 focus:outline-none ${
              displayType === 'detail' ? 'bg-white text-gray-500 shadow-sm' : 'bg-transparent text-gray-500 hover:bg-white/50'
              }`}
          >
              Detail
          </button>
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
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-center gap-4 flex-wrap md:flex-nowrap">
            <a
            href={perplexityUrl}
            onClick={handlePerplexityClick}
            target="_blank"
            rel="noopener noreferrer"
            title="Copy & Open in Perplexity"
            className="w-11 h-11 p-1.5 flex items-center justify-center rounded-lg bg-black shadow-md hover:shadow-lg active:shadow-inner transition-all duration-200"
            >
            {isPerplexityBusy ? (
                <CheckIcon className="w-full h-full text-green-500" />
            ) : (
                <img
                src="https://framerusercontent.com/images/gcMkPKyj2RX8EOEja8A1GWvCb7E.jpg"
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
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Google_Gemini_icon_2025.svg/2048px-Google_Gemini_icon_2025.svg.png"
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
            {displayType === 'simple' && (
            <button
                onClick={onGenerateWithGemini}
                disabled={isGeneratingWithGemini}
                title="Generate Analysis with Gemini Pro"
                className="w-11 h-11 p-1.5 flex items-center justify-center rounded-lg bg-purple-100 shadow-md hover:shadow-lg active:shadow-inner disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-sm transition-all duration-200"
            >
                {isGeneratingWithGemini ? (
                <Spinner className="w-full h-full text-purple-600" />
                ) : (
                <AiIcon className="w-full h-full text-purple-600" />
                )}
            </button>
            )}
            
            {displayType === 'detail' && (
                <button
                onClick={onSaveAnalysis}
                disabled={isSaving || saveSuccess}
                title="Save to Cloud"
                className="w-11 h-11 p-1.5 flex items-center justify-center rounded-lg bg-blue-100 shadow-md hover:shadow-lg active:shadow-inner disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-sm transition-all duration-200"
                >
                {isSaving ? (
                    <Spinner className="w-full h-full text-blue-600" />
                ) : saveSuccess ? (
                    <CheckIcon className="w-full h-full text-green-500" />
                ) : (
                    <CloudUploadIcon className="w-full h-full text-blue-600" />
                )}
                </button>
            )}
            <button
            onClick={handleCopy}
            title="Copy Prompt"
            className="w-11 h-11 p-1.5 flex items-center justify-center rounded-lg bg-gray-200 shadow-md hover:shadow-lg active:shadow-inner transition-all duration-200"
            >
            {isCopied ? (
                <CheckIcon className="w-full h-full text-green-500" />
            ) : (
                <CopyIcon className="w-full h-full text-gray-600" />
            )}
            </button>
        </div>
        <div className="space-y-2">
            <button
                onClick={onFetchIncomeStatement}
                disabled={isFetchingIncomeStatement}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-gray-800 font-medium text-sm border border-gray-300 shadow-md hover:bg-gray-50 active:shadow-inner disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 transition-all duration-200"
            >
                {isFetchingIncomeStatement ? (
                    <>
                        <Spinner className="w-5 h-5 text-gray-600" />
                        <span>Fetching Financials...</span>
                    </>
                ) : (
                    <span>Income Statement</span>
                )}
            </button>
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
            <div className="overflow-x-auto">
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
  } = useStockAnalysisGenerator();

  const isTickerPresent = ticker.trim().length > 0;
  const contentToDisplay = displayType === 'simple' ? generatedSimpleContent : generatedDetailContent;
  const hasContent = !!(contentToDisplay && !error);

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
                    />
                    <ErrorMessage message={error} />
                </div>
            </div>

            {hasContent && (
              <div className="mb-8 md:mb-0">
                <SuccessDisplay 
                  ticker={generatedForTicker} 
                  content={contentToDisplay}
                  isSaving={isSaving}
                  saveSuccess={saveSuccess}
                  onSaveAnalysis={saveAnalysis}
                  displayType={displayType}
                  onDisplayTypeChange={setDisplayType}
                  onGenerateWithGemini={generateWithGemini}
                  isGeneratingWithGemini={isGeneratingWithGemini}
                  onFetchIncomeStatement={fetchIncomeStatement}
                  isFetchingIncomeStatement={isFetchingIncomeStatement}
                />
                <ErrorMessage message={saveError} />
              </div>
            )}
          </div>
          
          {/* --- RIGHT COLUMN --- */}
          {hasContent && (
            <div className="md:flex-1 min-w-0">
              <div className="space-y-8">
                <Preview content={contentToDisplay} />
                
                {(geminiResponse || geminiError) && (
                  <div>
                    <ErrorMessage message={geminiError} />
                    <GeminiResponseDisplay content={geminiResponse} ticker={generatedForTicker} />
                  </div>
                )}
                
                {(incomeStatement || incomeStatementError) && (
                    <div>
                        <ErrorMessage message={incomeStatementError} />
                        <IncomeStatementDisplay data={incomeStatement} ticker={generatedForTicker} />
                    </div>
                )}

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