import React, { useState, useRef, useEffect } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { WordPressService } from '../../services/wordpress-service';
import { WPMediaItem } from '../../types';
import { X, Upload, Check, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';

interface MediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: WPMediaItem) => void;
}

export const MediaPicker: React.FC<MediaPickerProps> = ({ isOpen, onClose, onSelect }) => {
  const { mediaLibrary, addMediaItem, wordpressConfig, isWordPressConnected } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>('library');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !isWordPressConnected) {
        setError("WordPress 站点未连接。请前往‘系统设置’配置授权信息以访问云端媒体库。");
    } else {
        setError(null);
    }
  }, [isOpen, isWordPressConnected]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError("文件过大。WordPress 站点可能限制 10MB 以上的媒体上传。");
        return;
    }

    await performUpload(file);
  };

  const performUpload = async (file: File) => {
    if (!isWordPressConnected) return;
    
    setIsUploading(true);
    setError(null);
    
    try {
        // PRODUCTION: Uploading real binary stream to WordPress REST API
        const newItem = await WordPressService.uploadMedia(file, wordpressConfig);
        addMediaItem(newItem);
        setActiveTab('library');
        setSelectedId(newItem.id);
    } catch (err: any) {
        console.error("WP Media Sync Error:", err);
        setError(`媒体同步失败: ${err.message || '网络连接被远程主机拒绝'}`);
    } finally {
        setIsUploading(false);
    }
  };

  const selectedItem = mediaLibrary.find(m => m.id === selectedId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-5xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">WordPress 资源库</h2>
            <p className="text-xs text-gray-500 mt-0.5">直接管理远程站点的媒体资源</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {error && (
            <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-start gap-3 text-sm animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="font-semibold">发生错误</p>
                    <p className="opacity-90">{error}</p>
                </div>
            </div>
        )}

        <div className="flex px-6 border-b border-gray-100 bg-gray-50/30">
          <button 
            disabled={!isWordPressConnected}
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all disabled:opacity-30 ${activeTab === 'upload' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            新文件上传
          </button>
          <button 
            onClick={() => setActiveTab('library')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'library' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            媒体浏览 (云端同步)
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {activeTab === 'upload' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12">
              <div 
                className={`w-full max-w-lg aspect-video border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all ${isUploading ? 'bg-gray-50 border-gray-200' : 'bg-indigo-50/10 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer'}`}
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-16 h-16">
                        <Loader2 size={64} className="animate-spin text-indigo-600" />
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-gray-900">正在上传至服务器</p>
                        <p className="text-sm text-gray-500 mt-1">同步媒体元数据...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      accept="image/*"
                    />
                    <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                        <Upload size={32} />
                    </div>
                    <p className="text-xl font-bold text-gray-900">选择本地图片</p>
                    <p className="text-sm text-gray-500 mt-2 text-center max-w-xs px-6">支持 JPG, PNG, WEBP。文件将直接推送到 WordPress 云端资源目录。</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                 {mediaLibrary.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 py-20">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <ImageIcon size={40} className="opacity-20" />
                        </div>
                        <h3 className="font-bold text-gray-900">媒体库暂无数据</h3>
                        <p className="text-sm text-center max-w-xs mt-2">点击上方“新文件上传”同步首张图片，或通过 WordPress 设置同步全量库。</p>
                    </div>
                 ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {mediaLibrary.map(item => (
                        <div 
                            key={item.id}
                            onClick={() => setSelectedId(item.id)}
                            className={`aspect-square relative group cursor-pointer border-2 rounded-2xl overflow-hidden transition-all shadow-sm ${selectedId === item.id ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-white hover:border-indigo-200'}`}
                        >
                            <img src={item.url} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                <span className="text-[10px] text-white font-medium truncate w-full">{item.title}</span>
                            </div>
                            {selectedId === item.id && (
                            <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-1 shadow-lg animate-in fade-in zoom-in">
                                <Check size={14} />
                            </div>
                            )}
                        </div>
                        ))}
                    </div>
                 )}
              </div>

              <div className="w-80 bg-white border-l border-gray-100 p-6 overflow-y-auto flex flex-col shadow-inner">
                {selectedItem ? (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">资源详情</h3>
                    <div className="w-full aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 mb-6 shadow-sm">
                      <img src={selectedItem.url} alt="Preview" className="w-full h-full object-contain" />
                    </div>
                    <div className="space-y-4 text-xs">
                       <div className="flex flex-col gap-1">
                         <span className="text-gray-400 font-medium">文件名</span>
                         <span className="text-gray-900 font-semibold break-all">{selectedItem.title}</span>
                       </div>
                       <div className="flex justify-between items-center py-2 border-y border-gray-50">
                         <span className="text-gray-400 font-medium">资源 ID</span>
                         <span className="bg-gray-100 px-2 py-0.5 rounded font-mono text-gray-600">{selectedItem.id}</span>
                       </div>
                       <div className="flex flex-col gap-1">
                         <span className="text-gray-400 font-medium">物理链接 (Remote URL)</span>
                         <span className="text-gray-500 break-all select-all hover:text-indigo-600 cursor-pointer transition-colors line-clamp-2">{selectedItem.url}</span>
                       </div>
                    </div>
                    <button 
                        onClick={() => { onSelect(selectedItem); onClose(); }}
                        className="w-full mt-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                        确认选择
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-300 text-sm text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <ImageIcon size={32} className="opacity-10" />
                    </div>
                    <p className="font-medium">未选中任何资源</p>
                    <p className="text-[10px] mt-1 text-gray-400">请在左侧点击图片查看详情</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};