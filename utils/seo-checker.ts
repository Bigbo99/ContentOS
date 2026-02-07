
import { SEOMetrics } from '../types';

export const checkSEO = (title: string, content: string): SEOMetrics => {
  const safeContent = content || '';
  const safeTitle = title || '';

  const plainText = safeContent.replace(/<[^>]+>/g, '');
  const titleLen = safeTitle.length;
  const wordCount = plainText.length;
  
  const hasH2 = safeContent.includes('<h2');
  const hasH3 = safeContent.includes('<h3');
  const hasImg = safeContent.includes('<img');

  // Simple keyword density based on title words
  const titleWords = safeTitle.split(/\s+/).filter(w => w.length > 2);
  let keywordMatches = 0;
  if (titleWords.length > 0) {
    titleWords.forEach(word => {
      try {
        // Escape regex special characters to prevent crashes
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedWord, 'gi');
        const matches = plainText.match(regex);
        if (matches) keywordMatches += matches.length;
      } catch (e) {
        // Ignore regex errors
      }
    });
  }
  const density = wordCount > 0 ? (keywordMatches / wordCount) * 100 : 0;

  let score = 0;
  if (titleLen >= 30 && titleLen <= 60) score += 25;
  else if (titleLen > 10) score += 10;
  
  if (wordCount >= 500) score += 25;
  else if (wordCount >= 200) score += 15;

  if (hasH2 || hasH3) score += 25;
  if (hasImg) score += 25;

  return {
    score,
    titleLength: titleLen < 30 ? 'low' : titleLen > 60 ? 'high' : 'good',
    contentLength: wordCount < 300 ? 'low' : wordCount > 1500 ? 'high' : 'good',
    keywordDensity: parseFloat(density.toFixed(2)),
    hasHeadings: hasH2 || hasH3,
    hasImages: hasImg
  };
};
