
import React, { useState, useCallback } from 'react';
import { CheckIcon } from './icons/CheckIcon';
import { CopyIcon } from './icons/CopyIcon';

interface SuccessDisplayProps {
  ticker: string;
  content: string;
}

const SuccessDisplay: React.FC<SuccessDisplayProps> = ({ ticker, content }) => {
  const [isCopied, setIsCopied] = useState(false);

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

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-gray-200 shadow-lg">
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 text-green-600 font-medium">
            <CheckIcon className="w-5 h-5" />
            <span>Template Ready for {ticker}</span>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-white bg-gray-800 hover:bg-black transition-colors duration-200"
        >
          {isCopied ? (
            <>
              <CheckIcon className="w-5 h-5" />
              Copied!
            </>
          ) : (
            <>
              <CopyIcon className="w-5 h-5" />
              Copy to Clipboard
            </>
          )}
        </button>
        <div className="mt-4 text-xs text-gray-500 text-center">
          <span>Markdown template with {ticker} ready to use</span>
        </div>
      </div>
    </div>
  );
};

export default SuccessDisplay;
