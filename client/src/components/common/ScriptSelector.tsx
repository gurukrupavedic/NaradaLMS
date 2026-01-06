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
  showLabel?: boolean;
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
  availableScripts = ['te', 'hi', 'en'],
  onScriptChange,
  disabled = false,
  showLabel = true
}) => {
  return (
    <div className="flex items-center gap-1">
      {showLabel && <span className="text-xs font-medium text-gray-700">Script:</span>}
      <div className="flex border rounded-md bg-white overflow-hidden">
        {availableScripts.map((script, index) => (
          <button
            key={script}
            onClick={() => onScriptChange(script)}
            disabled={disabled}
            className={`px-2.5 py-1 text-xs font-medium transition-colors ${
              index === 0 ? 'rounded-l-md' : ''
            } ${
              index === availableScripts.length - 1 ? 'rounded-r-md' : ''
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