# Custom Fonts Directory

This directory contains custom fonts used for Vedic educational content.

## Required Fonts

### 1. JIMS Font (Telugu and IAST)
- **File needed**: `JIMS-Regular.ttf`
- **Used for**: Telugu script and English/IAST romanization
- **Download from**: 
  - https://telugufonts.net/fonts/jims-regular
  - https://telugufonts.org/jims-regular/
  - https://freetelugufonts.com/

### 2. Adishila San Font (Devanagari)
- **Files needed**: 
  - `AdishilaSan-Regular.otf` (weight: 400)
  - `AdishilaSan-Medium.otf` (weight: 500)
  - `AdishilaSan-Bold.otf` (weight: 700)
- **Used for**: Devanagari/Hindi script
- **Download from**: https://adishila.com/fonts/
  - Direct link: https://adishila.com/wp-content/uploads/2020/07/Adishila-San.zip
  - Extract the zip file and place the .otf files in this directory

## Fallback Fonts

If custom fonts are not available, the system will automatically fall back to:
- **Telugu/IAST**: Noto Sans Telugu (loaded from Google Fonts)
- **Devanagari**: Noto Sans Devanagari (loaded from Google Fonts)

## Installation Instructions

1. Download the font files from the sources above
2. Place them in this directory (`client/public/fonts/`)
3. Ensure file names match exactly:
   - `JIMS-Regular.ttf`
   - `AdishilaSan-Regular.otf`
   - `AdishilaSan-Medium.otf`
   - `AdishilaSan-Bold.otf`
4. Restart the development server

## Current Status

- ✅ Font fallbacks configured (Noto Sans Telugu, Noto Sans Devanagari)
- ⏳ Custom fonts pending: JIMS and Adishila San
- ✅ Font declarations in `client/src/index.css`
