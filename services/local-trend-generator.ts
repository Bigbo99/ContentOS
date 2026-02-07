/**
 * 增强的本地数据生成器
 * 当所有远程 API 都失败时,生成高质量的本地模拟数据
 */

import { Trend } from '../types';

export const LocalTrendGenerator = {
  /**
   * 生成基于实际热点模式的本地数据
   * 这些数据虽然不是实时的,但基于真实热点规律生成
   */
  generateSmartTrends(sourceName: string, count: number = 30): Trend[] {
    const now = new Date();
    const trendPatterns = this.getTrendPatterns(sourceName);

    return trendPatterns.slice(0, count).map((pattern, index) => {
      const pubTime = new Date(now.getTime() - pattern.hoursAgo * 3600000);
      const baseHeat = 99 - (index * 2);

      return {
        id: `local_${sourceName}_${index}_${Date.now()}`,
        topic: pattern.title,
        source: `${sourceName} (本地数据)`,
        heatScore: Math.max(20, baseHeat),
        summary: pattern.desc,
        timestamp: this.formatTime(pattern.hoursAgo),
        createdAt: pubTime.toISOString(),
        viewCount: Math.floor(Math.random() * 100000) + 50000,
        likeCount: Math.floor(Math.random() * 5000) + 1000,
        commentCount: Math.floor(Math.random() * 2000) + 500,
        isCommercial: pattern.commercial || false,
        forecast: index < 10 ? 'rising' : index < 20 ? 'peak' : 'fading',
        matchedKeywords: [],
        isRelevant: false,
        link: pattern.link || ''
      };
    });
  },

  /**
   * 根据数据源获取对应的趋势模式
   */
  getTrendPatterns(sourceName: string): Array<{title: string, desc: string, hoursAgo: number, commercial?: boolean, link?: string}> {
    // 微博热搜模式
    if (sourceName.includes('微博')) {
      return [
        { title: 'DeepSeek-R1 开源大模型引发全球关注', desc: '国产AI大模型在推理能力上实现突破', hoursAgo: 0.5, link: 'https://weibo.com' },
        { title: '春节档电影预售破纪录', desc: '多部国产影片竞争激烈', hoursAgo: 1, link: 'https://weibo.com' },
        { title: '新能源汽车降价潮来袭', desc: '特斯拉、小鹏等品牌相继宣布降价', hoursAgo: 2, link: 'https://weibo.com' },
        { title: '考研成绩即将公布', desc: '2025年考研国家线预测', hoursAgo: 3, link: 'https://weibo.com' },
        { title: 'ChatGPT 推出视频生成功能', desc: 'OpenAI发布最新Sora模型', hoursAgo: 4, link: 'https://weibo.com' },
        { title: '北方多地迎来降雪', desc: '气象台发布寒潮预警', hoursAgo: 5, link: 'https://weibo.com' },
        { title: '春运客流量创新高', desc: '铁路部门增开临时列车', hoursAgo: 6, link: 'https://weibo.com' },
        { title: 'iPhone 17 Pro曝光', desc: '苹果秋季新品提前预告', hoursAgo: 7, link: 'https://weibo.com' },
        { title: 'A股三大指数集体上涨', desc: '科技板块领涨两市', hoursAgo: 8, link: 'https://weibo.com' },
        { title: '比特币突破10万美元', desc: '加密货币市场再创新高', hoursAgo: 9, link: 'https://weibo.com' }
      ];
    }

    // 知乎热榜模式
    if (sourceName.includes('知乎')) {
      return [
        { title: '如何看待 DeepSeek 开源模型超越 GPT-4？', desc: '国产AI的崛起对行业意味着什么', hoursAgo: 1, link: 'https://zhihu.com' },
        { title: '为什么很多程序员不愿意转管理岗？', desc: '技术路线 vs 管理路线的选择', hoursAgo: 2, link: 'https://zhihu.com' },
        { title: '2025年普通人还有哪些搞钱机会？', desc: '副业赛道深度分析', hoursAgo: 3, link: 'https://zhihu.com' },
        { title: '考研400分是什么水平？', desc: '各科目备考经验分享', hoursAgo: 4, link: 'https://zhihu.com' },
        { title: '为什么现在的年轻人越来越不想结婚？', desc: '婚恋观念变迁探讨', hoursAgo: 5, link: 'https://zhihu.com' },
        { title: '新能源车到底值不值得买？', desc: '从使用成本角度全面分析', hoursAgo: 6, link: 'https://zhihu.com' },
        { title: 'ChatGPT 会取代程序员吗？', desc: 'AI对软件开发行业的影响', hoursAgo: 7, link: 'https://zhihu.com' },
        { title: '如何用 AI 提升个人工作效率？', desc: '实用工具和方法论', hoursAgo: 8, link: 'https://zhihu.com' },
        { title: '北上广深哪个城市更适合年轻人发展？', desc: '一线城市对比分析', hoursAgo: 9, link: 'https://zhihu.com' },
        { title: '为什么很多人学Python却找不到工作？', desc: '技术学习与就业市场的错配', hoursAgo: 10, link: 'https://zhihu.com' }
      ];
    }

    // 抖音热榜模式
    if (sourceName.includes('抖音')) {
      return [
        { title: '春节回家带什么礼物合适', desc: '过年送礼攻略大全', hoursAgo: 0.5, link: 'https://douyin.com' },
        { title: 'AI绘画教程：5分钟生成惊艳作品', desc: '新手也能轻松上手', hoursAgo: 1, link: 'https://douyin.com' },
        { title: '00后整顿职场名场面', desc: '年轻一代的职场观', hoursAgo: 2, link: 'https://douyin.com' },
        { title: '减肥食谱：一周瘦10斤', desc: '健康饮食计划分享', hoursAgo: 3, link: 'https://douyin.com' },
        { title: '手机拍照技巧大公开', desc: '普通人也能拍出大片', hoursAgo: 4, link: 'https://douyin.com' },
        { title: '租房避坑指南', desc: '这些雷区千万别踩', hoursAgo: 5, link: 'https://douyin.com' },
        { title: '副业月入过万的秘诀', desc: '普通人的搞钱方法', hoursAgo: 6, link: 'https://douyin.com' },
        { title: '护肤品平替大盘点', desc: '便宜又好用的国货推荐', hoursAgo: 7, link: 'https://douyin.com' },
        { title: '考公上岸经验分享', desc: '备考三个月成功上岸', hoursAgo: 8, link: 'https://douyin.com' },
        { title: '宠物狗训练教程', desc: '让狗狗听话的小技巧', hoursAgo: 9, link: 'https://douyin.com' }
      ];
    }

    // 百度热搜模式
    if (sourceName.includes('百度')) {
      return [
        { title: 'DeepSeek AI模型', desc: '国产开源AI引发关注', hoursAgo: 0.5, link: 'https://baidu.com' },
        { title: '2025春节放假安排', desc: '官方假期时间公布', hoursAgo: 1, link: 'https://baidu.com' },
        { title: '新冠变异株最新消息', desc: '专家建议继续做好防护', hoursAgo: 2, link: 'https://baidu.com' },
        { title: '油价调整最新消息', desc: '本轮油价或将下调', hoursAgo: 3, link: 'https://baidu.com' },
        { title: '考研成绩查询时间', desc: '各省市查分入口汇总', hoursAgo: 4, link: 'https://baidu.com' },
        { title: '房贷利率下调', desc: '多家银行下调存量房贷利率', hoursAgo: 5, link: 'https://baidu.com' },
        { title: '春运抢票攻略', desc: '12306候补购票技巧', hoursAgo: 6, link: 'https://baidu.com' },
        { title: 'ChatGPT国内镜像', desc: '免费使用方法汇总', hoursAgo: 7, link: 'https://baidu.com' },
        { title: '今日股市行情', desc: 'A股三大指数走势分析', hoursAgo: 8, link: 'https://baidu.com' },
        { title: '天气预报一周', desc: '全国各地天气趋势', hoursAgo: 9, link: 'https://baidu.com' }
      ];
    }

    // 小红书热搜模式
    if (sourceName.includes('小红书')) {
      return [
        { title: '春节穿搭灵感｜过年回家这样穿', desc: '显瘦显高的穿搭公式', hoursAgo: 0.5, link: 'https://xiaohongshu.com' },
        { title: 'AI绘画变现｜月入2万的副业', desc: '从零开始教你做AI插画', hoursAgo: 1, link: 'https://xiaohongshu.com' },
        { title: '护肤品空瓶记｜用完不回购的雷品', desc: '帮你避开这些坑', hoursAgo: 2, link: 'https://xiaohongshu.com' },
        { title: '考研上岸｜二战逆袭985', desc: '备考心路历程分享', hoursAgo: 3, link: 'https://xiaohongshu.com' },
        { title: '租房改造｜3000元打造温馨小窝', desc: '出租屋也能很精致', hoursAgo: 4, link: 'https://xiaohongshu.com' },
        { title: '理财攻略｜月薪5000如何存钱', desc: '强制储蓄法则', hoursAgo: 5, link: 'https://xiaohongshu.com' },
        { title: '手机摄影｜iPhone拍照技巧', desc: '不用修图也能出大片', hoursAgo: 6, link: 'https://xiaohongshu.com' },
        { title: '减肥食谱｜一周瘦5斤', desc: '低卡美食做法分享', hoursAgo: 7, link: 'https://xiaohongshu.com' },
        { title: '职场穿搭｜通勤outfit灵感', desc: '优雅又不失个性', hoursAgo: 8, link: 'https://xiaohongshu.com' },
        { title: '日语学习｜零基础到N2', desc: '自学日语的方法论', hoursAgo: 9, link: 'https://xiaohongshu.com' }
      ];
    }

    // Hacker News 模式
    if (sourceName.includes('Hacker News')) {
      return [
        { title: 'DeepSeek-R1: Open-source reasoning model from China', desc: 'Challenges GPT-4 on mathematical reasoning', hoursAgo: 1, link: 'https://news.ycombinator.com' },
        { title: 'Show HN: I built a CLI tool for managing Kubernetes clusters', desc: 'Feedback welcome', hoursAgo: 2, link: 'https://news.ycombinator.com' },
        { title: 'Google lays off hundreds in engineering teams', desc: 'Cost-cutting measures continue', hoursAgo: 3, link: 'https://news.ycombinator.com' },
        { title: 'PostgreSQL 17 Beta Released', desc: 'New features and performance improvements', hoursAgo: 4, link: 'https://news.ycombinator.com' },
        { title: 'Ask HN: What are you working on this week?', desc: 'Weekly thread for side projects', hoursAgo: 5, link: 'https://news.ycombinator.com' },
        { title: 'The rise of AI-generated code: Friend or foe?', desc: 'Impact on software development', hoursAgo: 6, link: 'https://news.ycombinator.com' },
        { title: 'Rust in Production: Lessons from 2 years at Scale', desc: 'Performance and reliability insights', hoursAgo: 7, link: 'https://news.ycombinator.com' },
        { title: 'Y Combinator W25 Batch Companies', desc: 'Latest startup cohort revealed', hoursAgo: 8, link: 'https://news.ycombinator.com' },
        { title: 'OpenAI releases new video generation model', desc: 'Sora becomes publicly available', hoursAgo: 9, link: 'https://news.ycombinator.com' },
        { title: 'Ask HN: Best resources for learning system design?', desc: 'Interview preparation tips', hoursAgo: 10, link: 'https://news.ycombinator.com' }
      ];
    }

    // Reddit Technology 模式
    if (sourceName.includes('Reddit')) {
      return [
        { title: 'DeepSeek AI model goes viral - What this means for tech', desc: 'Discussion on open-source AI', hoursAgo: 1, link: 'https://reddit.com/r/technology' },
        { title: 'Google announces massive layoffs in engineering', desc: 'Impact on tech industry', hoursAgo: 2, link: 'https://reddit.com/r/technology' },
        { title: 'Apple Vision Pro 2 rumors surface', desc: 'Expected features and release date', hoursAgo: 3, link: 'https://reddit.com/r/technology' },
        { title: 'Bitcoin hits new all-time high', desc: 'Crypto market analysis', hoursAgo: 4, link: 'https://reddit.com/r/technology' },
        { title: 'Tesla announces new affordable EV model', desc: '$25k electric car coming 2026', hoursAgo: 5, link: 'https://reddit.com/r/technology' },
        { title: 'Windows 12 leaked screenshots', desc: 'Major UI overhaul confirmed', hoursAgo: 6, link: 'https://reddit.com/r/technology' },
        { title: 'SpaceX Starship completes orbital flight', desc: 'Another milestone for SpaceX', hoursAgo: 7, link: 'https://reddit.com/r/technology' },
        { title: 'New quantum computer breaks encryption', desc: 'Security implications discussed', hoursAgo: 8, link: 'https://reddit.com/r/technology' },
        { title: 'Meta launches AI assistant for WhatsApp', desc: 'ChatGPT competitor integrated', hoursAgo: 9, link: 'https://reddit.com/r/technology' },
        { title: 'GitHub Copilot now free for students', desc: 'Microsoft expands AI coding access', hoursAgo: 10, link: 'https://reddit.com/r/technology' }
      ];
    }

    // GitHub Trending 模式
    if (sourceName.includes('GitHub')) {
      return [
        { title: 'deepseek-ai/DeepSeek-R1', desc: 'Open-source reasoning model with breakthrough performance', hoursAgo: 0.5, link: 'https://github.com/deepseek-ai/DeepSeek-R1' },
        { title: 'microsoft/autogen', desc: 'Framework for building LLM applications', hoursAgo: 1, link: 'https://github.com/microsoft/autogen' },
        { title: 'vercel/next.js', desc: 'The React Framework for the Web', hoursAgo: 2, link: 'https://github.com/vercel/next.js' },
        { title: 'rust-lang/rust', desc: 'Systems programming language', hoursAgo: 3, link: 'https://github.com/rust-lang/rust' },
        { title: 'openai/gpt-4', desc: 'OpenAI GPT-4 documentation', hoursAgo: 4, link: 'https://github.com/openai' },
        { title: 'kubernetes/kubernetes', desc: 'Container orchestration platform', hoursAgo: 5, link: 'https://github.com/kubernetes/kubernetes' },
        { title: 'tailwindlabs/tailwindcss', desc: 'Utility-first CSS framework', hoursAgo: 6, link: 'https://github.com/tailwindlabs/tailwindcss' },
        { title: 'sveltejs/svelte', desc: 'Cybernetically enhanced web apps', hoursAgo: 7, link: 'https://github.com/sveltejs/svelte' },
        { title: 'pytorch/pytorch', desc: 'Machine learning framework', hoursAgo: 8, link: 'https://github.com/pytorch/pytorch' },
        { title: 'denoland/deno', desc: 'Modern JavaScript runtime', hoursAgo: 9, link: 'https://github.com/denoland/deno' }
      ];
    }

    // 默认通用模式
    return [
      { title: 'AI技术突破引发行业关注', desc: '人工智能领域最新进展', hoursAgo: 1, link: '' },
      { title: '科技公司裁员潮持续', desc: '行业调整进行中', hoursAgo: 2, link: '' },
      { title: '新款智能设备发布', desc: '搭载最新AI芯片', hoursAgo: 3, link: '' },
      { title: '开源项目获得关注', desc: '社区活跃度攀升', hoursAgo: 4, link: '' },
      { title: '编程语言排行榜更新', desc: 'Python继续领跑', hoursAgo: 5, link: '' }
    ];
  },

  /**
   * 格式化时间显示
   */
  formatTime(hoursAgo: number): string {
    if (hoursAgo < 1) return '刚刚';
    if (hoursAgo < 24) return `${Math.floor(hoursAgo)}小时前`;
    const days = Math.floor(hoursAgo / 24);
    if (days < 7) return `${days}天前`;
    return '一周前';
  }
};
