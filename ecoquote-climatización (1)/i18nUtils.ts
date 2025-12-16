import { LocalizedText } from './types';

/**
 * Helper to extract text in the requested language from a LocalizedText object
 * or return the string as-is if it's legacy data.
 */
export const getLangText = (text: string | LocalizedText | undefined, lang: string): string => {
  if (!text) return '';
  
  // Legacy string support
  if (typeof text === 'string') return text;
  
  // Try exact match (e.g. 'en')
  if (text[lang]) return text[lang];
  
  // Try language code without region (e.g. 'en-US' -> 'en')
  const shortLang = lang.split('-')[0];
  if (text[shortLang]) return text[shortLang];
  
  // Fallback to Spanish
  if (text['es']) return text['es'];
  
  // Fallback to first available key
  const keys = Object.keys(text);
  if (keys.length > 0) return text[keys[0]];
  
  return '';
};