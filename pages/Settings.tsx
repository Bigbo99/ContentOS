
import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { DEFAULT_TRACKS } from '../constants/tracks';
import { PROMPT_SECTIONS, DEFAULT_SYSTEM_PROMPT } from '../constants/default-prompt';
import {
  ShieldAlert,
  Key,
  CheckCircle2,
  Loader2,
  Cpu,
  Globe,
  RefreshCw,
  ExternalLink,
  Target,
  Edit3,
  Save,
  FileText,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

const TabButton = ({ active, onClick, children, icon: Icon }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-indigo-600 text-indigo-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    <Icon size={16} />
    {children}
  </button>
);

const SectionCard = ({ title, description, children, icon: Icon }: any) => (
  <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
    <div className="flex items-start gap-4 mb-6">
      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
        <Icon size={24} />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

const InputField = ({ label, value, onChange, type = "text", placeholder, className = "" }: any) => (
  <div className={`space-y-1.5 ${className}`}>
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
      placeholder={placeholder}
    />
  </div>
);

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ai' | 'cms' | 'tracks' | 'prompt'>('ai');
  const [verifying, setVerifying] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Local state for custom keywords to avoid excessive re-renders/writes
  const store = useSettingsStore();
  const [localKeywords, setLocalKeywords] = useState('');

  // Prompt编辑器状态
  const [promptSections, setPromptSections] = useState<Record<string, string>>({});
  const [isPromptModified, setIsPromptModified] = useState(false);

  useEffect(() => {
    // Load from store on mount or when store changes
    setLocalKeywords(store.customTrackKeywords.join(', '));

    // 初始化Prompt编辑器
    if (store.customPrompt) {
      // 如果有自定义Prompt，尝试解析
      parseCustomPrompt(store.customPrompt);
    } else {
      // 使用默认值
      const defaultSections: Record<string, string> = {};
      PROMPT_SECTIONS.forEach(section => {
        defaultSections[section.id] = section.defaultContent;
      });
      setPromptSections(defaultSections);
    }
  }, [store.customTrackKeywords, store.customPrompt]);

  const parseCustomPrompt = (prompt: string) => {
    const sections: Record<string, string> = {};
    PROMPT_SECTIONS.forEach(section => {
      // 简单的解析逻辑，根据标题分割
      sections[section.id] = section.defaultContent;
    });
    setPromptSections(sections);
  };

  const handleVerify = async (provider: string) => {
    setVerifying(provider);
    if (provider === 'deepseek') await store.verifyDeepSeek();
    if (provider === 'wp') await store.fetchWordPressCategories();
    setVerifying(null);
  };

  const handleKeywordsSave = () => {
    // Split by comma, Chinese comma, or newline
    const arr = localKeywords.split(/[,，\n]/).map(k => k.trim()).filter(Boolean);
    console.log("Saving Custom Keywords:", arr);
    store.setCustomTrackKeywords(arr);

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handlePromptSectionChange = (sectionId: string, value: string) => {
    setPromptSections(prev => ({ ...prev, [sectionId]: value }));
    setIsPromptModified(true);
  };

  const handlePromptSave = () => {
    // 组合所有section生成完整prompt
    let fullPrompt = '';
    PROMPT_SECTIONS.forEach((section, index) => {
      const content = promptSections[section.id] || section.defaultContent;
      if (index === 0) {
        fullPrompt += `# ${section.title}\n${content}\n\n`;
      } else {
        fullPrompt += `# ${index}. ${section.title}\n${content}\n\n`;
      }
    });

    store.setCustomPrompt(fullPrompt.trim());
    setIsPromptModified(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handlePromptReset = () => {
    if (confirm('确定要重置为默认Prompt吗？所有自定义修改将丢失。')) {
      store.resetPromptToDefault();
      const defaultSections: Record<string, string> = {};
      PROMPT_SECTIONS.forEach(section => {
        defaultSections[section.id] = section.defaultContent;
      });
      setPromptSections(defaultSections);
      setIsPromptModified(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">系统设置 & 接口配置</h2>
        <p className="text-gray-500 mt-1">管理 API 密钥、模型参数及外部服务连接。</p>
      </div>

      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
        <TabButton
          active={activeTab === 'ai'}
          onClick={() => setActiveTab('ai')}
          icon={Cpu}
        >
          AI 模型接入
        </TabButton>
        <TabButton
          active={activeTab === 'prompt'}
          onClick={() => setActiveTab('prompt')}
          icon={FileText}
        >
          AI Prompt 编辑
        </TabButton>
        <TabButton
          active={activeTab === 'tracks'}
          onClick={() => setActiveTab('tracks')}
          icon={Target}
        >
          赛道与清洗
        </TabButton>
        <TabButton
          active={activeTab === 'cms'}
          onClick={() => setActiveTab('cms')}
          icon={Globe}
        >
          CMS 连接
        </TabButton>
      </div>

      {activeTab === 'ai' && (
        <div className="animate-in fade-in duration-300">
           <SectionCard 
            title="DeepSeek 深度思考引擎" 
            description="配置用于中文热点分析、逻辑推理及文章起草的模型 (DeepSeek-R1/V3)。"
            icon={Cpu}
          >
            <div className="flex items-end gap-4 max-w-2xl">
              <InputField 
                label="DeepSeek API Key" 
                type="password"
                value={store.deepseekKey} 
                onChange={store.setDeepSeekKey}
                placeholder="sk-..."
                className="flex-1"
              />
              <button
                onClick={() => handleVerify('deepseek')}
                disabled={!store.deepseekKey || verifying === 'deepseek'}
                className={`px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 transition-all ${
                  store.isDeepSeekVerified 
                    ? 'bg-green-50 border-green-200 text-green-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {verifying === 'deepseek' ? <Loader2 size={16} className="animate-spin" /> : store.isDeepSeekVerified ? <CheckCircle2 size={16} /> : <Key size={16} />}
                {store.isDeepSeekVerified ? '已验证' : '验证密钥'}
              </button>
            </div>
            <div className="mt-3 text-xs text-gray-500">
               <a href="https://platform.deepseek.com/" target="_blank" className="text-indigo-600 hover:underline flex items-center gap-1 inline-flex">
                 获取 DeepSeek Key <ExternalLink size={10} />
               </a>
            </div>
          </SectionCard>
        </div>
      )}

      {activeTab === 'prompt' && (
        <div className="animate-in fade-in duration-300">
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AI 内容生成 Prompt</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    自定义AI生成文章的指令模板，控制写作风格、平台适配策略和输出格式
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePromptReset}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors"
                >
                  <RotateCcw size={16} />
                  重置为默认
                </button>
                <button
                  onClick={handlePromptSave}
                  disabled={!isPromptModified}
                  className={`px-6 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all ${
                    isPromptModified
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Save size={16} />
                  {isSaved ? '已保存' : '保存修改'}
                </button>
              </div>
            </div>

            {/* Prompt Section 编辑器 */}
            <div className="space-y-6">
              {PROMPT_SECTIONS.map((section, index) => (
                <div key={section.id} className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-indigo-600">#{index + 1}</span>
                        {section.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">{section.description}</p>
                    </div>
                    {section.id === 'output' && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        <AlertCircle size={12} />
                        不建议修改
                      </div>
                    )}
                  </div>
                  <textarea
                    value={promptSections[section.id] || section.defaultContent}
                    onChange={(e) => handlePromptSectionChange(section.id, e.target.value)}
                    rows={section.id === 'output' ? 8 : section.id === 'role' ? 4 : 6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow resize-none"
                    placeholder={section.defaultContent}
                  />
                </div>
              ))}
            </div>

            {/* 使用提示 */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">💡 编辑提示</p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-blue-700">
                    <li>每个模块对应AI生成文章的不同方面（角色设定、写作风格、平台适配等）</li>
                    <li>修改后点击"保存修改"即可生效，下次生成文章时会使用新的Prompt</li>
                    <li>Output Format部分定义了JSON结构，不建议修改，否则可能导致解析失败</li>
                    <li>点击"重置为默认"可以恢复到系统预设的Prompt版本</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tracks' && (
        <div className="animate-in fade-in duration-300">
            <SectionCard 
                title="赛道清洗配置 (The Taxonomy)" 
                description="选择您的核心内容赛道。系统将自动过滤噪音，优先展示命中关键词的高价值热点。"
                icon={Target}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {DEFAULT_TRACKS.map(track => {
                        const isActive = store.activeTrackId === track.id;
                        return (
                            <div 
                                key={track.id}
                                onClick={() => store.setActiveTrackId(track.id)}
                                className={`cursor-pointer border rounded-xl p-4 transition-all relative ${
                                    isActive 
                                    ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' 
                                    : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                                }`}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">{track.emoji}</span>
                                    <h4 className={`font-bold ${isActive ? 'text-indigo-900' : 'text-gray-900'}`}>{track.label}</h4>
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed min-h-[40px]">{track.description}</p>
                                {isActive && (
                                    <div className="absolute top-3 right-3 text-indigo-600">
                                        <CheckCircle2 size={18} />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Edit3 size={16} className="text-gray-500" />
                            <label className="text-sm font-bold text-gray-900">当前赛道关键词预览</label>
                        </div>
                        {store.activeTrackId === 'custom' && (
                            <button 
                                onClick={handleKeywordsSave}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                                    isSaved 
                                    ? 'bg-green-500 text-white' 
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}
                            >
                                {isSaved ? <CheckCircle2 size={14} /> : <Save size={14} />}
                                {isSaved ? '已保存' : '保存设置'}
                            </button>
                        )}
                    </div>
                    
                    {store.activeTrackId === 'custom' ? (
                        <div className="space-y-2">
                            <textarea 
                                value={localKeywords}
                                onChange={(e) => setLocalKeywords(e.target.value)}
                                className="w-full h-24 p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder="请输入关键词，用逗号分隔。例如：SaaS, 增长, 变现..."
                            />
                            <p className="text-xs text-gray-500">
                                多个关键词请用逗号或换行分隔。配置后将在<b>热点雷达</b>中即时生效。
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {DEFAULT_TRACKS.find(t => t.id === store.activeTrackId)?.keywords.map(k => (
                                <span key={k} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600 font-medium">
                                    {k}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </SectionCard>
        </div>
      )}

      {activeTab === 'cms' && (
        <div className="animate-in fade-in duration-300">
          <SectionCard 
            title="WordPress 连接配置" 
            description="连接您的自托管 WordPress 站点或 WordPress.com 博客。"
            icon={Globe}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <InputField 
                label="站点地址 (Site URL)" 
                value={store.wordpressConfig.url} 
                onChange={(val: string) => store.setWordPressConfig('url', val)}
                placeholder="https://yourblog.com"
                className="col-span-2"
              />
              <InputField 
                label="用户名 (Username)" 
                value={store.wordpressConfig.username} 
                onChange={(val: string) => store.setWordPressConfig('username', val)}
                placeholder="admin"
              />
              <InputField 
                label="应用密码 (App Password)" 
                type="password"
                value={store.wordpressConfig.appPassword} 
                onChange={(val: string) => store.setWordPressConfig('appPassword', val)}
                placeholder="xxxx xxxx xxxx xxxx"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
               <div className="flex items-center gap-2">
                 <button
                  onClick={() => handleVerify('wp')}
                  disabled={verifying === 'wp' || !store.wordpressConfig.url}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                >
                  {verifying === 'wp' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  获取分类 (Fetch Categories)
                </button>
                {store.isWordPressConnected && (
                    <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle2 size={16} /> 已连接
                    </span>
                )}
               </div>
            </div>

            {store.isWordPressConnected && store.wordpressCategories.length > 0 && (
                <div className="mt-6">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">可用分类</h4>
                    <div className="flex flex-wrap gap-2">
                        {store.wordpressCategories.map(cat => (
                            <span key={cat.id} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium border border-gray-200" title={`ID: ${cat.id} | Count: ${cat.count}`}>
                                {cat.name} {cat.parent !== 0 && '(Child)'}
                            </span>
                        ))}
                    </div>
                </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
};
