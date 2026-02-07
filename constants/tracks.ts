
export interface TrackConfig {
  id: string;
  label: string;
  keywords: string[]; // 用于正则匹配
  emoji: string;
  description: string;
}

export const DEFAULT_TRACKS: TrackConfig[] = [
  { 
    id: 'tech', 
    label: 'AI & 科技前沿', 
    emoji: '🤖', 
    description: '关注大模型、硬件、SaaS 及未来科技趋势',
    keywords: ['AI', '模型', '芯片', '融资', '苹果', '华为', 'GPT', 'DeepSeek', 'Sora', '算力', '发布', '开源', 'Agent', '机器人', '英伟达', 'OpenAI', 'Google', 'R1'] 
  },
  { 
    id: 'metaphysics', 
    label: '玄学 & 命理', 
    emoji: '🔮', 
    description: '星座运势、塔罗占卜与东方玄学',
    keywords: ['星座', '运势', '塔罗', '风水', '命理', '占星', '转运', '水逆', 'metaphysics', 'astrology', 'tarot', 'horoscope', 'zodiac', 'fortune', 'divination', '财运', '桃花'] 
  },
  { 
    id: 'money', 
    label: '副业 & 搞钱', 
    emoji: '💰', 
    description: '流量变现、商业思维与个体经济',
    keywords: ['红利', '变现', '甚至', '翻身', '认知', '搞钱', '私域', '流量', '运营', '暴涨', '风口', '自媒体', 'IP', '小红书', '带货', '千粉', '万粉'] 
  },
  { 
    id: 'career', 
    label: '职场 & 效率', 
    emoji: '💼', 
    description: '个人成长、管理方法论与效率工具',
    keywords: ['汇报', '晋升', '模版', '工具', '复盘', '面试', '规划', '管理', '提效', '笔记', '思维导图', '方法论', '跳槽', '简历', '裁员', '内卷'] 
  },
  { 
    id: 'life', 
    label: '生活 & 情感', 
    emoji: '❤️', 
    description: '社会观察、情感共鸣与生活方式',
    keywords: ['破防', '治愈', '独居', '恋爱', '焦虑', '情感', '心理', '关系', '吐槽', '瞬间', 'MBTI', '相亲', '结婚', '离婚', '极简', '装修'] 
  },
  { 
    id: 'custom', 
    label: '自定义赛道', 
    emoji: '⚙️', 
    description: '完全由您定义的关键词监控体系',
    keywords: [] //此项留空，后续从 SettingsStore 读取用户输入
  }
];
