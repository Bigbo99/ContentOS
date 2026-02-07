
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useContentStore } from '../store/useContentStore';
import { useSettingsStore } from '../store/useSettingsStore';
import {
  Save, Send, Globe, Clock, Trash2, ChevronLeft, CheckCircle2,
  Bold, Italic, Heading2, Heading3, Quote, List,
  BarChart3, AlertTriangle, TrendingUp, Zap, HelpCircle, MessageCircle, BookOpen,
  FileText, Plus, X, Eye, Smartphone, Monitor, Copy, Image as ImageIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { checkSEO } from '../utils/seo-checker';
import { SEOMetrics } from '../types';
import { WordPressService } from '../services/wordpress-service';
import { WeChatPublisher } from '../services/wechat-publisher';
import { XhsAdapter } from '../services/xhs-adapter';
import { formatForWeChat, formatForRedNote } from '../utils/formatter';

export const ArticleEditor: React.FC = () => {
  const { articles, activeArticleId, updateArticleStatus, softDeleteArticle, approvePublish, trends } = useContentStore();
  const settings = useSettingsStore();
  const navigate = useNavigate();
  
  const contentRef = useRef<HTMLDivElement>(null);
  const prevIdRef = useRef<string | null>(null);

  const activeArticle = useMemo(() => {
    if (articles.length === 0) return null;
    return articles.find(a => a.id === activeArticleId) || articles[0];
  }, [articles, activeArticleId]);

  const sourceTrend = useMemo(() => {
    return trends.find(t => t.id === activeArticle?.trendId);
  }, [trends, activeArticle]);

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState('');
  const [seoMetrics, setSeoMetrics] = useState<SEOMetrics | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // 改为单选渠道
  const [selectedChannel, setSelectedChannel] = useState<'wordpress' | 'wechat' | 'xiaohongshu'>('wordpress');
  // 预览平台自动跟随选中的渠道
  const [previewPlatform, setPreviewPlatform] = useState<'wordpress' | 'wechat' | 'rednote'>('wordpress');
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    if (activeArticle) {
      const editorHasContent = contentRef.current && contentRef.current.innerHTML.trim() !== '';
      const isNewArticle = prevIdRef.current !== activeArticle.id;
      const contentGenerated = activeArticle.content !== '' && !editorHasContent;

      if (contentRef.current && (isNewArticle || contentGenerated)) {
        contentRef.current.innerHTML = activeArticle.content;
        prevIdRef.current = activeArticle.id;
      }

      setSeoMetrics(checkSEO(activeArticle.title, activeArticle.content));

      // 从保存的渠道配置中恢复选中状态
      if (activeArticle.channels) {
        if (activeArticle.channels.xiaohongshu) {
          setSelectedChannel('xiaohongshu');
          setPreviewPlatform('rednote');
        } else if (activeArticle.channels.wechat) {
          setSelectedChannel('wechat');
          setPreviewPlatform('wechat');
        } else {
          setSelectedChannel('wordpress');
          setPreviewPlatform('wordpress');
        }
      }
    }
  }, [activeArticle?.id, activeArticle?.content === '']);

  const handleContentChange = () => {
    if (contentRef.current && activeArticle) {
      const newContent = contentRef.current.innerHTML;
      setSeoMetrics(checkSEO(activeArticle.title, newContent));
      updateArticleStatus(activeArticle.id, activeArticle.status, { content: newContent });
    }
  };

  // 处理渠道切换
  const handleChannelChange = (channel: 'wordpress' | 'wechat' | 'xiaohongshu') => {
    setSelectedChannel(channel);

    // 自动切换预览平台
    if (channel === 'xiaohongshu') {
      setPreviewPlatform('rednote');
    } else if (channel === 'wechat') {
      setPreviewPlatform('wechat');
    } else {
      setPreviewPlatform('wordpress');
    }

    // 更新编辑器内容格式
    if (contentRef.current && activeArticle) {
      const currentContent = activeArticle.content; // 使用原始内容

      if (channel === 'wechat') {
        contentRef.current.innerHTML = formatForWeChat(currentContent, 'tech');
      } else if (channel === 'xiaohongshu') {
        contentRef.current.innerHTML = formatForRedNote({ ...activeArticle, content: currentContent });
      } else {
        contentRef.current.innerHTML = currentContent;
      }
    }

    // 保存渠道配置到文章
    const channels = {
      wordpress: channel === 'wordpress',
      wechat: channel === 'wechat',
      xiaohongshu: channel === 'xiaohongshu'
    };
    updateArticleStatus(activeArticle!.id, activeArticle!.status, { channels });
  };

  // 复制当前渠道内容
  const handleCopyContent = async () => {
    if (!contentRef.current) return;

    try {
      const contentToCopy = contentRef.current.innerText; // 获取纯文本
      await navigator.clipboard.writeText(contentToCopy);
      setCopyStatus('已复制');
      setTimeout(() => setCopyStatus(''), 2000);
    } catch (err) {
      setCopyStatus('复制失败');
      setTimeout(() => setCopyStatus(''), 2000);
    }
  };

  const execCmd = (command: string, value: string | null = null) => {
    document.execCommand(command, false, value ?? undefined);
    handleContentChange();
  };

  const handlePublish = async () => {
    if (!activeArticle || !contentRef.current) return;
    setIsPublishing(true);
    setPublishStatus('正在发布...');

    try {
      let wpPostId = activeArticle.wpPostId;
      const channels = {
        wordpress: selectedChannel === 'wordpress',
        wechat: selectedChannel === 'wechat',
        xiaohongshu: selectedChannel === 'xiaohongshu'
      };

      // 根据选中的渠道进行发布
      if (selectedChannel === 'xiaohongshu') {
        const xhs = new XhsAdapter();
        const payload = await xhs.preparePayload(activeArticle);
        await xhs.publish(payload);
        setPublishStatus('小红书发布成功');
      } else if (selectedChannel === 'wordpress') {
        const wpRes = await WordPressService.publishArticle(
          { ...activeArticle, content: contentRef.current.innerHTML },
          settings.wordpressConfig
        );
        if (wpRes && wpRes.id) wpPostId = wpRes.id;
        setPublishStatus('WordPress 发布成功');
      } else if (selectedChannel === 'wechat') {
        const wechat = new WeChatPublisher({
          appId: settings.wechatAppId,
          appSecret: settings.wechatAppSecret
        });
        await wechat.createDraft({ ...activeArticle, content: contentRef.current.innerHTML });
        setPublishStatus('微信公众号草稿创建成功');
      }

      updateArticleStatus(activeArticle.id, 'published', { wpPostId, channels });
      approvePublish(activeArticle.id);
      setTimeout(() => navigate('/library'), 1500);
    } catch (error: any) {
      setPublishStatus(`发布失败: ${error.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const onDelete = async () => {
    if (!activeArticle) return;
    await softDeleteArticle(activeArticle.id);
    navigate('/library');
  };

  if (!activeArticle) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] text-gray-400">
        <FileText size={48} className="mb-4 opacity-10" />
        <h3 className="text-sm font-bold text-gray-900">暂无活跃草稿</h3>
        <button onClick={() => navigate('/')} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-all">
          去雷达发现热点
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col overflow-hidden">
      {/* Header Area */}
      <div className="flex items-center gap-4 mb-4 shrink-0 px-1">
        <button onClick={() => navigate('/library')} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1">
          <input 
            value={activeArticle.title}
            onChange={(e) => updateArticleStatus(activeArticle.id, activeArticle.status, { title: e.target.value })}
            className="text-base font-bold text-gray-900 bg-transparent border-none focus:outline-none w-full placeholder-gray-300 tracking-tight"
            placeholder="文章标题..."
          />
        </div>
        <div className="flex items-center gap-2">
          {publishStatus && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{publishStatus}</span>}
          
          <button 
            onClick={() => setShowPreview(true)}
            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-[11px] font-bold hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-all"
          >
            <Eye size={12} />
            预览
          </button>

          <button 
            onClick={handlePublish}
            disabled={isPublishing}
            className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-[11px] font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
          >
            {isPublishing ? <Clock size={12} className="animate-spin" /> : <Send size={12} />}
            {activeArticle.publishMode === 'scheduled' ? '定时发布' : '立即发布'}
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 overflow-hidden pb-4">
        {/* Editor Main Section */}
        <div className="col-span-8 flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-2 py-1 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              <EditorToolBtn onClick={() => execCmd('bold')} icon={Bold} />
              <EditorToolBtn onClick={() => execCmd('italic')} icon={Italic} />
              <div className="w-px h-3 bg-gray-200 mx-1" />
              <EditorToolBtn onClick={() => execCmd('formatBlock', '<h2>')} icon={Heading2} />
              <EditorToolBtn onClick={() => execCmd('formatBlock', '<h3>')} icon={Heading3} />
              <div className="w-px h-3 bg-gray-200 mx-1" />
              <EditorToolBtn onClick={() => execCmd('formatBlock', '<blockquote>')} icon={Quote} />
              <EditorToolBtn onClick={() => execCmd('insertUnorderedList')} icon={List} />
            </div>
            <div className="flex items-center gap-2">
              {copyStatus && (
                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                  {copyStatus}
                </span>
              )}
              <button
                onClick={handleCopyContent}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-[10px] font-bold hover:bg-indigo-700 flex items-center gap-1.5 transition-all"
              >
                <Copy size={12} />
                一键复制
              </button>
            </div>
          </div>
          <div
            className="flex-1 overflow-y-auto p-10 prose prose-sm prose-indigo max-w-none focus:outline-none custom-scrollbar leading-relaxed text-gray-700"
            ref={contentRef}
            contentEditable
            onInput={handleContentChange}
            onBlur={handleContentChange}
            spellCheck={false}
          />
        </div>

        {/* Sidebar Controls */}
        <div className="col-span-4 flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
          {/* Distribution Channels */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Globe size={11} /> 渠道分发 (单选)
            </h3>
            <div className="space-y-1">
              <ChannelRow
                active={selectedChannel === 'wordpress'}
                onClick={() => handleChannelChange('wordpress')}
                icon={Globe}
                label="WordPress"
                color="blue"
              />
              <ChannelRow
                active={selectedChannel === 'wechat'}
                onClick={() => handleChannelChange('wechat')}
                icon={MessageCircle}
                label="微信公众号"
                color="green"
              />
              <ChannelRow
                active={selectedChannel === 'xiaohongshu'}
                onClick={() => handleChannelChange('xiaohongshu')}
                icon={BookOpen}
                label="小红书"
                color="red"
              />
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[9px] text-gray-400 leading-relaxed">
                💡 切换渠道将自动调整编辑器格式，点击右上角「一键复制」即可粘贴使用
              </p>
            </div>
          </div>

          {/* SEO Performance */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <BarChart3 size={11} /> SEO 诊断
              </h3>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ (seoMetrics?.score || 0) > 80 ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600' }`}>
                {seoMetrics?.score || 0}%
              </span>
            </div>
            <div className="space-y-2">
              <SEOItem label="核心关键词频率" status={seoMetrics?.keywordDensity > 1 ? 'pass' : 'warn'} />
              <SEOItem label="内容结构层级" status={seoMetrics?.hasHeadings ? 'pass' : 'fail'} />
              <SEOItem label="文章篇幅深度" status={seoMetrics?.contentLength === 'good' ? 'pass' : 'fail'} />
            </div>
          </div>

          {/* Heat & Distribution */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <TrendingUp size={11} /> 趋势洞察
            </h3>
            <div className="flex items-center gap-2 mb-3 p-2.5 bg-gray-50/50 rounded-lg border border-gray-100">
              <div className={`p-1 rounded-md ${sourceTrend?.forecast === 'rising' ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'}`}>
                <Zap size={12} fill="currentColor" />
              </div>
              <div className="leading-tight">
                <p className="text-[9px] font-bold text-gray-400">热度预测</p>
                <p className="text-[10px] font-bold text-gray-900">{sourceTrend?.forecast === 'rising' ? '爆发式增长' : '平稳获益期'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ModeBtn active={activeArticle.publishMode === 'instant'} onClick={() => updateArticleStatus(activeArticle.id, activeArticle.status, { publishMode: 'instant' })} label="立即发布" />
              <ModeBtn active={activeArticle.publishMode === 'scheduled'} onClick={() => updateArticleStatus(activeArticle.id, activeArticle.status, { publishMode: 'scheduled' })} label="定时发布" />
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-auto p-3 bg-red-50/30 border border-red-100/50 rounded-xl">
            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)} className="w-full text-[10px] text-red-600 font-bold flex items-center justify-center gap-2 py-1.5 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={12} /> 移入回收站
              </button>
            ) : (
              <div className="flex items-center justify-between animate-in fade-in slide-in-from-right-2">
                <span className="text-[10px] font-bold text-red-700">确定同步删除远程文章？</span>
                <div className="flex gap-1.5">
                  <button onClick={onDelete} className="px-2.5 py-1 bg-red-600 text-white rounded text-[10px] font-bold">确定</button>
                  <button onClick={() => setShowDeleteConfirm(false)} className="px-2.5 py-1 bg-white text-gray-500 border border-gray-200 rounded text-[10px]">取消</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Preview Modal */}
      {showPreview && (
        <PreviewModal
            article={activeArticle}
            contentHtml={contentRef.current?.innerHTML || ''}
            initialPlatform={previewPlatform}
            onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};

const PreviewModal = ({
  article,
  contentHtml,
  initialPlatform,
  onClose
}: {
  article: any;
  contentHtml: string;
  initialPlatform: 'wordpress' | 'wechat' | 'rednote';
  onClose: () => void;
}) => {
    const [platform, setPlatform] = useState<'wechat' | 'rednote' | 'wordpress'>(initialPlatform);
    const [copyStatus, setCopyStatus] = useState('');

    const renderedContent = useMemo(() => {
        if (platform === 'wechat') return formatForWeChat(contentHtml, 'tech');
        if (platform === 'rednote') return formatForRedNote({ ...article, content: contentHtml });
        return contentHtml;
    }, [platform, contentHtml, article]);

    // 复制内容到剪贴板
    const handleCopyContent = async () => {
        try {
            await navigator.clipboard.writeText(renderedContent);
            setCopyStatus('已复制');
            setTimeout(() => setCopyStatus(''), 2000);
        } catch (err) {
            setCopyStatus('复制失败');
            setTimeout(() => setCopyStatus(''), 2000);
        }
    };

    const extractedImages = useMemo(() => {
        const imgs: string[] = [];
        if (article.coverImage) imgs.push(article.coverImage);
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(contentHtml, 'text/html');
        doc.querySelectorAll('img').forEach(img => {
            if (img.src && img.src !== article.coverImage) imgs.push(img.src);
        });
        return imgs;
    }, [contentHtml, article.coverImage]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white z-10">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold text-gray-900">效果预览</h2>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setPlatform('wechat')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${platform === 'wechat' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                <MessageCircle size={14} /> 微信公众号
                            </button>
                            <button
                                onClick={() => setPlatform('rednote')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${platform === 'rednote' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                <BookOpen size={14} /> 小红书
                            </button>
                            <button
                                onClick={() => setPlatform('wordpress')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${platform === 'wordpress' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                <Globe size={14} /> WordPress
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {copyStatus && (
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                                {copyStatus}
                            </span>
                        )}
                        <button
                            onClick={handleCopyContent}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-all"
                        >
                            <Copy size={14} />
                            复制内容
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden bg-gray-50 flex justify-center relative">
                    {/* Device Simulator */}
                    <div className={`transition-all duration-300 flex flex-col shadow-2xl bg-white overflow-hidden my-6 border border-gray-200 ${
                        platform === 'wordpress' 
                            ? 'w-full max-w-4xl rounded-xl h-full mx-6' 
                            : 'w-[375px] rounded-[30px] border-[8px] border-gray-900 h-full'
                    }`}>
                        
                        {/* Mobile Status Bar Simulation */}
                        {platform !== 'wordpress' && (
                            <div className="bg-gray-900 text-white h-7 flex items-center justify-between px-6 text-[10px] font-medium shrink-0">
                                <span>9:41</span>
                                <div className="flex gap-1">
                                    <div className="w-3 h-3 bg-white/20 rounded-full" />
                                    <div className="w-3 h-3 bg-white/20 rounded-full" />
                                </div>
                            </div>
                        )}

                        {/* Content Scroll Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                            {/* WeChat View */}
                            {platform === 'wechat' && (
                                <div className="p-5 min-h-full">
                                    <h1 className="text-xl font-bold text-gray-900 leading-snug mb-3">{article.title}</h1>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
                                        <span className="text-indigo-600 font-bold">ContentOS AI</span>
                                        <span>{new Date().toLocaleDateString()}</span>
                                    </div>
                                    {article.coverImage && (
                                        <img src={article.coverImage} className="w-full aspect-video object-cover rounded-lg mb-6" alt="Cover" />
                                    )}
                                    <div dangerouslySetInnerHTML={{ __html: renderedContent }} />
                                </div>
                            )}

                            {/* RedNote View (Enhanced with Image Gallery) */}
                            {platform === 'rednote' && (
                                <div className="flex flex-col min-h-full">
                                    {/* Scrollable Image Gallery */}
                                    <div className="aspect-[3/4] bg-gray-100 relative shrink-0 overflow-x-auto snap-x snap-mandatory flex custom-scrollbar">
                                        {extractedImages.length > 0 ? (
                                            extractedImages.map((img, idx) => (
                                                <div key={idx} className="snap-center w-full h-full shrink-0 relative">
                                                    <img src={img} className="w-full h-full object-cover" alt={`Slide ${idx+1}`} />
                                                    <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm">
                                                        {idx + 1}/{extractedImages.length}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-100 shrink-0">
                                                <div className="text-center">
                                                    <ImageIcon size={48} className="mx-auto mb-2 opacity-20" />
                                                    <span className="text-xs font-bold">暂无图片</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 bg-white flex-1">
                                        <h1 className="text-base font-bold text-gray-900 mb-2 leading-snug">{article.title}</h1>
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-6 h-6 rounded-full bg-gray-200" />
                                            <span className="text-xs text-gray-500">我的小红书账号</span>
                                        </div>
                                        <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                            {renderedContent}
                                        </div>
                                        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                                            <span>昨天 12:30 发布于 上海</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* WordPress View */}
                            {platform === 'wordpress' && (
                                <div className="max-w-3xl mx-auto py-12 px-8 min-h-full">
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2 block">{article.category || 'Uncategorized'}</span>
                                    <h1 className="text-4xl font-black text-gray-900 mb-6 leading-tight">{article.title}</h1>
                                    
                                    <div className="flex items-center gap-3 mb-8 pb-8 border-b border-gray-100">
                                        <div className="w-10 h-10 rounded-full bg-gray-200" />
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">Admin Author</p>
                                            <p className="text-xs text-gray-500">{new Date().toLocaleDateString()} • 5 min read</p>
                                        </div>
                                    </div>

                                    {article.coverImage && (
                                        <img src={article.coverImage} className="w-full rounded-2xl mb-10 shadow-sm" alt="Cover" />
                                    )}

                                    <div
                                        className="prose prose-lg prose-indigo max-w-none text-gray-800"
                                        dangerouslySetInnerHTML={{ __html: renderedContent }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const EditorToolBtn = ({ onClick, icon: Icon }: any) => (
  <button onMouseDown={(e) => e.preventDefault()} onClick={onClick} className="p-1.5 hover:bg-white hover:shadow-sm rounded text-gray-400 hover:text-indigo-600 transition-all">
    <Icon size={13} />
  </button>
);

const SEOItem = ({ label, status }: { label: string, status: 'pass' | 'fail' | 'warn' }) => (
  <div className="flex items-center justify-between text-[10px]">
    <span className="text-gray-500">{label}</span>
    {status === 'pass' ? <CheckCircle2 size={11} className="text-green-500" /> : status === 'fail' ? <AlertTriangle size={11} className="text-red-500" /> : <HelpCircle size={11} className="text-amber-500" />}
  </div>
);

const ChannelRow = ({ active, onClick, icon: Icon, label, color }: any) => {
  const c = { blue: 'text-blue-600 bg-blue-50', green: 'text-green-600 bg-green-50', red: 'text-red-600 bg-red-50' }[color as 'blue'|'green'|'red'];
  return (
    <div onClick={onClick} className={`flex items-center justify-between p-1.5 rounded-lg border cursor-pointer transition-all ${active ? 'border-indigo-100 bg-indigo-50/50 shadow-sm' : 'border-transparent hover:bg-gray-50'}`}>
      <div className="flex items-center gap-2">
        <div className={`p-1 rounded ${active ? c : 'bg-gray-100 text-gray-400'}`}><Icon size={11} /></div>
        <span className={`text-[10px] font-medium ${active ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
      </div>
      {active && <CheckCircle2 size={11} className="text-indigo-600" />}
    </div>
  );
};

const ModeBtn = ({ active, onClick, label }: any) => (
  <button onClick={onClick} className={`py-1.5 px-1 rounded-lg border text-[10px] font-bold transition-all ${active ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}>
    {label}
  </button>
);
