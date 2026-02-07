
import React, { useState, useEffect, useMemo } from 'react';
import { useContentStore } from '../store/useContentStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Search, Edit, Trash2, Clock, FileText, RefreshCcw, FolderOpen, Loader2, Globe, MessageCircle, BookOpen, ArrowLeft, X, Check
} from 'lucide-react';

type LibraryTab = 'published' | 'drafts' | 'trash';

export const ContentLibrary: React.FC = () => {
  const { articles, setActiveArticleId, softDeleteArticle, restoreArticle, hardDeleteArticle, emptyTrash } = useContentStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState<LibraryTab>('published');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCleaning, setIsCleaning] = useState(false);

  // 内联确认状态
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmHardDeleteId, setConfirmHardDeleteId] = useState<string | null>(null);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);

  useEffect(() => {
    if (location.state && (location.state as any).tab) {
        setActiveTab((location.state as any).tab as LibraryTab);
        window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (activeTab === 'published') return article.status === 'published';
      if (activeTab === 'trash') return article.status === 'trash';
      if (activeTab === 'drafts') return !['published', 'trash'].includes(article.status);
      return false;
    });
  }, [articles, activeTab, searchQuery]);

  const handleEdit = (id: string) => {
    setActiveArticleId(id);
    navigate('/editor');
  };

  const onEmptyTrash = async () => {
    setIsCleaning(true);
    try {
      await emptyTrash();
      setShowEmptyConfirm(false);
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">内容文库</h2>
          <p className="text-sm text-gray-500 mt-1">管理并分发您所有的内容资产。</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="搜索内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
          {activeTab === 'trash' && filteredArticles.length > 0 && (
            <div className="flex items-center gap-2">
              {!showEmptyConfirm ? (
                <button onClick={() => setShowEmptyConfirm(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">清空回收站</button>
              ) : (
                <div className="flex items-center gap-2 bg-red-50 p-1 px-2 rounded-lg border border-red-100">
                  <span className="text-[10px] font-bold text-red-700 uppercase">确定清空？</span>
                  <button onClick={onEmptyTrash} disabled={isCleaning} className="bg-red-600 text-white p-1 rounded"><Check size={12}/></button>
                  <button onClick={() => setShowEmptyConfirm(false)} className="bg-white text-gray-400 p-1 rounded border border-gray-200"><X size={12}/></button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 bg-gray-100/50 p-1 rounded-lg mb-6 self-start">
        <TabItem active={activeTab === 'published'} onClick={() => setActiveTab('published')} count={articles.filter(a => a.status === 'published').length}>已发布</TabItem>
        <TabItem active={activeTab === 'drafts'} onClick={() => setActiveTab('drafts')} count={articles.filter(a => !['published','trash'].includes(a.status)).length}>草稿箱</TabItem>
        <TabItem active={activeTab === 'trash'} onClick={() => setActiveTab('trash')} count={articles.filter(a => a.status === 'trash').length} variant="danger">回收站</TabItem>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {filteredArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
            {filteredArticles.map((article) => (
              <div key={article.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group">
                <div className="aspect-video relative bg-gray-50 border-b border-gray-100 overflow-hidden">
                  {article.coverImage ? <img src={article.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full flex items-center justify-center text-gray-200"><FileText size={32} /></div>}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-2 group-hover:text-indigo-600">{article.title}</h3>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-4">
                    <span className="flex items-center gap-1"><Clock size={10} /> {new Date(article.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
                    {activeTab === 'trash' ? (
                      <>
                        <button onClick={() => restoreArticle(article.id)} className="text-[10px] font-bold text-indigo-600 px-2 py-1 bg-indigo-50 rounded hover:bg-indigo-100 flex items-center gap-1"><RefreshCcw size={12}/> 恢复</button>
                        <div className="flex items-center">
                          {confirmHardDeleteId === article.id ? (
                            <div className="flex gap-1 animate-in zoom-in-95">
                              <button onClick={() => hardDeleteArticle(article.id)} className="bg-red-600 text-white p-1 rounded text-[10px]">确定</button>
                              <button onClick={() => setConfirmHardDeleteId(null)} className="bg-gray-100 text-gray-500 p-1 rounded text-[10px]">否</button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmHardDeleteId(article.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEdit(article.id)} className="text-[10px] font-bold text-gray-600 hover:text-indigo-600 flex items-center gap-1"><Edit size={12}/> 编辑内容</button>
                        <div className="flex items-center">
                          {confirmDeleteId === article.id ? (
                            <div className="flex gap-1 animate-in zoom-in-95">
                              <button onClick={() => { softDeleteArticle(article.id); setConfirmDeleteId(null); }} className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px]">确认</button>
                              <button onClick={() => setConfirmDeleteId(null)} className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px]">取消</button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDeleteId(article.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-300 py-20 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
            <FolderOpen size={48} className="mb-2 opacity-10" />
            <p className="text-sm font-bold">暂无内容</p>
          </div>
        )}
      </div>
    </div>
  );
};

const TabItem = ({ active, onClick, children, count, variant }: any) => (
  <button onClick={onClick} className={`px-4 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-all ${active ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}>
    {children}
    <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${active ? (variant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600') : 'bg-gray-200 text-gray-400'}`}>{count}</span>
  </button>
);
