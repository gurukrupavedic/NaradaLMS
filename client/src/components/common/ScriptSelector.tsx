/**
 * Script Selector Component
 * 
 * Handles script switching interface and state management.
 * 
 * Created: January 2025
 * Purpose: Script selection functionality for text segmentation
 */

import React from 'react';
import type { Script } from '@shared/types/text-segmentation';

interface ScriptSelectorProps {
  currentScript: Script;
  availableScripts: Script[];
  onScriptChange: (script: Script) => void;
  disabled?: boolean;
}

const getScriptLabel = (script: Script): string => {
  switch (script) {
    case 'te': return 'TE';
    case 'hi': return 'DEV';
    case 'en': return 'IAST';
    default: return script;
  }
};

export const ScriptSelector: React.FC<ScriptSelectorProps> = ({
  currentScript,
  availableScripts,
  onScriptChange,
  disabled = false
}) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Script:</span>
      <div className="flex border rounded-lg bg-white">
        {availableScripts.map((script, index) => (
          <button
            key={script}
            onClick={() => onScriptChange(script)}
            disabled={disabled}
            className={`px-3 py-1 text-sm font-medium transition-colors ${
              index === 0 ? 'rounded-l-lg' : ''
            } ${
              index === availableScripts.length - 1 ? 'rounded-r-lg' : ''
            } ${
              index > 0 ? 'border-l' : ''
            } ${
              currentScript === script 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {getScriptLabel(script)}
          </button>
        ))}
      </div>
    </div>
  );
};