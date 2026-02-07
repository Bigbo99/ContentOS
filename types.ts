export type PipelineStatus = 
  | 'idle' 
  | 'reasoning' 
  | 'drafting' 
  | 'visualizing' 
  | 'review' 
  | 'published'
  | 'trash';

export interface Trend {
  id: string;
  topic: string;
  source: string;
  heatScore: number;
  summary: string;
  timestamp: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  isCommercial: boolean;
  createdAt: string;
  link?: string; // 热点来源链接
  forecast?: 'rising' | 'peak' | 'fading';
  matchedKeywords?: string[];
  isRelevant?: boolean;
  calculatedScore?: number;
  rank?: number; // 热榜排名（如微博热搜第1名）
}

export interface SEOMetrics {
  score: number;
  titleLength: 'low' | 'good' | 'high';
  contentLength: 'low' | 'good' | 'high';
  keywordDensity: number;
  hasHeadings: boolean;
  hasImages: boolean;
}

// 🔥 核心修复：更新字段以匹配 AIService 中的 2025 Prompt
export interface GrowthHackResponse {
  persona_used: string;
  titles: {
    fear: string;      // 对应 Negative Avoidance
    greed: string;     // 对应 Efficiency Greed
    identity: string;  // ✅ 修复：新增，对应 Prompt 中的 Identity Flagging
    conflict: string;  // ✅ 修复：新增，对应 Prompt 中的 Cognitive Conflict
    abstract: string;  // 对应 Abstract/Vibe
    // 已移除旧的 curiosity, contrast, utility，因为你的 Prompt 不再生成它们
  };
  wechat_html: string; // ✅ 修复：改名为 wechat_html 以匹配 Prompt 的 JSON key
  xhs_content: {
    cover_text: string;
    body: string;
    tags: string[];
  };
}

export interface Article {
  id: string;
  trendId: string;
  title: string;
  content: string; 
  status: PipelineStatus;
  reasoningLog: string; 
  coverImage?: string; 
  category: string;
  tags?: string[];
  wpCategoryId?: string;
  wpPostId?: number; 
  channels: {
    wordpress: boolean;
    wechat: boolean;
    xiaohongshu: boolean;
  };
  publishMode: 'instant' | 'scheduled';
  scheduledAt?: string;
  progress: number; 
  createdAt: string;
  seo?: SEOMetrics;
  lang: 'zh' | 'en';
  aiResponse?: GrowthHackResponse;
}

export interface Source {
  id: string;
  name: string;
  url: string;
  type: 'rss' | 'api' | 'scraper' | 'weibo' | 'tophub';
  active: boolean;
  lastSync?: string;
}

export interface WPMediaItem {
  id: string;
  url: string;
  title: string;
  mimeType: string;
  date: string;
  dimensions?: string;
}

export interface WPCategory {
  id: string;
  name: string;
  count: number;
  parent: number; 
}

export type Platform = 'wordpress' | 'wechat_official' | 'xiaohongshu';