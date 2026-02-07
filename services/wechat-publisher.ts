import { Article } from '../types';
import { formatForWeChat } from '../utils/formatter';

export interface WeChatConfig {
  appId: string;
  appSecret: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  errcode?: number;
  errmsg?: string;
}

interface UploadResponse {
  media_id: string;
  url: string; // The internal WeChat URL for use in articles
  errcode?: number;
  errmsg?: string;
}

interface DraftResponse {
  media_id: string;
  errcode?: number;
  errmsg?: string;
}

export class WeChatPublisher {
  private config: WeChatConfig;
  
  // Static cache for token to share across instances
  private static accessToken: string = '';
  private static tokenExpiresAt: number = 0;

  constructor(config: WeChatConfig) {
    this.config = config;
  }

  /**
   * 1. Token Management
   * Fetches or returns a valid access token.
   * WeChat tokens expire in 7200 seconds. We buffer by 5 minutes.
   */
  public async getAccessToken(): Promise<string> {
    const now = Date.now();
    
    // Return cached token if valid (with 5-minute buffer)
    if (WeChatPublisher.accessToken && now < WeChatPublisher.tokenExpiresAt - 300000) {
      return WeChatPublisher.accessToken;
    }

    // NOTE: In a browser environment, this call will fail CORS unless proxied or browser security is disabled.
    // The previous corsproxy.io solution has been removed per request.
    const apiUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.config.appId}&secret=${this.config.appSecret}`;

    try {
      const response = await fetch(apiUrl);
      const data: TokenResponse = await response.json();

      if (data.errcode && data.errcode !== 0) {
        throw new Error(`WeChat Token Error [${data.errcode}]: ${data.errmsg}`);
      }

      WeChatPublisher.accessToken = data.access_token;
      // expires_in is in seconds, convert to ms
      WeChatPublisher.tokenExpiresAt = now + (data.expires_in * 1000);
      
      return WeChatPublisher.accessToken;
    } catch (error: any) {
      console.error('Failed to get WeChat access token', error);
      throw new Error(error.message || 'Network error while fetching WeChat token');
    }
  }

  /**
   * 2. Image Upload
   * Downloads an external image and uploads it to WeChat Material API.
   * Returns media_id (for cover) and url (for inline content).
   */
  public async uploadImage(imageUrl: string): Promise<{ media_id: string; url: string }> {
    const token = await this.getAccessToken();
    const apiUrl = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=image`;

    try {
      // 1. Fetch the external image as a Blob
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error(`Failed to download source image: ${imageUrl}`);
      const imageBlob = await imgRes.blob();

      // 2. Prepare FormData
      const formData = new FormData();
      // Filename is required by WeChat API
      formData.append('media', imageBlob, 'uploaded_image.jpg');

      // 3. Upload to WeChat
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });
      
      const data: UploadResponse = await response.json();

      if (data.errcode && data.errcode !== 0) {
        throw new Error(`WeChat Upload Error [${data.errcode}]: ${data.errmsg}`);
      }

      return { media_id: data.media_id, url: data.url };
    } catch (error: any) {
      console.error('Failed to upload image to WeChat', error);
      throw error;
    }
  }

  /**
   * 3. Content Processing
   * - Inlines CSS styles (using utility).
   * - Downloads all images in the HTML, uploads them to WeChat, and replaces src with WeChat internal URLs.
   */
  public async processHtmlForWeChat(rawHtml: string): Promise<string> {
    // Step A: Format HTML with inline styles
    const styledHtml = formatForWeChat(rawHtml, 'tech');

    // Step B: Parse HTML to manipulate DOM
    const parser = new DOMParser();
    const doc = parser.parseFromString(styledHtml, 'text/html');
    const images = Array.from(doc.querySelectorAll('img'));

    // Step C: Process images in parallel
    // We filter out images that are already WeChat URLs to allow re-processing
    const pendingImages = images.filter(img => {
      const src = img.getAttribute('src');
      return src && !src.includes('mmbiz.qpic.cn');
    });

    if (pendingImages.length === 0) {
      return doc.body.innerHTML;
    }

    console.log(`Processing ${pendingImages.length} images for WeChat...`);

    // Map each image to an upload promise
    const uploadPromises = pendingImages.map(async (img) => {
      const src = img.getAttribute('src');
      if (!src) return;

      try {
        const { url: wechatUrl } = await this.uploadImage(src);
        img.setAttribute('src', wechatUrl);
        // Clean up other attributes that might interfere with WeChat rendering
        img.removeAttribute('srcset');
        img.removeAttribute('width');
        img.removeAttribute('height');
        // Add WeChat specific style for responsiveness
        img.setAttribute('style', 'max-width: 100% !important; height: auto !important; display: block; margin: 20px auto;');
      } catch (err) {
        console.warn(`Failed to process image ${src}:`, err);
        // Keep original src as fallback
      }
    });

    await Promise.all(uploadPromises);

    return doc.body.innerHTML;
  }

  /**
   * 4. Draft Creation
   * Publishes the article to the WeChat "Draft Box" (草稿箱).
   */
  public async createDraft(article: Article, coverImageUrl?: string): Promise<string> {
    const token = await this.getAccessToken();
    const apiUrl = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${token}`;

    // 1. Handle Cover Image
    let thumbMediaId = '';
    const imageToUpload = coverImageUrl || article.coverImage;
    if (imageToUpload) {
      try {
        const { media_id } = await this.uploadImage(imageToUpload);
        thumbMediaId = media_id;
      } catch (e) {
        console.warn('Cover image upload failed, proceeding without cover.', e);
      }
    }

    // 2. Process Content
    const processedContent = await this.processHtmlForWeChat(article.content);

    // 3. Construct Payload
    const payload = {
      articles: [
        {
          title: article.title,
          author: 'ContentOS AI',
          digest: article.reasoningLog ? article.reasoningLog.slice(0, 50) : '', // Optional summary
          content: processedContent,
          content_source_url: '', // Optional: original link
          thumb_media_id: thumbMediaId,
          need_open_comment: 1,
          only_fans_can_comment: 0
        }
      ]
    };

    // 4. Send Request
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data: DraftResponse = await response.json();

      if (data.errcode && data.errcode !== 0) {
        throw new Error(`WeChat Draft Create Error [${data.errcode}]: ${data.errmsg}`);
      }

      return data.media_id; // Success
    } catch (error: any) {
      console.error('Failed to create WeChat draft', error);
      throw error;
    }
  }
}