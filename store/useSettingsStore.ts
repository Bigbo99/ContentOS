
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Source, WPMediaItem, WPCategory } from '../types';

interface WordPressConfig {
  url: string;
  username: string;
  appPassword: string;
  authorId: string;
}

interface SettingsState {
  deepseekKey: string;
  wordpressConfig: WordPressConfig;
  wechatAppId: string;
  wechatAppSecret: string;
  sources: Source[];
  mediaLibrary: WPMediaItem[];
  isDeepSeekVerified: boolean;
  isWordPressConnected: boolean;
  wordpressCategories: WPCategory[];

  // 新增：赛道配置
  activeTrackId: string;
  customTrackKeywords: string[];

  // 新增：AI Prompt 配置
  customPrompt: string | null;  // null表示使用默认prompt

  setDeepSeekKey: (key: string) => void;
  setWordPressConfig: (key: keyof WordPressConfig, value: string) => void;
  setWeChatConfig: (appId: string, appSecret: string) => void;
  addSource: (source: Source) => void;
  updateSource: (id: string, updates: Partial<Source>) => void;
  deleteSource: (id: string) => void;
  addMediaItem: (item: WPMediaItem) => void;
  verifyDeepSeek: () => Promise<boolean>;
  fetchWordPressCategories: () => Promise<boolean>;

  // 新增：赛道设置方法
  setActiveTrackId: (id: string) => void;
  setCustomTrackKeywords: (keywords: string[]) => void;

  // 新增：Prompt设置方法
  setCustomPrompt: (prompt: string | null) => void;
  resetPromptToDefault: () => void;
}

const DEFAULT_SOURCES: Source[] = [
  // 今日热榜 API - 真实热榜数据
  { id: 's1', name: '微博热搜', url: 'https://api.tophubdata.com/nodes/KqndgxeLl9', type: 'tophub', active: true, lastSync: '实时' },
  { id: 's2', name: '知乎热榜', url: 'https://api.tophubdata.com/nodes/mproPpoq6O', type: 'tophub', active: true, lastSync: '实时' },
  { id: 's3', name: '抖音热点', url: 'https://api.tophubdata.com/nodes/DpQvNABoNE', type: 'tophub', active: true, lastSync: '实时' },
  { id: 's4', name: '百度热搜', url: 'https://api.tophubdata.com/nodes/Jb0vmloB1G', type: 'tophub', active: true, lastSync: '实时' },
  { id: 's5', name: 'B站热搜', url: 'https://api.tophubdata.com/nodes/74KvxwokxM', type: 'tophub', active: true, lastSync: '实时' },
  { id: 's6', name: '小红书热搜', url: 'https://api.tophubdata.com/nodes/Q1Vd5Ko85R', type: 'tophub', active: true, lastSync: '实时' },

  // 中文科技媒体 - 使用原生 RSS（已验证可用）
  { id: 's7', name: '36氪', url: 'https://36kr.com/feed', type: 'rss', active: true, lastSync: '实时' },
  { id: 's8', name: '少数派', url: 'https://sspai.com/feed', type: 'rss', active: true, lastSync: '实时' },
  { id: 's9', name: '虎嗅网', url: 'https://www.huxiu.com/rss/0.xml', type: 'rss', active: true, lastSync: '实时' },

  // 国际科技媒体 - 原生 RSS（已验证可用）
  { id: 's10', name: 'Hacker News', url: 'https://hnrss.org/frontpage', type: 'rss', active: true, lastSync: '实时' },
  { id: 's11', name: 'TechCrunch', url: 'https://techcrunch.com/feed/', type: 'rss', active: true, lastSync: '实时' },
  { id: 's12', name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', type: 'rss', active: true, lastSync: '实时' },
  { id: 's13', name: 'Reddit r/technology', url: 'https://www.reddit.com/r/technology/.rss', type: 'rss', active: true, lastSync: '实时' },
  { id: 's14', name: 'Wired', url: 'https://www.wired.com/feed/rss', type: 'rss', active: true, lastSync: '实时' }
];

const MOCK_MEDIA: WPMediaItem[] = [
  { id: 'm1', url: 'https://picsum.photos/id/1/800/600', title: 'Tech Workspace', mimeType: 'image/jpeg', date: '2023-10-01' },
  { id: 'm2', url: 'https://picsum.photos/id/2/800/600', title: 'Laptop Coffee', mimeType: 'image/jpeg', date: '2023-10-02' },
];


export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      deepseekKey: '',
      wordpressConfig: { url: '', username: '', appPassword: '', authorId: '' },
      wechatAppId: '',
      wechatAppSecret: '',
      sources: DEFAULT_SOURCES,
      mediaLibrary: MOCK_MEDIA,
      isDeepSeekVerified: false,
      isWordPressConnected: false,
      wordpressCategories: [],
      
      // 默认选中科技赛道
      activeTrackId: 'tech',
      customTrackKeywords: ['效率', '工具', '自动化'],

      // 默认使用内置Prompt
      customPrompt: null,

      setDeepSeekKey: (key) => set({ deepseekKey: key, isDeepSeekVerified: false }),
      setWordPressConfig: (key, value) => set((state) => ({
        wordpressConfig: { ...state.wordpressConfig, [key]: value },
        isWordPressConnected: false 
      })),
      setWeChatConfig: (appId, appSecret) => set({ wechatAppId: appId, wechatAppSecret: appSecret }),

      addSource: (source) => set((state) => ({ sources: [...state.sources, source] })),
      updateSource: (id, updates) => set((state) => ({
        sources: state.sources.map(s => s.id === id ? { ...s, ...updates } : s)
      })),
      deleteSource: (id) => set((state) => ({
        sources: state.sources.filter(s => s.id !== id)
      })),

      addMediaItem: (item) => set((state) => ({ mediaLibrary: [item, ...state.mediaLibrary] })),

      verifyDeepSeek: async () => {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const isValid = get().deepseekKey.length > 5;
        set({ isDeepSeekVerified: isValid });
        return isValid;
      },

      fetchWordPressCategories: async () => {
        const { url, username, appPassword } = get().wordpressConfig;
        let cleanUrl = url.trim().replace(/[\s\r\n]/g, '').replace(/\/+$/, '');
        const cleanUsername = username.trim().replace(/[\r\n]/g, '');
        const cleanPassword = appPassword.trim().replace(/[\s\r\n]/g, '');
        
        if (!cleanUrl || !cleanUsername || !cleanPassword) {
            set({ isWordPressConnected: false });
            return false;
        }

        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
            cleanUrl = `https://${cleanUrl}`;
        }

        const safeBtoa = (str: string) => {
          try {
             return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
                (match, p1) => String.fromCharCode(parseInt(p1, 16))
             ));
          } catch (e) {
             return btoa(str);
          }
        };

        try {
            const endpoint = '/wp-json/wp/v2/categories?per_page=50';
            const apiUrl = `${cleanUrl}${endpoint}`;
            const auth = safeBtoa(`${cleanUsername}:${cleanPassword}`);
            const headers = { 'Authorization': `Basic ${auth}`, 'ngrok-skip-browser-warning': 'true' };

            const response = await fetch(apiUrl, { method: 'GET', headers });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const categories = Array.isArray(data) ? data.map((cat: any) => ({
                id: String(cat.id),
                name: cat.name,
                count: cat.count || 0,
                parent: cat.parent || 0
            })) : [];

            set({ isWordPressConnected: true, wordpressCategories: categories });
            return true;
        } catch (error: any) {
            console.error('WordPress Fetch Error:', error);
            set({ isWordPressConnected: false });
            return false;
        }
      },

      setActiveTrackId: (id) => set({ activeTrackId: id }),
      setCustomTrackKeywords: (keywords) => set({ customTrackKeywords: keywords }),

      setCustomPrompt: (prompt) => set({ customPrompt: prompt }),
      resetPromptToDefault: () => set({ customPrompt: null }),
    }),
    {
      name: 'contentos-settings-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        deepseekKey: state.deepseekKey,
        wordpressConfig: state.wordpressConfig,
        wechatAppId: state.wechatAppId,
        wechatAppSecret: state.wechatAppSecret,
        sources: state.sources,
        activeTrackId: state.activeTrackId,
        customTrackKeywords: state.customTrackKeywords,
        customPrompt: state.customPrompt
      })
    }
  )
);
