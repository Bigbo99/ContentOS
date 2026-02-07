
import { Article } from '../types';
import { formatForRedNote } from '../utils/formatter';

export interface XhsPayload {
  type: 'image' | 'video';
  title: string;
  desc: string;
  imageUrls: string[]; // 只存 URL
  topics: string[];
  isPrivate?: boolean;
}

export class XhsAdapter {
  /**
   * 准备发布数据 (同步操作，极快)
   */
  async preparePayload(article: Article): Promise<XhsPayload> {
    // 1. 标题
    let title = (article.title || '').trim();
    const titleChars = Array.from(title);
    if (titleChars.length > 20) {
      title = titleChars.slice(0, 19).join('') + '…';
    }

    // 2. 正文
    let desc = formatForRedNote(article);
    if (desc.length > 1000) {
      desc = desc.substring(0, 990) + '...';
    }

    // 3. 收集图片 URL (不下载)
    // 移除 4 张图片限制，允许全量下载
    const imageUrls: string[] = [];
    if (article.coverImage) imageUrls.push(article.coverImage);

    const parser = new DOMParser();
    const doc = parser.parseFromString(article.content || '', 'text/html');
    const contentImgs = Array.from(doc.querySelectorAll('img'));
    
    // Iterate through ALL images
    for (let i = 0; i < contentImgs.length; i++) {
      const src = contentImgs[i].getAttribute('src');
      if (src && src !== article.coverImage) {
        imageUrls.push(src);
      }
    }

    // 4. 话题
    const topics = (article.tags || []).map(t => t.replace(/^#/, ''));

    return {
      type: 'image',
      title,
      desc,
      imageUrls,
      topics,
      isPrivate: false
    };
  }

  /**
   * 发布流程
   */
  async publish(payload: XhsPayload): Promise<{ success: boolean; noteId?: string; error?: string }> {
    console.log('🚀 [XHS] 启动发布...');
    
    // 触发辅助功能
    await this.triggerManualAssist(payload);

    return {
      success: true,
      noteId: `manual_post_${Date.now()}`
    };
  }

  /**
   * 辅助功能：复制 + 下载
   */
  private async triggerManualAssist(payload: XhsPayload) {
    const fullText = `${payload.title}\n\n${payload.desc}\n\n${payload.topics.map(t=>`#${t}`).join(' ')}`;
    
    // =========================================================
    // 1. 简单粗暴的复制逻辑
    // =========================================================
    console.log("📋 [XHS] 尝试复制文案...");
    
    // 尝试标准API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullText)
        .then(() => {
          // 成功了！
          alert("✅ 文案已复制成功！\n(图片正在后台下载，请留意浏览器下载提示)");
        })
        .catch((err) => {
          // 失败了 (Safari 拦截) -> 直接弹窗，别犹豫
          console.warn("⚠️ 标准复制被拦截，弹出手动框:", err);
          window.prompt("👇 Safari 安全限制，请全选下方文字并按 Cmd+C 复制：", fullText);
        });
    } else {
       // 不支持 API -> 直接弹窗
       window.prompt("👇 请全选下方文字并按 Cmd+C 复制：", fullText);
    }

    // =========================================================
    // 2. 后台下载图片
    // =========================================================
    if (payload.imageUrls.length > 0) {
      console.log(`📥 [XHS] 开始后台下载 ${payload.imageUrls.length} 张图片...`);
      
      // 延迟 500ms 开始下载，确保弹窗已经出来了，不抢占资源
      setTimeout(async () => {
        for (let i = 0; i < payload.imageUrls.length; i++) {
            const url = payload.imageUrls[i];
            try {
               const file = await this.robustDownload(url, `xhs_${i + 1}.png`);
               this.triggerBrowserDownload(file, `xhs_${i + 1}.png`);
               // 间隔 800ms，防止浏览器认为你在发起攻击
               await new Promise(r => setTimeout(r, 800));
            } catch (e) {
               console.error(`❌ 图片 ${i+1} 下载失败`, e);
            }
        }
      }, 500);
    }
  }

  // --- 工具函数保持不变 ---

  private triggerBrowserDownload(file: File, filename: string) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 1000);
  }

  private async robustDownload(url: string, filename: string): Promise<File> {
     // 优先 Weserv
     try {
       const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=png`;
       const res = await fetch(proxyUrl);
       if(!res.ok) throw new Error('Weserv failed');
       const blob = await res.blob();
       return new File([blob], filename, { type: 'image/png' });
     } catch(e) {
       // 备用 Corsproxy
       try {
          const proxyUrl = `https://corsproxy.io/?` + encodeURIComponent(url);
          const res = await fetch(proxyUrl);
          if(!res.ok) throw new Error('Corsproxy failed');
          const blob = await res.blob();
          return new File([blob], filename, { type: 'image/png' });
       } catch(e2) {
          // 最后直连
          const res = await fetch(url);
          const blob = await res.blob();
          return new File([blob], filename, { type: 'image/png' });
       }
     }
  }
}
