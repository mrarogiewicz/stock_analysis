import React, { useState } from 'react';
import { Download, Copy, Check, TrendingUp } from 'lucide-react';

export default function StockTickerTool() {
  const [ticker, setTicker] = useState('');
  const [markdownContent, setMarkdownContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState('');

  const TEMPLATE_URL = 'https://raw.githubusercontent.com/mrarogiewicz/prompts/refs/heads/main/stock_analysis_detail.md';

  const fetchAndProcess = async () => {
    if (!ticker.trim()) {
      setError('Please enter a stock ticker');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      // Try multiple CDN approaches that should work
      const urls = [
        'https://cdn.jsdelivr.net/gh/mrarogiewicz/prompts@main/stock_analysis_detail.md',
        'https://raw.githubusercontent.com/mrarogiewicz/prompts/main/stock_analysis_detail.md',
        'https://raw.githack.com/mrarogiewicz/prompts/main/stock_analysis_detail.md'
      ];
      
      let template = null;
      
      for (let i = 0; i < urls.length; i++) {
        try {
          const response = await fetch(urls[i], {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
          });
          
          if (response.ok) {
            template = await response.text();
            if (template && template.includes('XXX') && template.length > 1000) {
              break;
            }
          }
        } catch (err) {
          continue;
        }
      }
      
      if (!template || !template.includes('XXX')) {
        throw new Error('Could not fetch template from any URL');
      }
      
      const processedContent = template.replace(/XXX/g, ticker.toUpperCase());
      setMarkdownContent(processedContent);
      
    } catch (err) {
      setError('Unable to fetch template automatically. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(markdownContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <TrendingUp className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">Stock Analysis Generator</h1>
          </div>
          <p className="text-gray-300">Enter a stock ticker to generate your analysis template</p>
        </div>

        {/* Input Section */}
        <div className="max-w-md mx-auto mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <label className="block text-white font-medium mb-3">
              Stock Ticker Symbol
            </label>
            <div className="space-y-4">
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="e.g., AAPL"
                className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                maxLength="10"
              />
              
              <button
                onClick={fetchAndProcess}
                disabled={isLoading || !ticker.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Generate Template
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Copy Button Section */}
        {markdownContent && (
          <div className="max-w-md mx-auto">
            <div className="bg-green-500/10 backdrop-blur-sm rounded-2xl p-6 border border-green-500/20">
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 text-green-400 font-medium">
                  <Check className="w-5 h-5" />
                  Template Ready for {ticker}
                </div>
              </div>
              
              <button
                onClick={copyToClipboard}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy to Clipboard
                  </>
                )}
              </button>
              
              <div className="mt-4 text-xs text-gray-400 text-center">
                Markdown template with {ticker} ready to use
              </div>
            </div>
          </div>
        )}

        {/* Preview Section */}
        {markdownContent && (
          <div className="mt-8 max-w-4xl mx-auto">
            <details className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
              <summary className="p-4 text-white font-medium cursor-pointer hover:bg-white/5 rounded-t-2xl">
                Preview Content (Click to expand)
              </summary>
              <div className="p-4 border-t border-white/10">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                  {markdownContent}
                </pre>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
