'use client';

import { memo, useCallback } from 'react';
import { GUIDANCE } from '@/lib/guidance';

function ResultDisplay({
  result,
  selectedVendor,
  isRegenerating,
  error,
  onCopy,
  onStartNew
}) {
  const handleCopy = useCallback(() => {
    onCopy(result.generatedPrompt);
  }, [result.generatedPrompt, onCopy]);

  return (
    <div className={`bg-slate-800 rounded-xl p-4 md:p-6 border border-slate-700 ${isRegenerating ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Your Prompt</h2>
          {isRegenerating && (
            <span className="flex items-center gap-2 text-sm text-blue-400">
              <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
              Adapting for {GUIDANCE[selectedVendor].name}...
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          disabled={isRegenerating}
          className="text-sm text-blue-400 hover:text-blue-300 px-3 py-1 rounded hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          Copy
        </button>
      </div>

      <div className="bg-slate-900 rounded-lg px-4 py-4 text-white font-mono text-sm whitespace-pre-wrap max-h-80 overflow-y-auto border border-slate-700">
        {result.generatedPrompt}
      </div>

      {result.summary && (
        <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
          <p className="text-slate-300 text-sm">{result.summary}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {result.assumptions && result.assumptions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-yellow-400 mb-3">Assumptions made</h3>
          <div className="space-y-2">
            {result.assumptions.map((a, i) => (
              <div key={i} className="bg-slate-700/30 rounded p-3">
                <p className="text-yellow-300 text-sm">⚡ {a.assumption}</p>
                <p className="text-slate-500 text-xs mt-1">{a.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.structure && result.structure.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Prompt structure</h3>
          <div className="grid gap-2">
            {result.structure.map((s, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="text-green-400 font-mono">{s.section}</span>
                <span className="text-slate-500">{s.purpose}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.suggestions && result.suggestions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-400 mb-2">Further improvements</h3>
          <ul className="text-sm text-slate-400 space-y-1">
            {result.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-slate-500">•</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onStartNew}
        disabled={isRegenerating}
        className="mt-6 w-full py-2 rounded-lg font-medium text-slate-400 border border-slate-600 hover:border-slate-500 hover:text-white transition-colors disabled:opacity-50"
      >
        Start New Prompt
      </button>
    </div>
  );
}

export default memo(ResultDisplay);
