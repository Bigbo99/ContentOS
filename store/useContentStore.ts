
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Trend, Article, PipelineStatus } from '../types';
import { AIService } from '../services/ai-service';
import { useSettingsStore } from './useSettingsStore'; 
import { WordPressService } from '../services/wordpress-service';

interface ContentState {
  trends: Trend[];
  articles: Article[];
  isProcessing: boolean;
  isBatchProcessing: boolean;
  activeArticleId: string | null;
  
  setTrends: (trends: Trend[]) => void;
  setActiveArticleId: (id: string | null) => void;
  startGeneration: (trend: Trend, options?: { isBatchMode?: boolean; lang?: 'zh' | 'en' }) => Promise<void>;
  startBatchGeneration: (trends: Trend[], lang?: 'zh' | 'en') => Promise<void>;
  updateArticleStatus: (id: string, status: PipelineStatus, updates?: Partial<Article>) => void;
  approvePublish: (id: string) => void;
  softDeleteArticle: (id: string) => Promise<void>;
  restoreArticle: (id: string) => void;
  hardDeleteArticle: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
}

export const useContentStore = create<ContentState>()(
  persist(
    (set, get) => ({
      trends: [],
      articles: [],
      isProcessing: false,
      isBatchProcessing: false,
      activeArticleId: null,

      setTrends: (trends) => set({ trends }),
      setActiveArticleId: (id) => set({ activeArticleId: id }),

      startGeneration: async (trend, options = { isBatchMode: false, lang: 'zh' }) => {
        const { isBatchMode = false, lang = 'zh' } = options;
        const artId = crypto.randomUUID();

        const newArticle: Article = {
          id: artId,
          trendId: trend.id,
          title: '正在初始化...',
          content: '',
          status: 'reasoning',
          reasoningLog: '> 正在建立 AI 连接 (Growth Hack Mode)...',
          category: 'Technology',
          channels: { wordpress: true, wechat: false, xiaohongshu: false },
          publishMode: 'instant',
          progress: 5,
          createdAt: new Date().toISOString(),
          lang: lang as 'zh' | 'en'
        };

        set((state) => {
          // 内存中也保持精简，防止性能抖动
          const updatedArticles = [newArticle, ...state.articles].slice(0, 50);
          return {
            articles: updatedArticles,
            isProcessing: isBatchMode ? state.isProcessing : true,
            activeArticleId: artId
          };
        });

        try {
          // Step 1: Text Generation (JSON Pipeline)
          const articleData = await AIService.generateArticle(trend.topic, trend.summary, lang as 'zh' | 'en');

          get().updateArticleStatus(artId, 'drafting', {
            reasoningLog: articleData.reasoningLog,
            title: articleData.title, // 使用 Curiosity Title
            content: articleData.content, // 使用 WeChat HTML
            aiResponse: articleData.aiResponse, // 保存完整结构化数据
            tags: articleData.aiResponse?.xhs_content?.tags || [], // ✅ 修复：保存 AI 生成的赛道标签
            progress: 60
          });

          // Step 2: Image Generation
          get().updateArticleStatus(artId, 'visualizing', { progress: 80 });
          const imageUrl = await AIService.generateImage(trend.topic);

          // Step 3: Complete
          get().updateArticleStatus(artId, 'review', {
            coverImage: imageUrl,
            progress: 100
          });
        } catch (error: any) {
          get().updateArticleStatus(artId, 'idle', {
            reasoningLog: `[Error] ${error.message}`,
            content: `生成失败: ${error.message}`,
            progress: 0
          });
        } finally {
          // 只在非批量模式下设置 isProcessing 为 false
          if (!isBatchMode) {
            set({ isProcessing: false });
          }
        }
      },

      startBatchGeneration: async (trends, lang = 'zh') => {
        set({ isBatchProcessing: true });
        for (const trend of trends) {
          await get().startGeneration(trend, { isBatchMode: true, lang });
          await new Promise(r => setTimeout(r, 600));
        }
        set({ isBatchProcessing: false });
      },

      updateArticleStatus: (id, status, updates = {}) => {
        set((state) => ({
          articles: state.articles.map((art) =>
            art.id === id ? { ...art, status, ...updates } : art
          ),
        }));
      },

      approvePublish: (id) => {
        set((state) => ({
          articles: state.articles.map((art) =>
            art.id === id ? { ...art, status: 'published' as PipelineStatus } : art
          ),
        }));
      },

      softDeleteArticle: async (id) => {
        const article = get().articles.find(a => a.id === id);
        if (article?.wpPostId) {
          try {
            const { wordpressConfig } = useSettingsStore.getState();
            await WordPressService.deletePost(article.wpPostId, wordpressConfig);
          } catch (error) {
            console.error(`[WordPress Sync] Failed to delete remote post:`, error);
          }
        }

        set((state) => ({
          articles: state.articles.map((art) => 
            art.id === id ? { ...art, status: 'trash' as PipelineStatus } : art
          )
        }));
      },

      restoreArticle: (id) => {
        set((state) => ({
          articles: state.articles.map((art) => 
            art.id === id ? { ...art, status: 'review' as PipelineStatus } : art
          )
        }));
      },

      hardDeleteArticle: async (id) => {
        set((state) => ({ articles: state.articles.filter(a => a.id !== id) }));
      },

      emptyTrash: async () => {
        set((state) => ({ articles: state.articles.filter(a => a.status !== 'trash') }));
      }
    }),
    { 
      name: 'contentos-v1-production',
      storage: createJSONStorage(() => ({
        getItem: (name) => localStorage.getItem(name),
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, value);
          } catch (e) {
            console.error('LocalStorage quota exceeded. Failed to save content state.', e);
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      })),
      partialize: (state) => ({
        // Keep a small number of trends
        trends: state.trends.slice(0, 10),
        // Limit to 6 recent articles and strip heavy base64 images to prevent QuotaExceededError
        articles: state.articles.slice(0, 6).map(art => ({
          ...art,
          coverImage: art.coverImage?.startsWith('data:') ? undefined : art.coverImage,
          // Optional: truncate reasoning log if needed, but text is usually fine
        }))
      })
    }
  )
);
