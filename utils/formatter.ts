
import { Article } from '../types';
import { useSettingsStore } from '../store/useSettingsStore';
import { DEFAULT_TRACKS } from '../constants/tracks';

export type WeChatTheme = 'tech' | 'minimal';

const STYLES = {
  tech: {
    container: 'font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif; font-size: 16px; line-height: 1.75; color: #333;',
    h2: 'display: flex; align-items: center; border-left: 5px solid #007bff; padding-left: 10px; font-size: 18px; font-weight: bold; margin: 30px 0 15px 0; color: #007bff;',
    h3: 'font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; padding-left: 8px; border-left: 3px solid #007bff; color: #333;',
    p: 'margin-bottom: 15px; text-align: justify; color: #3f3f3f;',
    blockquote: 'background: #f5f5f5; padding: 15px; border-radius: 5px; color: #666; margin: 20px 0; border-left: 4px solid #d0d7de;',
    img: 'border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); display: block; margin: 30px auto; max-width: 100%; height: auto;',
    ul: 'list-style-type: none; padding: 0; margin: 15px 0;',
    li: 'margin-bottom: 8px; position: relative; padding-left: 20px;',
    liPrefix: '<span style="position: absolute; left: 0; top: 10px; width: 6px; height: 6px; background: #007bff; border-radius: 50%;"></span>',
    strong: 'color: #0056b3; font-weight: bold;'
  },
  minimal: {
    container: 'font-family: "Songti SC", serif; font-size: 16px; line-height: 1.8; color: #222;',
    h2: 'font-size: 18px; font-weight: bold; margin: 40px 0 20px 0; text-align: center; color: #000;',
    h3: 'font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; color: #111;',
    p: 'margin-bottom: 20px; text-align: justify;',
    blockquote: 'border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 20px; color: #666; font-style: italic; margin: 30px 0; text-align: center;',
    img: 'display: block; margin: 30px auto; max-width: 100%; height: auto; filter: grayscale(10%); border-radius: 4px;',
    ul: 'list-style: disc; padding-left: 20px; margin: 20px 0;',
    li: 'margin-bottom: 10px;',
    liPrefix: '',
    strong: 'font-weight: 600; color: #000;'
  }
};

/**
 * Formats HTML content for WeChat Official Account.
 * Inlines CSS styles based on the selected theme.
 */
export const formatForWeChat = (html: string, theme: WeChatTheme = 'tech'): string => {
  const s = STYLES[theme];
  const safeHtml = html || '';

  let formatted = `<div style="${s.container}">${safeHtml}</div>`;

  // Helper replacer for tags
  const replaceTag = (tag: string, style: string) => {
    const regex = new RegExp(`<${tag}(.*?)>`, 'gi');
    return formatted.replace(regex, `<${tag} style="${style}"$1>`);
  };

  formatted = replaceTag('h2', s.h2);
  formatted = replaceTag('h3', s.h3);
  formatted = replaceTag('p', s.p);
  formatted = replaceTag('blockquote', s.blockquote);
  formatted = replaceTag('img', s.img);
  formatted = replaceTag('ul', s.ul);
  formatted = replaceTag('strong', s.strong);

  // Special handling for List Items in Tech theme
  if (theme === 'tech') {
    formatted = formatted.replace(
      /<li(.*?)>(.*?)<\/li>/gi, 
      `<li style="${s.li}"$1>${s.liPrefix}<span style="display:inline-block; vertical-align:top;">$2</span></li>`
    );
  } else {
    formatted = replaceTag('li', s.li);
  }

  return formatted;
};

/**
 * Formats article for Xiaohongshu (RedNote).
 * Converts HTML to structured "Emoji List" text format.
 */
export const formatForRedNote = (article: Article): string => {
  const { title, content, tags = [] } = article;
  
  const safeTitle = title || '';
  const safeContent = content || '';
  
  // 1. Title Processing with Auto Emoji
  const emojiMap: Record<string, string> = {
    'AI': '🤖', 'DeepSeek': '🧠', 'React': '⚛️', 'SaaS': '💻', 
    '创业': '🚀', '赚钱': '💰', '效率': '⚡️', '设计': '🎨', '科技': '🦾',
    '星座': '🔮', '运势': '🍀', '塔罗': '🃏', '水逆': '🌊'
  };
  
  let titleEmoji = '🌟'; // Default
  for (const key in emojiMap) {
    if (safeTitle.toUpperCase().includes(key)) titleEmoji = emojiMap[key];
  }
  
  const formattedTitle = `${titleEmoji} ${safeTitle}`;

  // 2. Content Processing (HTML -> Plain Text with Emoji Bullets)
  let plainText = safeContent
    // Headers -> Section Breakers
    .replace(/<h2.*?>(.*?)<\/h2>/gi, '\n\n📌 $1\n')
    .replace(/<h3.*?>(.*?)<\/h3>/gi, '\n\n🔹 $1\n')
    
    // Lists -> Checkmarks
    .replace(/<li.*?>(.*?)<\/li>/gi, '\n✅ $1')
    .replace(/<ul.*?>/gi, '')
    .replace(/<\/ul>/gi, '')
    
    // Paragraphs -> Spacing
    .replace(/<p.*?>(.*?)<\/p>/gi, '\n$1\n')
    
    // Quotes -> Highlights
    .replace(/<blockquote.*?>(.*?)<\/blockquote>/gi, '\n💡 "$1"\n')
    
    // Images -> Remove entirely (RedNote requires manual image upload)
    .replace(/<img.*?>/gi, '')
    
    // Remove all remaining tags
    .replace(/<[^>]+>/g, '')
    
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

  // Compress multiple newlines
  plainText = plainText.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

  // 3. Hashtag Generation (Dynamic based on Track)
  // Retrieve current active track keywords to use as fallback/pool
  const { activeTrackId, customTrackKeywords } = useSettingsStore.getState();
  let trackKeywords: string[] = [];
  
  if (activeTrackId === 'custom') {
    trackKeywords = customTrackKeywords || [];
  } else {
    const track = DEFAULT_TRACKS.find(t => t.id === activeTrackId);
    if (track) trackKeywords = track.keywords;
  }
  
  // Use article tags if available (generated by AI), otherwise use current track keywords
  const sourceTags = (tags && tags.length > 0) ? tags : trackKeywords;
  
  // Clean and Format
  const uniqueTags = Array.from(new Set(sourceTags.map(t => t.replace(/^#/, ''))));
  // Limit to top 15 tags
  const hashtagBlock = uniqueTags.slice(0, 15).map(t => `#${t}`).join(' ');

  return `${formattedTitle}\n\n${plainText}\n\n${hashtagBlock}`;
};
