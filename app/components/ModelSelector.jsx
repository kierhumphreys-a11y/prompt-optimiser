'use client';

import { memo } from 'react';
import { GUIDANCE } from '@/lib/guidance';

const VENDORS = Object.keys(GUIDANCE);

function ModelSelector({
  selectedVendor,
  selectedModel,
  phase,
  isRegenerating,
  onVendorChange,
  onModelChange
}) {
  const currentGuidance = GUIDANCE[selectedVendor];
  const isDisabled = phase === 'critique' || isRegenerating;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Target Model
          {phase === 'result' && <span className="text-blue-400 ml-2 text-xs">(click to adapt)</span>}
        </label>
        <div className="flex flex-wrap gap-2">
          {VENDORS.map(vendor => (
            <button
              key={vendor}
              onClick={() => onVendorChange(vendor)}
              disabled={isDisabled}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedVendor === vendor
                  ? 'bg-blue-600 text-white'
                  : phase === 'critique'
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              } ${isRegenerating ? 'opacity-50' : ''}`}
            >
              {GUIDANCE[vendor].name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Variant
        </label>
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={isDisabled}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentGuidance.models.map(model => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default memo(ModelSelector);
