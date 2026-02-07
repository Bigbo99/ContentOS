/**
 * 真实热点数据抓取服务
 * 使用稳定的 API 服务，无需 CORS 代理
 */

import { Trend } from '../types';
import { TophubFetcher } from './tophub-fetcher';

export const RealTrendFetcher = {
  /**
   * 方案1: 使用今日热榜 API（多个备用源）+ Tophub 爬虫
   * 尝试多个不同的 API 服务以提高成功率
   */
  async fetchFromDailyHotAPI(type: string): Promise<Trend[]> {
    // 多个备用 API 源
    const apiSources = [
      `https://api.vvhan.com/api/hotlist/${type}`,
      `https://api.iyk0.com/hotlist/?type=${type}`,
      `https://api.pearktrue.cn/api/hotlist/${type}`,
      `https://tenapi.cn/v2/hotlist/${type}`
    ];

    for (const apiUrl of apiSources) {
      try {
        console.log(`[RealTrendFetcher] Trying API: ${apiUrl}`);

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          signal: AbortSignal.timeout(8000)
        });

        if (!response.ok) {
          console.warn(`[RealTrendFetcher] API returned ${response.status}, trying next...`);
          continue;
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
          console.warn(`[RealTrendFetcher] API returned no data, trying next...`);
          continue;
        }

        console.log(`[RealTrendFetcher] ✅ Got ${items.length} real trends from ${type}`);

        // 转换为 Trend 格式
        return items.slice(0, 50).map((item: any, index: number) => ({
          id: `daily_${type}_${index}_${Date.now()}`,
          topic: item.title || item.name || item.word || '未知标题',
          source: this.getSourceName(type),
          heatScore: this.calculateHeatScore(item, index),
          summary: item.desc || item.excerpt || item.hot_value || '点击查看详情',
          timestamp: this.formatTimestamp(item.time || item.updateTime),
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

      } catch (e: any) {
        console.warn(`[RealTrendFetcher] API ${apiUrl} failed: ${e.message}, trying next...`);
        continue;
      }
    }

    // 如果所有 API 都失败，尝试使用 Tophub 爬虫作为最后手段
    console.log(`[RealTrendFetcher] All APIs failed, trying Tophub scraper for ${type}...`);
    try {
      const tophubData = await TophubFetcher.fetchTophubData(type);
      if (tophubData.length > 0) {
        console.log(`[RealTrendFetcher] ✅ Tophub scraper got ${tophubData.length} trends`);
        return tophubData;
      }
    } catch (e: any) {
      console.warn(`[RealTrendFetcher] Tophub scraper also failed: ${e.message}`);
    }

    throw new Error(`All ${apiSources.length} API sources and Tophub scraper failed for ${type}`);
  },

  /**
   * 方案2: 使用 NewsAPI（国际科技新闻，免费额度）
   */
  async fetchFromNewsAPI(query: string, apiKey?: string): Promise<Trend[]> {
    try {
      // 使用免费的 NewsAPI（需要 API key，但有免费额度）
      const key = apiKey || 'demo'; // demo key 有限制，建议用户自己申请
      const apiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=popularity&pageSize=30&language=en&apiKey=${key}`;

      console.log(`[RealTrendFetcher] Fetching from NewsAPI: ${query}`);

      const response = await fetch(apiUrl, {
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'ok' || !Array.isArray(data.articles)) {
        throw new Error('Invalid NewsAPI response');
      }

      console.log(`[RealTrendFetcher] ✅ Got ${data.articles.length} articles from NewsAPI`);

      return data.articles.map((article: any, index: number) => ({
        id: `news_${this.hashCode(article.url)}_${Date.now()}`,
        topic: article.title,
        source: article.source.name || 'NewsAPI',
        heatScore: Math.max(20, 90 - index * 2),
        summary: article.description || '点击查看详情',
        timestamp: this.formatTimestamp(article.publishedAt),
        createdAt: article.publishedAt,
        viewCount: Math.floor(Math.random() * 50000) + 10000,
        likeCount: 0,
        commentCount: 0,
        isCommercial: false,
        forecast: index < 10 ? 'rising' : 'fading',
        matchedKeywords: [],
        isRelevant: false,
        link: article.url
      }));
    } catch (e: any) {
      console.error(`[RealTrendFetcher] ❌ NewsAPI failed:`, e.message);
      throw e;
    }
  },

  /**
   * 方案3: 直接使用 Reddit JSON API（无需认证）
   */
  async fetchFromReddit(subreddit: string = 'technology'): Promise<Trend[]> {
    try {
      const apiUrl = `https://www.reddit.com/r/${subreddit}/hot.json?limit=50`;

      console.log(`[RealTrendFetcher] Fetching from Reddit: r/${subreddit}`);

      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'ContentOS/1.0'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.data || !Array.isArray(data.data.children)) {
        throw new Error('Invalid Reddit response');
      }

      const posts = data.data.children;
      console.log(`[RealTrendFetcher] ✅ Got ${posts.length} posts from r/${subreddit}`);

      return posts.map((child: any, index: number) => {
        const post = child.data;
        return {
          id: `reddit_${post.id}_${Date.now()}`,
          topic: post.title,
          source: `Reddit r/${subreddit}`,
          heatScore: Math.min(99, Math.max(20, Math.round((post.score / 100)))),
          summary: post.selftext ? post.selftext.substring(0, 150) : '点击查看讨论',
          timestamp: this.formatRedditTime(post.created_utc),
          createdAt: new Date(post.created_utc * 1000).toISOString(),
          viewCount: post.score || 0,
          likeCount: Math.round(post.upvote_ratio * post.score),
          commentCount: post.num_comments || 0,
          isCommercial: post.over_18 || false,
          forecast: index < 10 ? 'rising' : index < 30 ? 'peak' : 'fading',
          matchedKeywords: [],
          isRelevant: false,
          link: `https://reddit.com${post.permalink}`
        };
      });
    } catch (e: any) {
      console.error(`[RealTrendFetcher] ❌ Reddit API failed:`, e.message);
      throw e;
    }
  },

  /**
   * 方案4: GitHub Trending（直接 API，无需代理）
   */
  async fetchFromGitHubTrending(language: string = ''): Promise<Trend[]> {
    try {
      // 使用第三方 GitHub Trending API
      const apiUrl = language
        ? `https://api.gitterapp.com/repositories?language=${language}&since=daily`
        : `https://api.gitterapp.com/repositories?since=daily`;

      console.log(`[RealTrendFetcher] Fetching from GitHub Trending`);

      const response = await fetch(apiUrl, {
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const repos = await response.json();

      if (!Array.isArray(repos)) {
        throw new Error('Invalid GitHub Trending response');
      }

      console.log(`[RealTrendFetcher] ✅ Got ${repos.length} trending repos`);

      return repos.slice(0, 30).map((repo: any, index: number) => ({
        id: `github_${repo.name}_${Date.now()}`,
        topic: `${repo.author}/${repo.name}`,
        source: 'GitHub Trending',
        heatScore: Math.max(30, 99 - index * 2),
        summary: repo.description || 'No description',
        timestamp: '今日',
        createdAt: new Date().toISOString(),
        viewCount: repo.stars || 0,
        likeCount: repo.forks || 0,
        commentCount: 0,
        isCommercial: false,
        forecast: index < 10 ? 'rising' : 'peak',
        matchedKeywords: [],
        isRelevant: false,
        link: repo.url || `https://github.com/${repo.author}/${repo.name}`
      }));
    } catch (e: any) {
      console.error(`[RealTrendFetcher] ❌ GitHub Trending failed:`, e.message);
      throw e;
    }
  },

  /**
   * 方案5: 使用稳定的 RSS 聚合服务
   */
  async fetchFromFeedly(query: string): Promise<Trend[]> {
    try {
      // Feedly Cloud API (公开接口，无需认证)
      const apiUrl = `https://cloud.feedly.com/v3/search/feeds?query=${encodeURIComponent(query)}&count=20`;

      console.log(`[RealTrendFetcher] Fetching from Feedly: ${query}`);

      const response = await fetch(apiUrl, {
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data.results)) {
        throw new Error('Invalid Feedly response');
      }

      console.log(`[RealTrendFetcher] ✅ Got ${data.results.length} feeds from Feedly`);

      return data.results.map((feed: any, index: number) => ({
        id: `feedly_${this.hashCode(feed.feedId)}_${Date.now()}`,
        topic: feed.title || feed.description,
        source: 'Feedly',
        heatScore: Math.max(30, Math.round((feed.subscribers || 100) / 100)),
        summary: feed.description || '点击查看详情',
        timestamp: '最新',
        createdAt: new Date().toISOString(),
        viewCount: feed.subscribers || 0,
        likeCount: 0,
        commentCount: 0,
        isCommercial: false,
        forecast: index < 10 ? 'rising' : 'peak',
        matchedKeywords: [],
        isRelevant: false,
        link: feed.website || ''
      }));
    } catch (e: any) {
      console.error(`[RealTrendFetcher] ❌ Feedly API failed:`, e.message);
      throw e;
    }
  },

  // ===== 工具方法 =====

  getSourceName(type: string): string {
    const nameMap: Record<string, string> = {
      'weibo': '微博热搜',
      'zhihu': '知乎热榜',
      'douyin': '抖音热榜',
      'bilibili': '哔哩哔哩',
      'baidu': '百度热搜',
      'toutiao': '今日头条',
      'weread': '微信读书',
      '36kr': '36氪',
      'sspai': '少数派',
      'juejin': '稀土掘金'
    };
    return nameMap[type] || type;
  },

  calculateHeatScore(item: any, index: number): number {
    // 根据热度值或排名计算分数
    if (item.hot) {
      const hotValue = parseInt(item.hot) || 0;
      return Math.min(99, Math.max(10, Math.round(hotValue / 10000)));
    }
    // 基于排名的分数
    return Math.max(10, 99 - index * 2);
  },

  formatTimestamp(time: string | number | undefined): string {
    if (!time) return '刚刚';

    const date = typeof time === 'number' ? new Date(time * 1000) : new Date(time);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return '刚刚';
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  },

  formatRedditTime(timestamp: number): string {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    const hours = Math.floor(diff / 3600);

    if (hours < 1) return '刚刚';
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    return `${days}天前`;
  },

  hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
};
