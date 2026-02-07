import { useSettingsStore } from '../store/useSettingsStore';
import { GrowthHackResponse } from '../types';
import { DEFAULT_TRACKS } from '../constants/tracks';
import { ErrorHandler } from '../utils/error-handler';
import { DEFAULT_SYSTEM_PROMPT } from '../constants/default-prompt';

export const AIService = {
  async generateArticle(topic: string, summary: string, lang: 'zh' | 'en' = 'zh'): Promise<{ content: string; reasoningLog: string; aiResponse: GrowthHackResponse; title: string }> {
    let rawJsonString = '';
    let reasoningLog = '';

    try {
      const { deepseekKey } = useSettingsStore.getState();
      if (!deepseekKey) {
        ErrorHandler.handleAuthError('DeepSeek API Key 未配置');
        throw new Error('DeepSeek API Key is not configured. Please go to Settings.');
      }

      const result = await this.generateArticleDeepSeek(topic, summary, deepseekKey, lang);
      rawJsonString = result.json;
      reasoningLog = result.reasoning;

      // Robust JSON Extraction
      const start = rawJsonString.indexOf('{');
      const end = rawJsonString.lastIndexOf('}');

      let cleanJson = '{}';
      if (start !== -1 && end !== -1 && end > start) {
        cleanJson = rawJsonString.substring(start, end + 1);
      } else {
        cleanJson = (rawJsonString || '{}')
          .replace(/^```json\s*/, '')
          .replace(/^```\s*/, '')
          .replace(/\s*```$/, '')
          .trim();
      }

      const parsedData: GrowthHackResponse = JSON.parse(cleanJson);

      // Inject Track Keywords as Tags
      const { activeTrackId, customTrackKeywords } = useSettingsStore.getState();
      let currentTrackKeywords: string[] = [];

      if (activeTrackId === 'custom') {
        currentTrackKeywords = customTrackKeywords || [];
      } else {
        const track = DEFAULT_TRACKS.find(t => t.id === activeTrackId);
        if (track) currentTrackKeywords = track.keywords;
      }

      if (currentTrackKeywords.length > 0) {
        parsedData.xhs_content.tags = currentTrackKeywords.slice(0, 10).map(k => k.startsWith('#') ? k : `#${k}`);
      }

      // Inject Dynamic Images from Pexels
      if (parsedData.wechat_html) {
        parsedData.wechat_html = await this.injectDynamicImages(parsedData.wechat_html);
      }

      // Robust title selection
      const titles = parsedData.titles || {} as any;
      const bestTitle = titles.conflict || titles.greed || titles.fear || titles.identity || titles.abstract || '未命名标题';

      return {
        content: parsedData.wechat_html || '',
        title: bestTitle,
        reasoningLog: reasoningLog + `\n\n> Persona: ${parsedData.persona_used || 'Default'}`,
        aiResponse: parsedData
      };
    } catch (e: any) {
      console.error("AI Generation/Parsing Failed:", e);
      console.log("Raw Response causing error:", rawJsonString);

      ErrorHandler.handleApiError(e, 'DeepSeek AI');
      throw new Error(`生成失败: ${e.message}`);
    }
  },

  async injectDynamicImages(html: string): Promise<string> {
    const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY || '';

    // 收集所有的图片关键词
    const matches = Array.from(html.matchAll(/%%IMAGE_KEYWORD:\s*(.*?)%%/g));

    // 为每个关键词获取图片
    const replacements: { [key: string]: string } = {};

    for (const match of matches) {
      const keyword = match[1].trim().toLowerCase().replace(/[^a-z0-9]/g, '');

      if (!replacements[match[0]]) {
        try {
          // 从 Pexels 搜索图片
          const searchUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&per_page=10&orientation=landscape`;

          const response = await fetch(searchUrl, {
            headers: { 'Authorization': PEXELS_API_KEY }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.photos && data.photos.length > 0) {
              const randomIndex = Math.floor(Math.random() * data.photos.length);
              const imageUrl = data.photos[randomIndex].src.large;
              replacements[match[0]] = `<img src="${imageUrl}" alt="${keyword}" style="border-radius: 8px; margin: 20px 0; width: 100%;" />`;
              continue;
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch Pexels image for keyword: ${keyword}`, e);
        }

        // Fallback to generic technology image
        replacements[match[0]] = `<img src="https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&h=650&w=940" alt="${keyword}" style="border-radius: 8px; margin: 20px 0; width: 100%;" />`;
      }
    }

    // 替换所有图片占位符
    let result = html;
    for (const [placeholder, imgTag] of Object.entries(replacements)) {
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), imgTag);
    }

    return result;
  },

  async generateArticleDeepSeek(topic: string, summary: string, apiKey: string, lang: 'zh' | 'en' = 'zh'): Promise<{ json: string; reasoning: string }> {
    const userPrompt = lang === 'en'
      ? `Topic: ${topic}.\nContext: ${summary}.\nLanguage: English.\nPlease output strictly in JSON format.`
      : `主题: ${topic}。\n背景: ${summary}。\n请严格按照 JSON 格式输出。`;

    // 获取自定义Prompt或使用默认Prompt
    const { customPrompt } = useSettingsStore.getState();
    const systemPrompt = customPrompt || DEFAULT_SYSTEM_PROMPT;

    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'deepseek-reasoner',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`DeepSeek API Failed (${response.status}): ${errText}`);
      }

      const data = await response.json();
      if (!data.choices || !data.choices[0]) {
        throw new Error(`DeepSeek API Error: Invalid response structure ${JSON.stringify(data)}`);
      }

      const reasoning = data.choices[0].message.reasoning_content || '> [DeepSeek R1] 深度思考已激活...';

      return {
        json: data.choices[0].message.content || '{}',
        reasoning: reasoning
      };
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        ErrorHandler.handleNetworkError(error);
      } else {
        ErrorHandler.handleApiError(error, 'DeepSeek');
      }
      throw error;
    }
  },

  async generateImage(topic: string): Promise<string> {
    // Use Pexels API to fetch relevant images
    const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY || '';

    try {
      // Clean and prepare search query
      const cleanTopic = topic
        .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
        .trim()
        .slice(0, 100);

      // Search for images on Pexels
      const searchUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(cleanTopic)}&per_page=15&orientation=landscape`;

      const response = await fetch(searchUrl, {
        headers: {
          'Authorization': PEXELS_API_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`Pexels API returned ${response.status}`);
      }

      const data = await response.json();

      // If we got results, pick a random image from the first page
      if (data.photos && data.photos.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.photos.length);
        const photo = data.photos[randomIndex];

        // Use the large size (1280x853 or similar)
        return photo.src.large || photo.src.original;
      }

      // If no results, fall back to a generic tech search
      const fallbackResponse = await fetch('https://api.pexels.com/v1/search?query=technology&per_page=15&orientation=landscape', {
        headers: {
          'Authorization': PEXELS_API_KEY
        }
      });

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.photos && fallbackData.photos.length > 0) {
          const randomIndex = Math.floor(Math.random() * fallbackData.photos.length);
          return fallbackData.photos[randomIndex].src.large;
        }
      }

      // Final fallback: a fixed high-quality tech image from Pexels
      return 'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

    } catch (e) {
      console.warn("Pexels API Failed, using fallback image:", e);
      // Fallback to a fixed high-quality tech image from Pexels
      return 'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';
    }
  }
};