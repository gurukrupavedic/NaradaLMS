import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const indexCssPath = path.join(__dirname, '../client/src/index.css');

try {
    const content = fs.readFileSync(indexCssPath, 'utf8');
    const errors = [];

    // Check for :root definition (should be only in tokens.css)
    if (content.includes(':root {')) {
        errors.push('FAIL: index.css contains ":root {" definition. Theme tokens must be in client/src/styles/design-system/tokens.css');
    }

    // Check for oklch definitions (should be only in tokens.css)
    if (content.includes('oklch(') && !content.includes('var(--')) {
        // We allow var usage, but not definition.
        // Simple check: if it has "oklch(" it might be a definition.
        // But wait, utilities might use it?
        // Actually, in our architecture, utility classes shouldn't define new colors, only refer to variables.
        // But let's be more specific: "--variable: oklch(" is the pattern for definition.
    }

    // Robust check for variable definitions
    const lines = content.split('\n');
    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('--') && trimmed.includes(':')) {
            // Allow comment-only lines or specific exceptions if needed
            // But generally index.css shouldn't define variables anymore.
            errors.push(`FAIL: index.css defines CSS variable on line ${index + 1}: "${trimmed}". Move to tokens.css.`);
        }
    });

    if (errors.length > 0) {
        console.error('❌ Theme Integrity Check Failed:');
        errors.forEach(e => console.error(e));
        process.exit(1);
    } else {
        console.log('✅ Theme Integrity Check Passed: index.css is clean of token definitions.');
    }

} catch (err) {
    console.error('Error reading index.css:', err);
    process.exit(1);
}
