/**
 * Extract plain text from HTML content for segmentation compatibility
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
 * Check if content is HTML or plain text
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