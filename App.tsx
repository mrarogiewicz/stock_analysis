
import React from 'react';
import { useTemplateGenerator } from './hooks/useTemplateGenerator';
import Header from './components/Header';
import InputForm from './components/InputForm';
import ErrorMessage from './components/ErrorMessage';
import SuccessDisplay from './components/SuccessDisplay';
import Preview from './components/Preview';

const App: React.FC = () => {
  const {
    ticker,
    setTicker,
    isLoading,
    error,
    generatedContent,
    generateTemplate,
  } = useTemplateGenerator();

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
                    onSubmit={generateTemplate}
                />
                {error && <ErrorMessage message={error} />}
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

export default App;
