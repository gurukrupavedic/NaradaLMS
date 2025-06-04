import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Languages } from 'lucide-react';
import { languageOptions } from '@/components/ui/fonts';

interface LanguageSwitcherProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  variant?: 'default' | 'compact';
}

export function LanguageSwitcher({ 
  selectedLanguage, 
  onLanguageChange, 
  variant = 'default' 
}: LanguageSwitcherProps) {
  const selectedOption = languageOptions.find(opt => opt.id === selectedLanguage);

  if (variant === 'compact') {
    return (
      <div className="flex items-center space-x-2">
        <Languages className="h-4 w-4 text-gray-600" />
        <Select value={selectedLanguage} onValueChange={onLanguageChange}>
          <SelectTrigger className="w-32 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {languageOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                <span className={option.fontClass}>{option.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <span className="text-sm font-medium text-gray-700">Script:</span>
      <Select value={selectedLanguage} onValueChange={onLanguageChange}>
        <SelectTrigger className="w-48">
          <SelectValue>
            {selectedOption && (
              <span className={selectedOption.fontClass}>
                {selectedOption.name}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {languageOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              <div className="flex items-center space-x-2">
                <span className={option.fontClass}>{option.name}</span>
                <span className="text-xs text-gray-500">({option.fullName})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
