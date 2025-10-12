import React, { useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

// --- HOOKS ---
const useStockAnalysisGenerator = () => {
  const [ticker, setTicker] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [apiKeyForDisplay, setApiKeyForDisplay] = useState('');

  const generateAnalysis = useCallback(async () => {
    if (!ticker.trim()) {
      setError('Please enter a stock ticker');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setGeneratedContent('');
    setApiKeyForDisplay('');

    try {
      const res = await fetch('/api/get-key');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch API key from server.');
      }
      
      const apiKey = data.apiKey;
      setApiKeyForDisplay(apiKey);
      setGeneratedContent(`This is a test generation for ticker ${ticker.toUpperCase()}. The API key from your Vercel environment variables is shown below the generate button.`);

    } catch (e) {
      console.error(e);
      setError(e.message);
      setApiKeyForDisplay('Could not retrieve API Key.');
    } finally {
      setIsLoading(false);
    }

  }, [ticker]);
  
  const handleSetTicker = (value) => {
    setTicker(value.toUpperCase());
    if (error) setError(null);
    if (generatedContent) setGeneratedContent('');
    if (apiKeyForDisplay) setApiKeyForDisplay('');
  };

  return {
    ticker,
    setTicker: handleSetTicker,
    promptType: 'detail', // Keep a default value, though it's not used for generation anymore
    setPromptType: () => {}, // Dummy function
    isLoading,
    error,
    generatedContent,
    generateAnalysis,
    apiKeyForDisplay,
  };
};

// --- ICONS ---
const ChartIcon = (props) => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const GenerateIcon = (props) => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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

const PerplexityIcon = (props) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" {...props}>
    <path d="M12 2V22 M12 2L18 7V17L12 22L6 17V7L12 2Z M6 7L18 17 M18 7L6 17" />
  </svg>
);

const GeminiIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12,0 C13.6,8 19.2,9.6 24,12 C19.2,14.4 13.6,16 12,24 C10.4,16 4.8,14.4 0,12 C4.8,9.6 10.4,8 12,0 Z" />
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
const Header = () => {
  return (
    <header className="text-center mb-8">
      <div className="inline-flex items-center justify-center gap-3 mb-4">
        <ChartIcon className="w-8 h-8 text-gray-600" />
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 whitespace-nowrap">Stock Analysis Generator</h1>
      </div>
    </header>
  );
};

const InputForm = ({ ticker, setTicker, isLoading, onSubmit, apiKeyForDisplay }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };
    
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
          className="w-full px-4 py-3 bg-white/80 border border-gray-300 rounded-xl text-gray-800 text-base placeholder-gray-400 focus:ring-2 focus:ring-gray-400 focus:border-gray-500 outline-none transition duration-200 text-center"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !ticker.trim()}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-white bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
      >
        {isLoading ? (
          <>
            <Spinner className="w-5 h-5" />
            Processing...
          </>
        ) : (
          <>
            <GenerateIcon className="w-5 h-5" />
            Generate
          </>
        )}
      </button>

      {apiKeyForDisplay && (
        <div className="mt-4 p-3 bg-gray-100 rounded-lg text-center text-xs text-gray-600 break-all">
          <p className="font-semibold mb-1">API Key Used:</p>
          <code>{apiKeyForDisplay}</code>
        </div>
      )}
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

const SuccessDisplay = ({ ticker, content }) => {
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
  const geminiUrl = 'googlegemini://';
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

      window.location.href = geminiUrl;

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
    <div className="max-w-xl mx-auto">
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-gray-200 shadow-lg">
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 text-green-600 font-medium">
            <CheckIcon className="w-5 h-5" />
            <span>Analysis ready for ticker - {ticker}</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
          >
              {isCopied ? (
              <>
                  <CheckIcon className="w-5 h-5" />
                  Copied!
              </>
              ) : (
              <>
                  <CopyIcon className="w-5 h-5" />
                  Copy
              </>
              )}
          </button>
          <a
              href={perplexityUrl}
              onClick={handlePerplexityClick}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-white bg-black hover:bg-gray-800 transition-colors duration-200"
          >
              {isPerplexityBusy ? (
                  <>
                      <CheckIcon className="w-5 h-5" />
                      Copied & Opening...
                  </>
              ) : (
                  <>
                      <PerplexityIcon className="w-5 h-5" />
                      Perplexity
                  </>
              )}
          </a>
          <a
              href={geminiUrl}
              onClick={handleGeminiClick}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-black bg-white hover:bg-gray-100 border border-gray-300 transition-colors duration-200"
          >
              {isGeminiBusy ? (
                  <>
                      <CheckIcon className="w-5 h-5" />
                      Copied & Opening...
                  </>
              ) : (
                  <>
                      <GeminiIcon className="w-5 h-5" />
                      Gemini
                  </>
              )}
          </a>
          <a
              href={chatGptUrl}
              onClick={handleChatGptClick}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-gray-800 bg-gray-200 hover:bg-gray-300 transition-colors duration-200"
          >
              {isChatGptBusy ? (
                  <>
                      <CheckIcon className="w-5 h-5" />
                      Copied & Opening...
                  </>
              ) : (
                  <>
                      ChatGPT
                  </>
              )}
          </a>
        </div>
      </div>
    </div>
  );
};

const Preview = ({ content }) => {
  return (
    <div className="mt-8 max-w-4xl mx-auto">
      <details className="bg-white/90 backdrop-blur-md rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        <summary className="p-4 text-gray-700 font-medium cursor-pointer hover:bg-gray-50 transition-colors">
          Preview Content (Click to expand)
        </summary>
        <div className="p-4 border-t border-gray-200">
          <pre className="text-xs text-gray-600 whitespace-pre-wrap break-words max-h-96 overflow-y-auto bg-gray-50 p-3 rounded-lg">
            {content}
          </pre>
        </div>
      </details>
    </div>
  );
};

// --- MAIN APP ---
const App = () => {
  const {
    ticker,
    setTicker,
    isLoading,
    error,
    generatedContent,
    generateAnalysis,
    apiKeyForDisplay,
  } = useStockAnalysisGenerator();

  return (
    <main className="min-h-screen bg-[#f8f9fa] from-[#f8f9fa] via-[#e9ecef] to-[#f8f9fa] bg-gradient-to-br font-sans text-gray-800">
      <div className="container mx-auto px-4 py-8">
        <Header />

        <div className="max-w-md mx-auto mb-8">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-gray-200 shadow-lg">
                <InputForm
                    ticker={ticker}
                    setTicker={setTicker}
                    isLoading={isLoading}
                    onSubmit={generateAnalysis}
                    apiKeyForDisplay={apiKeyForDisplay}
                />
                <ErrorMessage message={error} />
            </div>
        </div>

        {generatedContent && !error && (
            <>
                <SuccessDisplay ticker={ticker} content={generatedContent} />
                <Preview content={generatedContent} />
            </>
        )}
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