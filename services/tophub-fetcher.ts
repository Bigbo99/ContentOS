/**
 * Tophub 热榜数据抓取器
 * 使用多种方式获取今日热榜数据
 */

import { Trend } from '../types';

export const TophubFetcher = {
  /**
   * 抓取 Tophub 热榜数据
   * 支持多个平台：微博、知乎、抖音、百度、B站等
   */
  async fetchTophubData(platformId?: string): Promise<Trend[]> {
    const platforms = [
      { id: 'weibo', name: '微博热搜', url: 'https://tophub.today/n/KqndgxeLl9' },
      { id: 'zhihu', name: '知乎热榜', url: 'https://tophub.today/n/mproPpoq6O' },
      { id: 'douyin', name: '抖音热榜', url: 'https://tophub.today/n/DpQvNABoNE' },
      { id: 'baidu', name: '百度热搜', url: 'https://tophub.today/n/Jb0vmloB1G' },
      { id: 'bilibili', name: 'B站热门', url: 'https://tophub.today/n/74KvxwokxM' },
      { id: 'xiaohongshu', name: '小红书热搜', url: 'https://tophub.today/n/Q0vDOvY21O' },
      { id: 'toutiao', name: '今日头条', url: 'https://tophub.today/n/x9ozB4KoXb' },
      { id: '36kr', name: '36氪', url: 'https://tophub.today/n/Q1Vd5Ko85R' }
    ];

    const allTrends: Trend[] = [];

    for (const platform of platforms) {
      // 如果指定了平台ID，只抓取该平台
      if (platformId && platform.id !== platformId) continue;

      try {
        console.log(`[TophubFetcher] Fetching ${platform.name} from ${platform.url}`);

        // 尝试多种抓取方式
        const trends = await this.fetchPlatformData(platform);

        if (trends.length > 0) {
          console.log(`[TophubFetcher] ✅ Got ${trends.length} trends from ${platform.name}`);
          allTrends.push(...trends);
        }
      } catch (e: any) {
        console.warn(`[TophubFetcher] Failed to fetch ${platform.name}: ${e.message}`);
      }
    }

    return allTrends;
  },

  /**
   * 抓取单个平台数据
   */
  async fetchPlatformData(platform: { id: string; name: string; url: string }): Promise<Trend[]> {
    // 方法1: 尝试使用 Tophub 的 JSON API（如果有）
    try {
      const jsonUrl = `${platform.url.replace('/n/', '/api/node/')}.json`;
      const response = await fetch(jsonUrl, {
        signal: AbortSignal.timeout(8000),
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.data)) {
          return this.parseJSONData(data.data, platform.name);
        }
      }
    } catch (e) {
      console.log(`[TophubFetcher] JSON API failed, trying HTML...`);
    }

    // 方法2: 使用代理抓取 HTML
    try {
      const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(platform.url)}`,
        `https://corsproxy.io/?${encodeURIComponent(platform.url)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(platform.url)}`
      ];

      for (const proxyUrl of proxies) {
        try {
          const response = await fetch(proxyUrl, {
            signal: AbortSignal.timeout(10000),
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          if (response.ok) {
            const html = await response.text();
            if (html.length > 1000) {
              const trends = this.parseHTML(html, platform.name);
              if (trends.length > 0) {
                return trends;
              }
            }
          }
        } catch (e) {
          continue;
        }
      }
    } catch (e) {
      console.warn(`[TophubFetcher] All proxies failed for ${platform.name}`);
    }

    throw new Error(`Failed to fetch data for ${platform.name}`);
  },

  /**
   * 解析 JSON 数据
   */
  parseJSONData(items: any[], sourceName: string): Trend[] {
    return items.slice(0, 30).map((item: any, index: number) => ({
      id: `tophub_${sourceName}_${index}_${Date.now()}`,
      topic: item.title || item.name || '未知标题',
      source: sourceName,
      heatScore: Math.max(20, 99 - index * 2),
      summary: item.desc || item.extra || '点击查看详情',
      timestamp: this.formatTime(item.time),
      createdAt: new Date().toISOString(),
      viewCount: parseInt(item.hot || item.metric || '0') || (100000 - index * 1000),
      likeCount: 0,
      commentCount: 0,
      isCommercial: false,
      forecast: index < 10 ? 'rising' : index < 20 ? 'peak' : 'fading',
      matchedKeywords: [],
      isRelevant: false,
      link: item.url || item.link || ''
    }));
  },

  /**
   * 解析 HTML 数据
   */
  parseHTML(html: string, sourceName: string): Trend[] {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // 尝试多种选择器
      let rows: Element[] = [];

      // 策略1: 标准表格行
      rows = Array.from(doc.querySelectorAll('table.table tbody tr'));

      // 策略2: 带类名的列表
      if (rows.length === 0) {
        rows = Array.from(doc.querySelectorAll('.item, .list-item, .tr-line'));
      }

      // 策略3: 包含链接的任何元素
      if (rows.length === 0) {
        rows = Array.from(doc.querySelectorAll('a[href*="weibo.com"], a[href*="zhihu.com"], a[href*="douyin.com"]'))
          .map(a => a.closest('tr') || a.parentElement)
          .filter(Boolean) as Element[];
      }

      console.log(`[TophubFetcher] Found ${rows.length} rows in HTML`);

      const trends = rows.map((row, index) => {
        // 提取标题
        const titleEl = row.querySelector('td.al a, a.title, a.t, a') as HTMLElement;
        if (!titleEl) return null;

        const title = titleEl.textContent?.trim() || '';
        if (title.length < 3) return null;

        // 提取链接
        const href = titleEl.getAttribute('href') || '';
        const link = href.startsWith('http') ? href : (href ? `https://tophub.today${href}` : '');

        // 提取热度
        const heatEl = row.querySelector('td:nth-child(3), .hot, .metric, .count');
        const heatText = heatEl?.textContent?.trim() || '0';

        let heatValue = 0;
        const match = heatText.match(/[\d.]+/);
        if (match) {
          heatValue = parseFloat(match[0]);
          if (heatText.includes('万')) heatValue *= 10000;
          if (heatText.includes('w') || heatText.includes('W')) heatValue *= 10000;
        }

        if (heatValue === 0) {
          heatValue = (50 - index) * 10000;
        }

        return {
          id: `tophub_${sourceName}_${index}_${Date.now()}`,
          topic: title,
          source: sourceName,
          heatScore: Math.min(99, Math.max(10, Math.round(heatValue / 10000))),
          summary: `${sourceName} 热门话题 #${index + 1}`,
          timestamp: '实时',
          createdAt: new Date().toISOString(),
          viewCount: Math.round(heatValue),
          likeCount: Math.round(heatValue * 0.05),
          commentCount: Math.round(heatValue * 0.01),
          isCommercial: false,
          forecast: index < 10 ? 'rising' : index < 20 ? 'peak' : 'fading',
          matchedKeywords: [],
          isRelevant: false,
          link: link
        };
      }).filter(Boolean) as Trend[];

      return trends;
    } catch (e: any) {
      console.error(`[TophubFetcher] HTML parse error: ${e.message}`);
      return [];
    }
  },

  /**
   * 格式化时间
   */
  formatTime(timestamp?: string | number): string {
    if (!timestamp) return '实时';

    try {
      const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));

      if (hours < 1) return '刚刚';
      if (hours < 24) return `${hours}小时前`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}天前`;
      return '一周前';
    } catch (e) {
      return '实时';
    }
  },

  /**
   * 根据平台名称获取对应的 Tophub 节点ID
   */
  getPlatformUrl(platformName: string): string {
    const mapping: Record<string, string> = {
      '微博': 'https://tophub.today/n/KqndgxeLl9',
      '知乎': 'https://tophub.today/n/mproPpoq6O',
      '抖音': 'https://tophub.today/n/DpQvNABoNE',
      '百度': 'https://tophub.today/n/Jb0vmloB1G',
      'B站': 'https://tophub.today/n/74KvxwokxM',
      '小红书': 'https://tophub.today/n/Q0vDOvY21O'
    };

    for (const [key, url] of Object.entries(mapping)) {
      if (platformName.includes(key)) return url;
    }

    return '';
  }
};
