
import React, { useState } from 'react';
import { useContentStore } from '../store/useContentStore';
import { Article, PipelineStatus } from '../types';
import { 
  Search, CheckCircle2, Clock, FileText, AlertCircle, Loader2, Globe, MessageCircle, 
  ChevronLeft, ChevronRight, LayoutTemplate, BookOpen, Trash2, Edit, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StatusBadge = ({ status }: { status: PipelineStatus }) => {
  const styles = {
    idle: 'bg-gray-100 text-gray-600',
    reasoning: 'bg-amber-50 text-amber-700 border-amber-200',
    drafting: 'bg-blue-50 text-blue-700 border-blue-200',
    visualizing: 'bg-purple-50 text-purple-700 border-purple-200',
    review: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    published: 'bg-green-50 text-green-700 border-green-200',
    trash: 'bg-red-50 text-red-700 border-red-200'
  } as any;
  const labels = { idle: '等待', reasoning: '推理中', drafting: '撰写中', visualizing: '配图中', review: '待审', published: '已发', trash: '回收' } as any;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[status]}`}>
      {['reasoning', 'drafting', 'visualizing'].includes(status) && <Loader2 size={10} className="animate-spin" />}
      {labels[status]}
    </span>
  );
};

export const PipelineMonitor: React.FC = () => {
  const { articles, softDeleteArticle } = useContentStore();
  const navigate = useNavigate();
  
  const [filter, setFilter] = useState<'all' | 'processing' | 'review' | 'published'>('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const itemsPerPage = 10;

  const filteredData = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(search.toLowerCase());
    if (article.status === 'trash') return false;
    if (filter === 'processing') return ['reasoning', 'drafting', 'visualizing'].includes(article.status);
    if (filter === 'review') return article.status === 'review';
    if (filter === 'published') return article.status === 'published';
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 shrink-0 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">流水线监控</h2>
          <p className="text-xs md:text-sm text-gray-500 mt-1">实时观测 AI 内容工厂的生产进度。</p>
        </div>
        <div className="flex gap-3">
            <div className="bg-white border border-gray-100 rounded-lg px-3 py-1.5 text-[10px] font-bold text-gray-500 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                正在运行: {articles.filter(a => ['reasoning','drafting','visualizing'].includes(a.status)).length}
            </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl flex-1 overflow-hidden flex flex-col shadow-sm">
        <div className="p-3 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-gray-50/20 gap-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            {(['all', 'processing', 'review', 'published'] as const).map((tab) => (
              <button key={tab} onClick={() => { setFilter(tab); setCurrentPage(1); }} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all whitespace-nowrap ${filter === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {tab === 'all' ? '全部' : tab === 'processing' ? '处理中' : tab === 'review' ? '待审核' : '已发布'}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
            <input type="text" placeholder="搜索任务..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-7 pr-3 py-1.5 border border-gray-200 rounded-lg text-[10px] focus:ring-1 focus:ring-indigo-500 outline-none" />
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-[11px] min-w-[640px]">
            <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="px-4 md:px-6 py-3 w-24 md:w-32">状态</th>
                <th className="px-4 md:px-6 py-3">内容标题</th>
                <th className="px-4 md:px-6 py-3 w-24 md:w-32">渠道</th>
                <th className="px-4 md:px-6 py-3 w-20 md:w-32 text-right">管理</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedData.map((article) => (
                <tr key={article.id} className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => { useContentStore.getState().setActiveArticleId(article.id); navigate('/editor'); }}>
                  <td className="px-4 md:px-6 py-4"><StatusBadge status={article.status} /></td>
                  <td className="px-4 md:px-6 py-4 font-bold text-gray-900 group-hover:text-indigo-600">{article.title}</td>
                  <td className="px-4 md:px-6 py-4">
                    <div className="flex gap-1">
                      {article.channels.wordpress && <div className="p-1 bg-blue-100 text-blue-600 rounded"><Globe size={10} /></div>}
                      {article.channels.wechat && <div className="p-1 bg-green-100 text-green-600 rounded"><MessageCircle size={10} /></div>}
                      {article.channels.xiaohongshu && <div className="p-1 bg-red-100 text-red-600 rounded"><BookOpen size={10} /></div>}
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end">
                       {confirmDeleteId === article.id ? (
                         <div className="flex gap-1 animate-in zoom-in-95">
                           <button onClick={() => { softDeleteArticle(article.id); setConfirmDeleteId(null); }} className="bg-red-600 text-white px-2 py-0.5 rounded font-bold text-[9px]">删</button>
                           <button onClick={() => setConfirmDeleteId(null)} className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[9px]">否</button>
                         </div>
                       ) : (
                         <button onClick={() => setConfirmDeleteId(article.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
