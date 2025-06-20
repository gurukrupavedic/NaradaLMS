/**
 * EXPERIMENT 1: Language Selector Component
 * 
 * Extracted from SegmentationStudio to handle language switching
 * interface and state management.
 * 
 * Status: Experimental - Do not use in production
 * Created: January 2025
 * Purpose: Separate language selection from page logic
 */

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Language } from '@shared/experiment1-types';
import { getLanguageLabel } from '@shared/experiment1-utils';

interface LanguageSelectorProps {
  currentLanguage: Language;
  availableLanguages: Language[];
  onLanguageChange: (language: Language) => void;
  disabled?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  availableLanguages,
  onLanguageChange,
  disabled = false
}) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Language:</span>
      <Select
        value={currentLanguage}
        onValueChange={(value) => onLanguageChange(value as Language)}
        disabled={disabled}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableLanguages.map((lang) => (
            <SelectItem key={lang} value={lang}>
              {getLanguageLabel(lang)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};