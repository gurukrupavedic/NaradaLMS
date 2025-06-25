import { Button } from "@/components/design-system";

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
  const languages = [
    { code: 'te', label: 'తెలుగు', name: 'Telugu' },
    { code: 'hi', label: 'देवनागरी', name: 'Devanagari' },
    { code: 'en', label: 'IAST', name: 'English/IAST' }
  ];

  if (variant === 'compact') {
    return (
      <div className="flex gap-1">
        {languages.map((lang) => (
          <Button
            key={lang.code}
            variant={selectedLanguage === lang.code ? 'default' : 'outline'}
            size="sm"
            onClick={() => onLanguageChange(lang.code)}
            className="text-xs px-2"
          >
            {lang.label}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2 justify-center">
      {languages.map((lang) => (
        <Button
          key={lang.code}
          variant={selectedLanguage === lang.code ? 'default' : 'outline'}
          onClick={() => onLanguageChange(lang.code)}
          className="min-w-[100px]"
        >
          <span className="font-medium">{lang.label}</span>
          <span className="text-xs ml-1 opacity-70">({lang.name.split('/')[0]})</span>
        </Button>
      ))}
    </div>
  );
}