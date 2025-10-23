import { useEffect } from "react";

// Font loading utility for Vedic scripts
export function FontLoader() {
  useEffect(() => {
    // Load Google Fonts for Vedic scripts
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+Telugu:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return null;
}

// Font classes for different scripts
export const fontClasses = {
  telugu: "font-['JIMS','Noto_Sans_Telugu',sans-serif]",
  devanagari: "font-['Adishila_San','Noto_Sans_Devanagari',serif]",
  english: "font-['JIMS','Noto_Sans_Telugu',sans-serif]", // IAST uses JIMS font
  interface: "font-['Inter',sans-serif]",
};

// Language options for the application
export const languageOptions = [
  { 
    id: 'te', 
    name: 'తెలుగు', 
    fullName: 'Telugu', 
    fontClass: fontClasses.telugu 
  },
  { 
    id: 'hi', 
    name: 'देवनागरी', 
    fullName: 'Devanagari', 
    fontClass: fontClasses.devanagari 
  },
  { 
    id: 'en', 
    name: 'English (IAST)', 
    fullName: 'English (IAST)', 
    fontClass: fontClasses.english 
  },
];
