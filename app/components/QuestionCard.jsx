'use client';

import { memo, useCallback } from 'react';

function QuestionCard({ question, index, answer, isEditable, onAnswerChange }) {
  const handleChange = useCallback((e) => {
    onAnswerChange(question.id, e.target.value);
  }, [question.id, onAnswerChange]);

  return (
    <div className="bg-slate-700/50 rounded-lg p-4">
      <div className="flex items-start gap-3 mb-2">
        <span className="bg-slate-600 text-white text-xs font-bold px-2 py-1 rounded">
          {index + 1}
        </span>
        <div className="flex-1">
          <p className="text-white font-medium">{question.question}</p>
          <p className="text-slate-400 text-xs mt-1">{question.why}</p>
        </div>
      </div>
      {isEditable ? (
        <textarea
          value={answer || ''}
          onChange={handleChange}
          placeholder="Your answer (optional)"
          className="w-full mt-3 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
          rows={2}
        />
      ) : answer?.trim() ? (
        <div className="mt-3 bg-slate-700 rounded-lg px-3 py-2 text-sm text-green-300">
          {answer}
        </div>
      ) : (
        <div className="mt-3 text-sm text-slate-500 italic">
          Skipped
        </div>
      )}
    </div>
  );
}

export default memo(QuestionCard);
