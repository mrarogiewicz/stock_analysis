
import React from 'react';

interface PreviewProps {
  content: string;
}

const Preview: React.FC<PreviewProps> = ({ content }) => {
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

export default Preview;
