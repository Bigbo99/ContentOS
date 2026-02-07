import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useContentStore } from '../store/useContentStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { TrendService } from '../services/trend-service';
import { Trend } from '../types';
import { Zap, TrendingUp, Globe, Clock, ArrowRight, CheckCircle2, Server, Wifi, DollarSign, ListFilter, CheckSquare, X, Layers, Loader2, RefreshCw, Cpu, Target, Radio, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { calculateHeatScore, formatNumber } from '../utils/trend-algo';
import { DEFAULT_TRACKS } from '../constants/tracks';

type SortOption = 'heat' | 'latest' | 'comments';

interface TrendCardProps {
  trend: Trend;
  onGenerateClick: () => void;
  calculatedScore: number;
  selected: boolean;
  onToggle: (id: string) => void;
  hasArticle: boolean;
}

const TrendCard: React.FC<TrendCardProps> = ({ trend, onGenerateClick, calculatedScore, selected, onToggle, hasArticle }) => {
  // Visual state for irrelevant items
  const isRelevant = trend.isRelevant !== false; // Default to true if undefined
  const opacityClass = isRelevant ? 'opacity-100' : 'opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0';

  return (
    <div 
      className={`group relative bg-white border rounded-xl p-6 transition-all duration-300 flex flex-col h-full ${opacityClass} ${
        selected 
          ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-md bg-indigo-50/10' 
          : 'border-gray-200 hover:shadow-lg hover:border-indigo-100'
      }`}
    >
      <div className="absolute top-6 right-6 z-10">
        <div 
          onClick={(e) => { e.stopPropagation(); onToggle(trend.id); }}
          className={`w-5 h-5 rounded border cursor-pointer flex items-center justify-center transition-colors ${
            selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white hover:border-indigo-400'
          }`}
        >
          {selected && <CheckSquare size={14} className="text-white" />}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-start mb-4 pr-8">
        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium flex items-center gap-1 max-w-[120px] truncate" title={trend.source}>
            <Globe size={12} />
            {trend.source}
        </span>
        
        {/* Matched Keywords Badge */}
        {trend.matchedKeywords && trend.matchedKeywords.length > 0 && (
            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-xs font-bold flex items-center gap-1">
                <Target size={12} />
                命中: {trend.matchedKeywords[0]}
                {trend.matchedKeywords.length > 1 && ` +${trend.matchedKeywords.length - 1}`}
            </span>
        )}

        {trend.isCommercial && (
            <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium flex items-center gap-1 border border-purple-100" title="商业内容权重已降低">
              <DollarSign size={12} />
              推广
            </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
        <Clock size={12} />
        {trend.timestamp}
        <span className="mx-1">•</span>
        <TrendingUp size={12} />
        热度 {calculatedScore}
      </div>

      {/* Title with external link */}
      <div className="flex items-start gap-2 mb-2">
        <h3
          onClick={() => onToggle(trend.id)}
          className="flex-1 text-lg font-semibold text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors cursor-pointer line-clamp-2 min-h-[3.5rem]"
          title={trend.topic}
        >
          {trend.topic}
        </h3>
        {trend.link && (
          <a
            href={trend.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            title="打开来源链接"
          >
            <ExternalLink size={16} />
          </a>
        )}
      </div>
      
      <p className="text-gray-500 text-sm mb-6 line-clamp-3 flex-grow text-justify">
        {trend.summary || '暂无摘要'}
      </p>

      {/* Engagement Metrics - 只显示真实数据 */}
      <div className="flex items-center justify-between py-3 mb-4 border-t border-b border-gray-50">
        {/* 热度值（真实） */}
        <div className="flex flex-col items-start">
            <span className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">
              <TrendingUp size={10} />
              热度
            </span>
            <span className="text-sm font-bold text-orange-600">
              {trend.viewCount > 10000
                ? `${(trend.viewCount / 10000).toFixed(1)}万`
                : formatNumber(trend.viewCount)
              }
            </span>
        </div>

        {/* 排名（真实） */}
        {trend.rank && (
          <div className="flex flex-col items-center">
              <span className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">
                <Target size={10} />
                排名
              </span>
              <span className="text-sm font-bold text-indigo-600">
                #{trend.rank}
              </span>
          </div>
        )}

        {/* 趋势预测 */}
        <div className="flex flex-col items-end">
            <span className="text-xs text-gray-400 mb-0.5">趋势</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              trend.forecast === 'rising' ? 'bg-green-50 text-green-600' :
              trend.forecast === 'peak' ? 'bg-orange-50 text-orange-600' :
              'bg-gray-50 text-gray-600'
            }`}>
              {trend.forecast === 'rising' ? '↗ 上升' :
               trend.forecast === 'peak' ? '🔥 爆热' :
               '↘ 降温'}
            </span>
        </div>
      </div>

      {hasArticle ? (
         <button 
           disabled
           className="w-full py-2.5 px-4 bg-green-50 border border-green-200 text-green-700 font-medium rounded-lg text-sm flex items-center justify-center gap-2 cursor-default mt-auto"
         >
           <CheckCircle2 size={16} />
           已生成
         </button>
      ) : (
        <button 
          onClick={onGenerateClick}
          className="w-full py-2.5 px-4 bg-white border border-gray-200 text-gray-900 font-medium rounded-lg text-sm hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 group/btn mt-auto"
        >
          <Zap size={16} className="text-amber-500" />
          立即生成
          <ArrowRight size={16} className="opacity-0 -ml-4 group-hover/btn:opacity-100 group-hover/btn:ml-0 transition-all text-indigo-600" />
        </button>
      )}
    </div>
  );
};

interface GenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (lang: 'zh' | 'en') => void;
  trendTitle: string;
}

const GenerationModal: React.FC<GenerationModalProps> = ({ isOpen, onClose, onConfirm, trendTitle }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex justify-between items-start mb-2">
             <h3 className="text-lg font-semibold text-gray-900">选择生成模式</h3>
             <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <p className="text-sm text-gray-500 truncate">{trendTitle}</p>
        </div>
        
        <div className="p-6 space-y-4">
          <button 
            onClick={() => onConfirm('zh')}
            className="w-full p-4 border rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all flex items-start gap-4 group text-left"
          >
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Cpu size={24} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">中文创作 (DeepSeek R1)</h4>
              <p className="text-xs text-gray-500 mt-1">深度思考模式已激活。适合微信公众号、国内媒体。</p>
            </div>
          </button>

          <button
            onClick={() => onConfirm('en')}
            className="w-full p-4 border rounded-xl hover:border-green-500 hover:bg-green-50 transition-all flex items-start gap-4 group text-left"
          >
            <div className="p-2.5 bg-green-100 text-green-600 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
              <Zap size={24} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">English (DeepSeek)</h4>
              <p className="text-xs text-gray-500 mt-1">Global tech blog style. Powered by DeepSeek AI.</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export const TrendDiscovery: React.FC = () => {
  const { trends, articles, setTrends, startGeneration, startBatchGeneration, isBatchProcessing } = useContentStore();
  const { sources, activeTrackId, customTrackKeywords } = useSettingsStore();
  const navigate = useNavigate();
  
  const [sortBy, setSortBy] = useState<SortOption>('heat');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isFetching, setIsFetching] = useState(false);
  
  // Auto-Refresh State
  const [autoRefresh, setAutoRefresh] = useState(true); // 默认开启自动刷新
  const [nextUpdate, setNextUpdate] = useState(10);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<Date>(new Date());
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);
  const [isBatchOperation, setIsBatchOperation] = useState(false);

  const autoRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get current active track details for display
  const activeTrack = useMemo(() => DEFAULT_TRACKS.find(t => t.id === activeTrackId), [activeTrackId]);

  useEffect(() => {
    // Initial fetch if empty
    if (trends.length <= 2 && sources.length > 0) {
      handleFetchTrends();
    }
    return () => clearTimers();
  }, []);

  // --- CRITICAL FIX: Re-apply taxonomy when track settings change ---
  // This ensures Custom Track keywords are applied immediately to existing trends
  // without needing to refresh the data source.
  useEffect(() => {
    const currentTrends = useContentStore.getState().trends;
    if (currentTrends.length > 0) {
       console.log("Track settings changed, re-applying taxonomy...", activeTrackId, customTrackKeywords);
       const updatedTrends = TrendService.applyTaxonomy(currentTrends);
       setTrends(updatedTrends);
    }
  }, [activeTrackId, JSON.stringify(customTrackKeywords)]); 

  // Auto Refresh Logic
  useEffect(() => {
    clearTimers();

    if (autoRefresh) {
        // Countdown timer (Visual)
        setNextUpdate(10);
        countdownIntervalRef.current = setInterval(() => {
            setNextUpdate(prev => {
                if (prev <= 1) return 10;
                return prev - 1;
            });
        }, 1000);

        // Fetch timer (Action)
        autoRefreshIntervalRef.current = setInterval(() => {
            handleFetchTrends();
        }, 10000); // 10 seconds - 更快的实时更新
    }
  }, [autoRefresh]);

  const clearTimers = () => {
    if (autoRefreshIntervalRef.current) clearInterval(autoRefreshIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  const handleFetchTrends = async () => {
    setIsFetching(true);
    let allNewTrends: Trend[] = [];

    // Scan ALL active sources, regardless of track
    // Track keywords will filter/match trends in TrendService.applyTaxonomy()
    const activeSources = sources.filter(s => s.active);

    console.log(`[TrendDiscovery] Fetching from ALL ${activeSources.length} active sources:`, activeSources.map(s => s.name));

    if (activeSources.length === 0) {
      console.warn('[TrendDiscovery] No active sources configured');
      setIsFetching(false);
      return;
    }

    try {
      const promises = activeSources.map(source => TrendService.fetchTrends(source));
      const results = await Promise.all(promises);

      results.forEach(sourceTrends => {
        allNewTrends = [...allNewTrends, ...sourceTrends];
      });

      // Deduplicate Logic
      const uniqueTrendsMap = new Map();
      allNewTrends.forEach(t => uniqueTrendsMap.set(t.topic, t));

      const uniqueTrends = Array.from(uniqueTrendsMap.values());

      console.log(`[TrendDiscovery] Got ${uniqueTrends.length} unique trends from ${allNewTrends.length} total`);

      if (uniqueTrends.length > 0) {
        setTrends(uniqueTrends);
      } else {
        console.warn('[TrendDiscovery] No trends were fetched - all sources may have failed');
      }
      setLastUpdatedTime(new Date());
    } catch (error) {
      console.error("[TrendDiscovery] Failed to fetch trends", error);
    } finally {
      setIsFetching(false);
    }
  };

  const existingTrendIds = useMemo(() => new Set(
    articles
      .filter(a => a.status !== 'trash') // ✅ Fixed: Allow regeneration if article is in trash
      .map(a => a.trendId)
  ), [articles]);

  const handleGenerateClick = (trend: Trend) => {
    setIsBatchOperation(false);
    setSelectedTrend(trend);
    setModalOpen(true);
  };

  const handleBatchClick = () => {
    setIsBatchOperation(true);
    setModalOpen(true);
  };

  const handleConfirmGeneration = (lang: 'zh' | 'en') => {
    if (isBatchOperation) {
        const selectedTrends = trends.filter(t => selectedIds.has(t.id));
        if (selectedTrends.length > 0) {
             startBatchGeneration(selectedTrends, lang);
             setSelectedIds(new Set());
        }
    } else if (selectedTrend) {
      startGeneration(selectedTrend, { lang });
    }
    setModalOpen(false);
    setSelectedTrend(null);
    setIsBatchOperation(false);
    navigate('/pipeline');
  };

  const handleToggle = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === trends.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(trends.map(t => t.id)));
    }
  };

  const sortedTrends = useMemo(() => {
    // Note: trends are already processed by applyTaxonomy in fetch or effect
    // We just do the final display sort here
    return [...trends].sort((a, b) => {
        // Priority 1: Relevance (Applied by taxonomy)
        if (a.isRelevant && !b.isRelevant) return -1;
        if (!a.isRelevant && b.isRelevant) return 1;

        // Priority 2: User Sort
        if (sortBy === 'heat') return b.heatScore - a.heatScore; // Use computed heatScore which includes relevance bonus
        if (sortBy === 'latest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'comments') return b.commentCount - a.commentCount;
        return 0;
    });
  }, [trends, sortBy]);

  const activeCount = trends.filter(t => t.isRelevant).length;

  return (
    <div className="max-w-7xl mx-auto pb-20 relative">
      {/* System Status Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-4 shadow-sm">
          <div className="p-2 bg-green-50 rounded-lg text-green-600">
            <Server size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">DeepSeek 思考引擎</p>
            <p className="text-sm font-bold text-gray-900 flex items-center gap-1">
              R1 模型就绪 <CheckCircle2 size={12} className="text-green-500" />
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-4 shadow-sm">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            <Target size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">当前赛道</p>
            <p className="text-sm font-bold text-gray-900 flex items-center gap-1">
              {activeTrack?.emoji} {activeTrack?.label || '自定义'}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-4 shadow-sm">
           <div className={`p-2 rounded-lg transition-colors ${autoRefresh ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
            <Radio size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                实时监听状态
                {autoRefresh && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"/>}
            </p>
            <p className="text-sm font-bold text-gray-900">
                {autoRefresh ? `更新倒计时: ${nextUpdate}s` : '监听已暂停'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
        <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">今日热点追踪</h2>
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
                  <button 
                    onClick={handleFetchTrends}
                    disabled={isFetching}
                    className={`p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-all ${isFetching ? 'animate-spin text-indigo-600' : ''}`}
                    title="手动刷新"
                  >
                    <RefreshCw size={16} />
                  </button>
                  <div className="w-px h-4 bg-gray-200 mx-1"></div>
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`text-xs font-bold px-2 py-1 rounded-md transition-colors flex items-center gap-1.5 ${autoRefresh ? 'bg-red-50 text-red-600' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                     {autoRefresh ? <Wifi size={14} className="animate-pulse" /> : <Wifi size={14} />}
                     {autoRefresh ? 'Live On' : 'Live Off'}
                  </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
                <p className="text-gray-500 text-xs">
                    上次更新: {lastUpdatedTime.toLocaleTimeString()}
                </p>
                <span className="text-gray-300">|</span>
                <p className="text-gray-500 text-xs flex items-center gap-1">
                    数据源: <span className="font-bold text-indigo-600">{sources.filter(s => s.active).length}</span>/{sources.length} 启用
                    {sources.filter(s => !s.active).length > 0 && (
                      <span className="text-amber-600" title="有数据源未启用">⚠</span>
                    )}
                </p>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
            <button 
              onClick={handleSelectAll}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {selectedIds.size > 0 && selectedIds.size === trends.length ? '取消全选' : '全选'}
            </button>

            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">排序:</span>
                <div className="relative inline-block text-left">
                    <div className="flex items-center bg-white border border-gray-300 rounded-lg px-3 py-1.5">
                        <ListFilter size={16} className="text-gray-500 mr-2" />
                        <select 
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="text-sm font-medium text-gray-700 bg-transparent focus:outline-none cursor-pointer appearance-none pr-6"
                        >
                            <option value="heat">综合热度 (Weighted)</option>
                            <option value="latest">最新发布 (Latest)</option>
                            <option value="comments">争议性/评论最多</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {isFetching && trends.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
           <Loader2 size={48} className="animate-spin text-indigo-500 mb-4" />
           <p className="font-medium text-gray-600">正在扫描全网热点并进行赛道清洗...</p>
           <p className="text-sm mt-2">Connecting to Sources...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedTrends.map((trend) => (
            <TrendCard 
              key={trend.id} 
              trend={trend} 
              onGenerateClick={() => handleGenerateClick(trend)}
              calculatedScore={trend.calculatedScore ?? trend.heatScore} // Use the one from applyTaxonomy if available, or calc on fly
              selected={selectedIds.has(trend.id)}
              onToggle={handleToggle}
              hasArticle={existingTrendIds.has(trend.id)}
            />
          ))}
          
          <div 
            onClick={() => navigate('/sources')}
            className="border border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 hover:border-gray-400 cursor-pointer transition-colors min-h-[240px]"
          >
            <Globe size={32} className="mb-2 opacity-50" />
            <span className="font-medium">配置更多数据源</span>
          </div>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
          <div className="bg-gray-900 text-white pl-6 pr-2 py-2 rounded-full shadow-xl flex items-center gap-6 border border-gray-700/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="bg-indigo-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                {selectedIds.size}
              </span>
              <span className="text-sm font-medium text-gray-200">个热点已选中</span>
            </div>
            
            <div className="h-6 w-px bg-gray-700"></div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleBatchClick}
                disabled={isBatchProcessing}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-sm font-medium transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBatchProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    处理中...
                  </>
                ) : (
                  <>
                    <Layers size={16} />
                    一键批量生成
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <GenerationModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onConfirm={handleConfirmGeneration}
        trendTitle={isBatchOperation ? `批量生成 ${selectedIds.size} 篇内容` : (selectedTrend?.topic || '')}
      />
    </div>
  );
};