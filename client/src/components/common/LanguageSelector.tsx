/**
 * Language Selector Component
 * 
 * Handles language switching interface and state management.
 * 
 * Created: January 2025
 * Purpose: Language selection functionality for text segmentation
 */

import React from 'react';
import type { Language } from '@shared/types/text-segmentation';

interface LanguageSelectorProps {
  currentLanguage: Language;
  availableLanguages: Language[];
  onLanguageChange: (language: Language) => void;
  disabled?: boolean;
}

const getLanguageLabel = (language: Language): string => {
  switch (language) {
    case 'te': return 'TE';
    case 'hi': return 'HI';
    case 'en': return 'EN-IAST';
    default: return language;
  }
};

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  availableLanguages,
  onLanguageChange,
  disabled = false
}) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Language:</span>
      <div className="flex border rounded-lg bg-white">
        {availableLanguages.map((lang, index) => (
          <button
            key={lang}
            onClick={() => onLanguageChange(lang)}
            disabled={disabled}
            className={`px-3 py-1 text-sm font-medium transition-colors ${
              index === 0 ? 'rounded-l-lg' : ''
            } ${
              index === availableLanguages.length - 1 ? 'rounded-r-lg' : ''
            } ${
              index > 0 ? 'border-l' : ''
            } ${
              currentLanguage === lang 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {getLanguageLabel(lang)}
          </button>
        ))}
      </div>
    </div>
  );
};