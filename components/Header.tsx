
import React from 'react';
import { ChartIcon } from './icons/ChartIcon';

const Header: React.FC = () => {
  return (
    <header className="text-center mb-8">
      <div className="flex items-center justify-center gap-3 mb-4">
        <ChartIcon className="w-8 h-8 text-gray-600" />
        <h1 className="text-3xl font-bold text-gray-800">Stock Analysis Generator</h1>
      </div>
      <p className="text-gray-500">Enter a stock ticker to generate your analysis template</p>
    </header>
  );
};

export default Header;
