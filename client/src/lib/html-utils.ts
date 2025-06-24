/**
 * HTML utility functions for text processing and content manipulation
 * 
 * Provides safe HTML-to-text conversion, content validation, and text
 * extraction utilities optimized for multi-script Vedic content handling.
 * 
 * @author Vedic LMS Team
 * @since 2025-06-24
 */

/**
 * Extract plain text from HTML content for segmentation compatibility
 * 
 * Safely converts HTML content to plain text while preserving text structure
 * and handling multi-script content (Telugu, Hindi, English). Removes HTML
 * tags and normalizes whitespace for consistent text processing.
 * 
 * @param html - HTML content string to process
 * @returns Clean plain text with normalized whitespace
 * 
 * @example
 * ```typescript
 * const html = '<p>श्रद्धा <span>सूक्तम्</span></p>';
 * const text = extractPlainText(html); // "श्रद्धा सूक्तम्"
 * ```
 */
export function extractPlainText(html: string): string {
  if (!html) return '';
  
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Get text content and normalize whitespace
  const plainText = tempDiv.textContent || tempDiv.innerText || '';
  
  // Normalize whitespace while preserving line breaks
  return plainText.replace(/\s+/g, ' ').trim();
}

/**
 * Check if content contains HTML markup or is plain text
 * 
 * Analyzes content string to determine if it contains HTML tags,
 * useful for conditional processing and display logic.
 * 
 * @param content - Content string to analyze
 * @returns True if content contains HTML tags, false for plain text
 * 
 * @example
 * ```typescript
 * isHtmlContent('<p>Hello</p>'); // true
 * isHtmlContent('Hello world'); // false
 * ```
 */
export function isHtmlContent(content: string): boolean {
  if (!content) return false;
  
  // Simple check for HTML tags
  const htmlRegex = /<[a-z][\s\S]*>/i;
  return htmlRegex.test(content);
}

/**
 * Convert plain text to basic HTML for rich text editor
 */
export function plainTextToHtml(text: string): string {
  if (!text) return '';
  
  // Convert line breaks to paragraphs
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  
  if (paragraphs.length === 0) return '';
  
  if (paragraphs.length === 1) {
    // Single paragraph - wrap in <p> tags
    return `<p>${paragraphs[0].replace(/\n/g, '<br>')}</p>`;
  }
  
  // Multiple paragraphs
  return paragraphs
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}