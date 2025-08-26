
import { useState, useCallback } from 'react';
import { fetchTemplate } from '../services/templateService';

export const useTemplateGenerator = () => {
  const [ticker, setTicker] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string>('');

  const generateTemplate = useCallback(async () => {
    if (!ticker.trim()) {
      setError('Please enter a stock ticker');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedContent('');

    try {
      const template = await fetchTemplate();
      const content = template.replace(/XXX/g, ticker.toUpperCase());
      setGeneratedContent(content);
    } catch (err) {
      console.error('Fetch error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Unable to fetch template. ${errorMessage}`);
      setGeneratedContent('');
    } finally {
      setIsLoading(false);
    }
  }, [ticker]);
  
  const handleSetTicker = (value: string) => {
    setTicker(value.toUpperCase());
    if (error) setError(null);
    if (generatedContent) setGeneratedContent('');
  };

  return {
    ticker,
    setTicker: handleSetTicker,
    isLoading,
    error,
    generatedContent,
    generateTemplate,
  };
};
