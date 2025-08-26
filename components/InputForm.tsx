
import React from 'react';
import { GenerateIcon } from './icons/GenerateIcon';
import { Spinner } from './icons/Spinner';

interface InputFormProps {
  ticker: string;
  setTicker: (value: string) => void;
  isLoading: boolean;
  onSubmit: () => void;
}

const InputForm: React.FC<InputFormProps> = ({ ticker, setTicker, isLoading, onSubmit }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
    
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label htmlFor="tickerInput" className="block text-gray-700 font-medium mb-2">
        Stock Ticker Symbol
      </label>
      <input
        id="tickerInput"
        type="text"
        value={ticker}
        onChange={(e) => setTicker(e.target.value)}
        placeholder="e.g., AAPL"
        maxLength={10}
        className="w-full px-4 py-3 bg-white/80 border border-gray-300 rounded-xl text-gray-800 text-base placeholder-gray-400 focus:ring-2 focus:ring-gray-400 focus:border-gray-500 outline-none transition duration-200"
      />
      <button
        type="submit"
        disabled={isLoading}
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
            Generate Template
          </>
        )}
      </button>
    </form>
  );
};

export default InputForm;
