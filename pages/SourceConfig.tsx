
import React, { useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { Source } from '../types';
import {
  Plus,
  Trash2,
  Edit2,
  Rss,
  Globe,
  Database,
  CheckCircle,
  XCircle,
  RefreshCw,
  MoreHorizontal,
  Share2,
  Twitter,
  Instagram,
  Power
} from 'lucide-react';

export const SourceConfig: React.FC = () => {
  const { sources, addSource, updateSource, deleteSource } = useSettingsStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Source>>({});

  const handleEdit = (source: Source) => {
    setFormData(source);
    setIsEditing(true);
  };

  const handleCreate = () => {
    setFormData({ type: 'rss', active: true });
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.url) return;

    if (formData.id) {
      updateSource(formData.id, formData);
    } else {
      addSource({
        ...formData,
        id: `src_${Date.now()}`,
        active: true,
        lastSync: '从未'
      } as Source);
    }
    setIsEditing(false);
    setFormData({});
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个数据源吗？')) {
      deleteSource(id);
    }
  };

  const handleToggleActive = (id: string, currentActive: boolean) => {
    updateSource(id, { active: !currentActive });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'weibo': return <Share2 size={16} className="text-red-500" />;
      case 'rss': return <Rss size={16} className="text-orange-500" />;
      case 'api': return <Database size={16} className="text-indigo-500" />;
      case 'scraper': return <Globe size={16} className="text-blue-500" />;
      default: return <Globe size={16} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'weibo': return '微博 (Weibo)';
      case 'rss': return 'RSS 订阅';
      case 'api': return 'API 接口';
      case 'scraper': return '网页爬虫';
      default: return type;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">数据源配置</h2>
          <p className="text-gray-500 mt-1">管理 AI 热点雷达的监听渠道，支持微博、RSS 及自定义 API。</p>
        </div>
        <button 
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          添加数据源
        </button>
      </div>

      {isEditing && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8 animate-in slide-in-from-top-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
            {formData.id ? '编辑源' : '新建源'}
          </h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">名称 (Name)</label>
              <input 
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={formData.name || ''}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="例如：微博热搜榜"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">类型 (Type)</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                value={formData.type || 'rss'}
                onChange={e => setFormData({...formData, type: e.target.value as any})}
              >
                <option value="weibo">微博 (Weibo API)</option>
                <option value="rss">RSS Feed</option>
                <option value="scraper">Web Scraper</option>
                <option value="api">JSON API</option>
              </select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-gray-700">URL 地址 / Endpoint</label>
              <input 
                required
                type="url"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                value={formData.url || ''}
                onChange={e => setFormData({...formData, url: e.target.value})}
                placeholder="https://..."
              />
            </div>
            <div className="col-span-2 flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">取消</button>
              <button type="submit" className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">保存配置</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 w-20 text-center">状态</th>
                <th className="px-6 py-4 w-64">源名称</th>
                <th className="px-6 py-4 w-32">类型</th>
                <th className="px-6 py-4">URL Endpoint</th>
                <th className="px-6 py-4 w-32 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sources.map((source) => (
                <tr key={source.id} className={`hover:bg-gray-50 transition-colors group ${!source.active ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleToggleActive(source.id, source.active)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        source.active ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                      title={source.active ? '点击禁用' : '点击启用'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          source.active ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {source.name}
                    {!source.active && (
                      <span className="ml-2 text-[10px] text-gray-400 font-normal">(已禁用)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600 flex items-center gap-2">
                    {source.name.includes('Twitter') ? <Twitter size={16} className="text-blue-400" /> :
                     source.name.includes('Instagram') ? <Instagram size={16} className="text-pink-500" /> :
                     getTypeIcon(source.type)}
                    {getTypeLabel(source.type)}
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs truncate max-w-xs">{source.url}</td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100">
                      <button onClick={() => handleEdit(source)} className="p-1.5 text-gray-500 hover:text-indigo-600" title="编辑"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(source.id)} className="p-1.5 text-gray-500 hover:text-red-600" title="删除"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};
