import { Trend, Source } from '../types';
import { useSettingsStore } from '../store/useSettingsStore';
import { DEFAULT_TRACKS } from '../constants/tracks';
import { LocalTrendGenerator } from './local-trend-generator';

interface RSSItem {
  title: string;
  pubDate: string;
  link: string;
  guid: string;
  author: string;
  thumbnail: string;
  description: string;
  content: string;
  categories?: string[];
}

export const TrendService = {
  /**
   * Fetches trends - 支持 RSS 和 热榜 API
   */
  async fetchTrends(source: Source): Promise<Trend[]> {
    if (!source.active) return [];

    const { activeTrackId } = useSettingsStore.getState();
    let rawTrends: Trend[] = [];

    console.log(`[TrendService] 🚀 Fetching trends from ${source.name} (${source.type})`);

    try {
        // RSS 订阅方式
        if (source.type === 'rss') {
            console.log(`[TrendService] 📡 Fetching RSS feed: ${source.url}`);
            const items = await this.fetchWithFallback(source.url);

            if (items.length > 0) {
                rawTrends = items.map((item: RSSItem) => this.mapRSSToTrend(item, source.name));
                console.log(`[TrendService] ✅ RSS got ${rawTrends.length} trends from ${source.name}`);
                return this.applyTaxonomy(rawTrends);
            } else {
                throw new Error('No items found in RSS feed');
            }
        }

        // 今日热榜 API 方式 (tophub.today - 微博、知乎、抖音、百度、B站、小红书)
        else if (source.type === 'tophub') {
            console.log(`[TrendService] 🔥 Fetching from Tophub API: ${source.url}`);

            // 提取节点 hashid
            const hashid = source.url.split('/nodes/')[1];

            // 使用 Vite 代理路径 (开发环境) 或直接 API (生产环境)
            const proxyUrl = `/api/tophub/nodes/${hashid}`;

            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                throw new Error(`Tophub API returned ${response.status}`);
            }

            const result = await response.json();

            // Parse tophub API response format
            if (!result.data || !Array.isArray(result.data.items)) {
                throw new Error('Invalid tophub API response format');
            }

            const items = result.data.items;

            if (items.length === 0) {
                throw new Error('Tophub API returned no items');
            }

            console.log(`[TrendService] ✅ Tophub API got ${items.length} REAL trends from ${source.name}`);

            // 转换为 Trend 格式
            rawTrends = items.slice(0, 50).map((item: any, index: number) => {
                // 提取真实热度值（去除非数字字符）
                const heatText = item.extra || item.views || item.hot || '0';
                const heatValue = parseInt(heatText.replace(/[^\d]/g, '')) || 0;

                return {
                    id: `tophub_${source.id}_${index}_${Date.now()}`,
                    topic: item.title || '未知标题',
                    source: source.name,
                    heatScore: Math.min(99, 90 - index * 2), // Top items get higher scores
                    summary: item.excerpt || item.desc || item.description || '点击查看详情',
                    timestamp: this.formatAPITimestamp(item.updateTime || item.time),
                    createdAt: new Date().toISOString(),
                    viewCount: heatValue, // 真实热度值
                    likeCount: 0, // Tophub API 不提供点赞数
                    commentCount: 0, // Tophub API 不提供评论数
                    isCommercial: false,
                    forecast: index < 10 ? 'rising' : index < 30 ? 'peak' : 'fading',
                    matchedKeywords: [],
                    isRelevant: false,
                    link: item.url || item.link || item.mobileUrl || '',
                    rank: item.rank || (index + 1) // 真实排名
                };
            });

            return this.applyTaxonomy(rawTrends);
        }

        // 热榜 API 方式 (微博、知乎、抖音等)
        else if (source.type === 'api') {
            console.log(`[TrendService] 🔥 Fetching from hotlist API via proxy: ${source.url}`);

            // 使用本地代理服务器绕过 CORS
            const proxyUrl = `http://localhost:3002/proxy?url=${encodeURIComponent(source.url)}`;

            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                throw new Error(`Proxy returned ${response.status}`);
            }

            const data = await response.json();

            // 支持多种响应格式
            let items: any[] = [];
            if (data.success && Array.isArray(data.data)) {
                items = data.data;
            } else if (data.code === 200 && Array.isArray(data.data)) {
                items = data.data;
            } else if (Array.isArray(data.result)) {
                items = data.result;
            } else if (Array.isArray(data)) {
                items = data;
            }

            if (items.length === 0) {
                throw new Error('API returned no data');
            }

            console.log(`[TrendService] ✅ Hotlist API got ${items.length} REAL trends from ${source.name}`);

            // 转换为 Trend 格式
            rawTrends = items.slice(0, 50).map((item: any, index: number) => ({
                id: `api_${source.id}_${index}_${Date.now()}`,
                topic: item.title || item.name || item.word || '未知标题',
                source: source.name,
                heatScore: this.calculateAPIHeatScore(item, index),
                summary: item.desc || item.excerpt || item.hot_value || '点击查看详情',
                timestamp: this.formatAPITimestamp(item.time || item.updateTime),
                createdAt: new Date().toISOString(),
                viewCount: parseInt(item.hot || item.view || item.hot_value || '0') || (100000 - index * 1000),
                likeCount: 0,
                commentCount: 0,
                isCommercial: false,
                forecast: index < 10 ? 'rising' : index < 30 ? 'peak' : 'fading',
                matchedKeywords: [],
                isRelevant: false,
                link: item.url || item.link || item.mobileUrl || item.mobile_url || ''
            }));

            return this.applyTaxonomy(rawTrends);
        }

        // 如果没有数据，抛出错误进入 fallback
        throw new Error(`No data fetched from ${source.name}`);

    } catch (e: any) {
        // Log error details for debugging
        console.error(`[TrendService] ❌ Real fetch failed for ${source.name}:`, e.message);
        console.error(`[TrendService] ⚠️  WARNING: Using SIMULATED DATA for ${source.name}`);
        console.error(`[TrendService] ⚠️  This is NOT real data! API/RSS feed failed.`);

        // Visual alert in console
        console.warn(
            `%c⚠️  模拟数据警告 ⚠️`,
            'background: #ff4444; color: white; font-size: 16px; padding: 10px; font-weight: bold;'
        );
        console.warn(
            `%c数据源 "${source.name}" 的真实数据抓取失败，正在使用模拟数据。\n` +
            `这不是真实热点！请检查网络连接或API密钥。`,
            'background: #ffaa00; color: black; font-size: 14px; padding: 8px;'
        );

        rawTrends = this.getMockTrends(source.name, activeTrackId);
    }

    return this.applyTaxonomy(rawTrends);
  },

  calculateAPIHeatScore(item: any, index: number): number {
    const baseScore = 99 - index;
    const hotValue = parseInt(item.hot || item.view || item.hot_value || '0') || 0;
    const bonus = hotValue > 1000000 ? 5 : hotValue > 100000 ? 3 : 1;
    return Math.min(99, baseScore + bonus);
  },

  formatAPITimestamp(time: string | number | undefined): string {
    if (!time) return '刚刚';
    try {
      const date = new Date(time);
      const now = Date.now();
      const diff = now - date.getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return '刚刚';
      if (minutes < 60) return `${minutes}分钟前`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}小时前`;
      return `${Math.floor(hours / 24)}天前`;
    } catch {
      return '刚刚';
    }
  },

  /**
   * Fetches raw text (HTML) via CORS proxies.
   * Enhanced with more reliable proxy services and better error handling.
   */
  async fetchProxyText(url: string): Promise<string> {
      const timeoutMs = 15000; // Increased timeout to 15s for better reliability
      const strategies = [
          {
              name: 'AllOrigins',
              fetch: async () => {
                  const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, {
                      signal: AbortSignal.timeout(timeoutMs),
                      headers: { 'Accept': 'application/json' }
                  });
                  if (res.ok) {
                      const data = await res.json();
                      if (data.contents) return data.contents;
                  }
                  throw new Error('AllOrigins: No content');
              }
          },
          {
              name: 'ThingProxy',
              fetch: async () => {
                  const res = await fetch(`https://thingproxy.freeboard.io/fetch/${url}`, {
                      signal: AbortSignal.timeout(timeoutMs)
                  });
                  if (res.ok) return await res.text();
                  throw new Error('ThingProxy failed');
              }
          },
          {
              name: 'CorsProxy.io',
              fetch: async () => {
                  const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, {
                      signal: AbortSignal.timeout(timeoutMs)
                  });
                  if (res.ok) return await res.text();
                  throw new Error('CorsProxy.io failed');
              }
          },
          {
              name: 'CORS Anywhere',
              fetch: async () => {
                  const res = await fetch(`https://cors-anywhere.herokuapp.com/${url}`, {
                      signal: AbortSignal.timeout(timeoutMs),
                      headers: { 'X-Requested-With': 'XMLHttpRequest' }
                  });
                  if (res.ok) return await res.text();
                  throw new Error('CORS Anywhere failed');
              }
          },
          {
              name: 'CodeTabs',
              fetch: async () => {
                  const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`, {
                      signal: AbortSignal.timeout(timeoutMs)
                  });
                  if (res.ok) return await res.text();
                  throw new Error('CodeTabs failed');
              }
          }
      ];

      for (const strategy of strategies) {
          try {
              console.log(`[TrendService] Trying ${strategy.name} for ${url}`);
              const result = await strategy.fetch();
              if (result && result.length > 100) { // Validate we got meaningful content
                  console.log(`[TrendService] ✅ ${strategy.name} succeeded`);
                  return result;
              }
          } catch (e: any) {
              console.warn(`[TrendService] ${strategy.name} failed: ${e.message}`);
          }
      }

      throw new Error(`All ${strategies.length} HTML proxy strategies failed for ${url}`);
  },

  /**
   * Scraper for Weibo Hot Search
   */
  parseWeibo(html: string, sourceName: string): Trend[] {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const rows = Array.from(doc.querySelectorAll('td.td-02'));

      return rows.map((td, index) => {
          const linkEl = td.querySelector('a');
          const heatEl = td.querySelector('span');

          if (!linkEl) return null;

          const title = linkEl.textContent || '';
          const href = linkEl.getAttribute('href') || '';
          const link = href.startsWith('http') ? href : `https://s.weibo.com${href}`;
          const heatText = heatEl ? heatEl.textContent : '0';
          const heatScore = parseInt((heatText || '0').replace(/[^0-9]/g, '')) / 10000;

          if (!heatEl && index === 0) return null;

          return {
              id: `wb_${this.hashCode(title)}`,
              topic: title,
              source: sourceName,
              heatScore: Math.min(99, Math.round(heatScore)),
              summary: '微博实时热搜话题',
              timestamp: '实时',
              createdAt: new Date().toISOString(),
              viewCount: Math.round(heatScore * 10000),
              likeCount: 0,
              commentCount: 0,
              isCommercial: false,
              forecast: 'rising',
              matchedKeywords: [],
              isRelevant: false,
              link: link // 添加微博链接
          };
      }).filter(Boolean) as Trend[];
  },

  /**
   * Scraper for Tophub (小红书、抖音等热榜)
   * Enhanced with better HTML parsing and multiple selector strategies
   */
  parseTophub(html: string, sourceName: string): Trend[] {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Try multiple selector strategies for better compatibility
      let rows: Element[] = [];

      // Strategy 1: Standard table rows
      rows = Array.from(doc.querySelectorAll('table tbody tr'));

      // Strategy 2: If no rows found, try alternative selectors
      if (rows.length === 0) {
          rows = Array.from(doc.querySelectorAll('.tr-line, .item, .list-item'));
      }

      // Strategy 3: Look for any anchor tags in a list-like structure
      if (rows.length === 0) {
          rows = Array.from(doc.querySelectorAll('a[href*="/n/"]')).map(a => a.parentElement).filter(Boolean) as Element[];
      }

      console.log(`[TrendService] Tophub found ${rows.length} items for ${sourceName}`);

      const trends = rows.map((tr, index) => {
          // Try multiple selectors for title
          let titleEl = tr.querySelector('td.al a') || tr.querySelector('a.t') || tr.querySelector('a');
          let heatEl = tr.querySelector('td:nth-child(3)') || tr.querySelector('.hot-index') || tr.querySelector('.count');

          if (!titleEl) return null;

          const title = titleEl.textContent?.trim() || '';
          if (!title || title.length < 3) return null; // Skip invalid titles

          const href = titleEl.getAttribute('href') || '';
          const link = href.startsWith('http') ? href : (href ? `https://tophub.today${href}` : '');
          const heatText = heatEl?.textContent?.trim() || '0';

          // Parse heat value with better number extraction
          let heatVal = 0;
          const numberMatch = heatText.match(/[\d.]+/);
          if (numberMatch) {
              heatVal = parseFloat(numberMatch[0]);
              if (heatText.includes('万') || heatText.includes('w') || heatText.includes('W')) {
                  heatVal *= 10000;
              } else if (heatText.includes('k') || heatText.includes('K')) {
                  heatVal *= 1000;
              }
          }

          // If no heat value, estimate based on position
          if (heatVal === 0) {
              heatVal = (50 - index) * 10000; // Top items get higher scores
          }

          return {
              id: `th_${this.hashCode(title + sourceName)}`,
              topic: title,
              source: sourceName,
              heatScore: Math.min(99, Math.max(10, Math.round(heatVal / 10000))),
              summary: `${sourceName} 热门话题 #${index + 1}`,
              timestamp: '实时',
              createdAt: new Date().toISOString(),
              viewCount: Math.round(heatVal),
              likeCount: Math.round(heatVal * 0.05),
              commentCount: Math.round(heatVal * 0.01),
              isCommercial: false,
              forecast: index < 10 ? 'rising' : index < 30 ? 'peak' : 'fading',
              matchedKeywords: [],
              isRelevant: false,
              link: link // 添加 Tophub 链接
          };
      }).filter(Boolean) as Trend[];

      console.log(`[TrendService] Tophub parsed ${trends.length} valid trends for ${sourceName}`);
      return trends;
  },

  /**
   * RSS Fallback Strategy - Enhanced with better error handling and more proxies
   */
  async fetchWithFallback(url: string): Promise<RSSItem[]> {
    const timeoutMs = 15000; // Increased timeout

    const strategies = [
        {
            name: 'RSS2JSON',
            fetch: async () => {
                const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
                const res = await fetch(apiUrl, { signal: AbortSignal.timeout(timeoutMs) });
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'ok' && Array.isArray(data.items) && data.items.length > 0) {
                        return data.items;
                    }
                }
                throw new Error('RSS2JSON: Invalid response');
            }
        },
        {
            name: 'AllOrigins + XML',
            fetch: async () => {
                const apiUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
                const res = await fetch(apiUrl, { signal: AbortSignal.timeout(timeoutMs) });
                if (res.ok) {
                    const data = await res.json();
                    if (data.contents) {
                        const items = this.parseXML(data.contents);
                        if (items.length > 0) return items;
                    }
                }
                throw new Error('AllOrigins: No items parsed');
            }
        },
        {
            name: 'ThingProxy + XML',
            fetch: async () => {
                const apiUrl = `https://thingproxy.freeboard.io/fetch/${url}`;
                const res = await fetch(apiUrl, { signal: AbortSignal.timeout(timeoutMs) });
                if (res.ok) {
                    const text = await res.text();
                    const items = this.parseXML(text);
                    if (items.length > 0) return items;
                }
                throw new Error('ThingProxy: No items parsed');
            }
        },
        {
            name: 'CorsProxy + XML',
            fetch: async () => {
                const apiUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
                const res = await fetch(apiUrl, { signal: AbortSignal.timeout(timeoutMs) });
                if (res.ok) {
                    const text = await res.text();
                    const items = this.parseXML(text);
                    if (items.length > 0) return items;
                }
                throw new Error('CorsProxy: No items parsed');
            }
        },
        {
            name: 'Direct Fetch + XML',
            fetch: async () => {
                // Try direct fetch as last resort (may fail due to CORS)
                const res = await fetch(url, {
                    signal: AbortSignal.timeout(timeoutMs),
                    mode: 'cors'
                });
                if (res.ok) {
                    const text = await res.text();
                    const items = this.parseXML(text);
                    if (items.length > 0) return items;
                }
                throw new Error('Direct: No items parsed');
            }
        }
    ];

    for (const strategy of strategies) {
        try {
            console.log(`[TrendService] Trying RSS ${strategy.name} for ${url}`);
            const items = await strategy.fetch();
            if (items && items.length > 0) {
                console.log(`[TrendService] ✅ RSS ${strategy.name} succeeded with ${items.length} items`);
                return items;
            }
        } catch (e: any) {
            console.warn(`[TrendService] RSS ${strategy.name} failed: ${e.message}`);
        }
    }

    throw new Error(`All ${strategies.length} RSS proxy strategies exhausted for ${url}`);
  },

  parseXML(xmlText: string): RSSItem[] {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const items = Array.from(xmlDoc.querySelectorAll("item"));
        
        return items.map(item => {
            const title = item.querySelector("title")?.textContent || "无标题";
            const link = item.querySelector("link")?.textContent || "";
            const pubDate = item.querySelector("pubDate")?.textContent || new Date().toISOString();
            const description = item.querySelector("description")?.textContent || "";
            const content = item.getElementsByTagNameNS("*", "encoded")[0]?.textContent || description;
            const author = item.querySelector("creator")?.textContent || item.querySelector("author")?.textContent || "Unknown";
            const guid = item.querySelector("guid")?.textContent || link;

            return {
                title,
                link,
                pubDate,
                description,
                content,
                author,
                guid,
                thumbnail: ''
            };
        });
    } catch (e) {
        console.error("XML Parse Error", e);
        return [];
    }
  },

  applyTaxonomy(trends: Trend[]): Trend[] {
    const { activeTrackId, customTrackKeywords } = useSettingsStore.getState();
    const track = DEFAULT_TRACKS.find(t => t.id === activeTrackId);

    let keywords: string[] = [];
    if (activeTrackId === 'custom') {
        keywords = Array.isArray(customTrackKeywords) ? customTrackKeywords : [];
    } else if (track) {
        keywords = track.keywords;
    }

    // 如果没有关键词，返回空数组
    if (!keywords || keywords.length === 0) {
        console.warn(`[TrendService] No keywords defined for track ${activeTrackId}, returning empty array`);
        return [];
    }

    const processedTrends = trends.map(trend => {
        const textToScan = `${trend.topic} ${trend.summary}`.toLowerCase();

        const matchedKeywords = keywords.filter(k => {
            if (!k) return false;
            try {
                return textToScan.includes(k.toLowerCase().trim());
            } catch { return false; }
        });

        const isRelevant = matchedKeywords.length > 0;
        const relevancyBonus = isRelevant ? 100 : 0;
        const baseScore = calculateHeatScoreSimple(trend);

        return {
            ...trend,
            matchedKeywords: matchedKeywords.slice(0, 3),
            isRelevant,
            heatScore: Math.min(99, baseScore + relevancyBonus),
            calculatedScore: Math.min(99, baseScore + relevancyBonus)
        };
    });

    // 只返回击中关键词的热点
    const relevantTrends = processedTrends.filter(t => t.isRelevant);

    console.log(`[TrendService] 🎯 Filtered ${relevantTrends.length}/${trends.length} trends matching keywords: ${keywords.slice(0, 5).join(', ')}...`);

    return relevantTrends.sort((a, b) => {
        return b.heatScore - a.heatScore;
    });
  },

  mapRSSToTrend(item: RSSItem, sourceName: string): Trend {
    const pubDate = new Date(item.pubDate.replace(/-/g, '/')); 
    const hoursAgo = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60);
    
    // Clean up description
    let cleanDesc = (item.description || item.content || '')
        .replace(/<img[^>]*>/g, "")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, ' ')
        .trim();

    let topic = item.title;
    
    if (sourceName.includes('Twitter') || sourceName.includes('X')) {
        if (topic.length > 50) {
            cleanDesc = topic; 
            topic = topic.substring(0, 50) + '...';
        }
    }

    if (sourceName.includes('Instagram')) {
        if (topic.length > 40) {
             cleanDesc = topic;
             topic = 'IG: ' + topic.substring(0, 40) + '...';
        }
    }

    if (!cleanDesc) cleanDesc = "点击查看详情...";
    if (cleanDesc.length > 140) cleanDesc = cleanDesc.substring(0, 140) + "...";

    const baseView = 5000 + Math.floor(Math.random() * 20000);

    return {
      id: `tr_${Math.abs(this.hashCode(item.guid || item.link))}`,
      topic: topic,
      source: sourceName,
      heatScore: Math.max(20, Math.round(90 - (hoursAgo * 1.5))),
      summary: cleanDesc,
      timestamp: hoursAgo < 1 ? "刚刚" : `${Math.floor(hoursAgo)} 小时前`,
      createdAt: isNaN(pubDate.getTime()) ? new Date().toISOString() : pubDate.toISOString(),
      viewCount: Math.round(baseView),
      likeCount: Math.round(baseView * (0.01 + Math.random() * 0.05)),
      commentCount: Math.round(baseView * (0.001 + Math.random() * 0.01)),
      isCommercial: /promotion|ads|sponsor|shop/i.test(item.link + item.title),
      forecast: hoursAgo < 4 ? 'rising' : 'fading',
      matchedKeywords: [],
      isRelevant: false,
      link: item.link // 添加 RSS 文章链接
    };
  },

  getMockTrends(sourceName: string, activeTrackId?: string): Trend[] {
    // 使用增强的本地数据生成器
    console.log(`[TrendService] 🏠 Using enhanced local data generator for ${sourceName}`);
    return LocalTrendGenerator.generateSmartTrends(sourceName, 30);
  },

  hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; 
    }
    return hash;
  }
};

function calculateHeatScoreSimple(trend: Trend): number {
  const views = trend.viewCount || 0;
  const likes = trend.likeCount || 0;
  const comments = trend.commentCount || 0;
  let score = (views * 1) + (likes * 5) + (comments * 10);
  if (trend.isCommercial) score *= 0.5;
  return Math.round(score);
}