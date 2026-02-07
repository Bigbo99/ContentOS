/**
 * 使用本地代理服务器抓取真实数据
 * 这个方案可以绕过浏览器的 CORS 限制
 */

import { Trend } from '../types';

const PROXY_URL = 'http://localhost:3002/proxy';

export const LocalProxyFetcher = {
  /**
   * 通过本地代理抓取微博热搜
   */
  async fetchWeiboHot(): Promise<Trend[]> {
    try {
      const url = 'https://s.weibo.com/top/summary?Refer=top_hot';
      const proxyUrl = `${PROXY_URL}?url=${encodeURIComponent(url)}`;

      console.log(`[LocalProxy] Fetching Weibo from local proxy...`);

      const response = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Proxy returned ${response.status}`);
      }

      const html = await response.text();
      return this.parseWeiboHTML(html);
    } catch (e: any) {
      console.error(`[LocalProxy] Weibo fetch failed: ${e.message}`);
      throw e;
    }
  },

  /**
   * 通过本地代理抓取知乎热榜
   */
  async fetchZhihuHot(): Promise<Trend[]> {
    try {
      const url = 'https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=50';
      const proxyUrl = `${PROXY_URL}?url=${encodeURIComponent(url)}`;

      console.log(`[LocalProxy] Fetching Zhihu from local proxy...`);

      const response = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Proxy returned ${response.status}`);
      }

      const data = await response.json();
      return this.parseZhihuJSON(data);
    } catch (e: any) {
      console.error(`[LocalProxy] Zhihu fetch failed: ${e.message}`);
      throw e;
    }
  },

  /**
   * 通过本地代理抓取百度热搜
   */
  async fetchBaiduHot(): Promise<Trend[]> {
    try {
      const url = 'https://top.baidu.com/board?tab=realtime';
      const proxyUrl = `${PROXY_URL}?url=${encodeURIComponent(url)}`;

      console.log(`[LocalProxy] Fetching Baidu from local proxy...`);

      const response = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Proxy returned ${response.status}`);
      }

      const html = await response.text();
      return this.parseBaiduHTML(html);
    } catch (e: any) {
      console.error(`[LocalProxy] Baidu fetch failed: ${e.message}`);
      throw e;
    }
  },

  /**
   * 解析微博 HTML
   */
  parseWeiboHTML(html: string): Trend[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = Array.from(doc.querySelectorAll('td.td-02'));

    console.log(`[LocalProxy] Found ${rows.length} Weibo trends`);

    const trends = rows.map((td, index) => {
      const linkEl = td.querySelector('a');
      const heatEl = td.querySelector('span');

      if (!linkEl) return null;

      const title = linkEl.textContent?.trim() || '';
      if (title.length < 2) return null;

      const href = linkEl.getAttribute('href') || '';
      const link = href.startsWith('http') ? href : `https://s.weibo.com${href}`;
      const heatText = heatEl?.textContent?.trim() || '0';
      const heatScore = parseInt(heatText.replace(/[^0-9]/g, '')) / 10000;

      return {
        id: `weibo_real_${index}_${Date.now()}`,
        topic: title,
        source: '微博热搜 [实时]',
        heatScore: Math.min(99, Math.round(heatScore)),
        summary: '微博实时热搜话题',
        timestamp: '实时',
        createdAt: new Date().toISOString(),
        viewCount: Math.round(heatScore * 10000),
        likeCount: 0,
        commentCount: 0,
        isCommercial: false,
        forecast: index < 10 ? 'rising' : index < 30 ? 'peak' : 'fading',
        matchedKeywords: [],
        isRelevant: false,
        link: link
      };
    }).filter(Boolean) as Trend[];

    return trends;
  },

  /**
   * 解析知乎 JSON
   */
  parseZhihuJSON(data: any): Trend[] {
    if (!data || !Array.isArray(data.data)) {
      throw new Error('Invalid Zhihu response');
    }

    console.log(`[LocalProxy] Found ${data.data.length} Zhihu trends`);

    return data.data.slice(0, 30).map((item: any, index: number) => {
      const target = item.target;
      return {
        id: `zhihu_real_${target.id}_${Date.now()}`,
        topic: target.title || target.question?.title || '未知标题',
        source: '知乎热榜 [实时]',
        heatScore: Math.max(20, 99 - index * 2),
        summary: target.excerpt || target.question?.excerpt || '点击查看详情',
        timestamp: '实时',
        createdAt: new Date().toISOString(),
        viewCount: target.metrics?.view_count || 0,
        likeCount: target.metrics?.voteup_count || 0,
        commentCount: target.metrics?.comment_count || 0,
        isCommercial: false,
        forecast: index < 10 ? 'rising' : index < 20 ? 'peak' : 'fading',
        matchedKeywords: [],
        isRelevant: false,
        link: `https://www.zhihu.com/question/${target.id}`
      };
    });
  },

  /**
   * 解析百度 HTML
   */
  parseBaiduHTML(html: string): Trend[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 百度热搜通常在 script 标签中以 JSON 形式存储
    const scripts = Array.from(doc.querySelectorAll('script'));
    let trends: Trend[] = [];

    for (const script of scripts) {
      const content = script.textContent || '';
      if (content.includes('hotList')) {
        try {
          // 提取 JSON 数据
          const match = content.match(/hotList:\s*(\[[\s\S]*?\])/);
          if (match) {
            const hotList = JSON.parse(match[1]);
            console.log(`[LocalProxy] Found ${hotList.length} Baidu trends`);

            trends = hotList.slice(0, 30).map((item: any, index: number) => ({
              id: `baidu_real_${index}_${Date.now()}`,
              topic: item.query || item.word || '未知标题',
              source: '百度热搜 [实时]',
              heatScore: Math.max(20, 99 - index * 2),
              summary: item.desc || '百度热搜话题',
              timestamp: '实时',
              createdAt: new Date().toISOString(),
              viewCount: parseInt(item.hotScore || '0') || (100000 - index * 1000),
              likeCount: 0,
              commentCount: 0,
              isCommercial: false,
              forecast: index < 10 ? 'rising' : index < 20 ? 'peak' : 'fading',
              matchedKeywords: [],
              isRelevant: false,
              link: item.url || `https://www.baidu.com/s?wd=${encodeURIComponent(item.query || '')}`
            }));
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }

    return trends;
  },

  /**
   * 检查代理服务器是否运行
   */
  async checkProxyStatus(): Promise<boolean> {
    try {
      const response = await fetch(PROXY_URL, {
        signal: AbortSignal.timeout(2000)
      });
      return response.status === 400; // 400 表示代理在运行但缺少参数
    } catch (e) {
      return false;
    }
  }
};
