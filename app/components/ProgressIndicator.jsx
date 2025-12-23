'use client';

import { memo, useMemo } from 'react';

const PHASES = ['input', 'critique', 'result'];

const PHASE_LABELS = {
  input: { idea: 'Describe idea', prompt: 'Paste prompt', default: 'Choose entry' },
  critique: 'Answer questions',
  result: 'Done'
};

function ProgressIndicator({ phase, entryMode }) {
  const currentPhaseIndex = useMemo(() => PHASES.indexOf(phase), [phase]);

  const label = useMemo(() => {
    if (phase === 'input') {
      if (!entryMode) return PHASE_LABELS.input.default;
      return PHASE_LABELS.input[entryMode];
    }
    return PHASE_LABELS[phase];
  }, [phase, entryMode]);

  return (
    <div className="flex items-center gap-2 mb-6">
      {PHASES.map((p, i) => {
        const isComplete = currentPhaseIndex > i;
        const isCurrent = phase === p;
        return (
          <div key={p} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              isCurrent ? 'bg-blue-600 text-white' :
              isComplete ? 'bg-green-600 text-white' :
              'bg-slate-700 text-slate-400'
            }`}>
              {isComplete ? '✓' : i + 1}
            </div>
            {i < 2 && (
              <div className={`w-8 md:w-12 h-0.5 transition-colors ${
                isComplete ? 'bg-green-600' : 'bg-slate-700'
              }`} />
            )}
          </div>
        );
      })}
      <span className="text-sm text-slate-500 ml-2">{label}</span>
    </div>
  );
}

export default memo(ProgressIndicator);
