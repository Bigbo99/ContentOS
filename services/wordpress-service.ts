import { Article, WPMediaItem } from '../types';
import { ErrorHandler } from '../utils/error-handler';

interface WordPressConfig {
  url: string;
  username: string;
  appPassword: string;
}

export const WordPressService = {
  /**
   * Helper to generate Auth Headers
   */
  getAuthHeaders(config: WordPressConfig): Record<string, string> {
      let cleanUrl = config.url.trim().replace(/[\s\r\n]/g, '').replace(/\/+$/, '');
      const cleanUsername = config.username.trim().replace(/[\r\n]/g, '');
      const cleanPassword = config.appPassword.trim().replace(/[\s\r\n]/g, '');

      if (!cleanUrl || !cleanUsername || !cleanPassword) {
        throw new Error("WordPress configuration is incomplete. Please check Settings.");
      }

      // Ensure Protocol
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = `https://${cleanUrl}`;
      }

      const safeBtoa = (str: string) => {
        try {
          return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
              (match, p1) => String.fromCharCode(parseInt(p1, 16))
          ));
        } catch (e) {
          return btoa(str);
        }
      };

      const auth = safeBtoa(`${cleanUsername}:${cleanPassword}`);
      
      return {
          'Authorization': `Basic ${auth}`,
          'ngrok-skip-browser-warning': 'true',
          'base_url': cleanUrl // Internal helper, not a header
      };
  },

  /**
   * Publishes an article to WordPress.
   */
  async publishArticle(article: Article, config: WordPressConfig): Promise<any> {
    const authData = this.getAuthHeaders(config);
    const baseUrl = authData['base_url'];
    delete authData['base_url']; // Remove from headers

    const postData = {
      title: article.title,
      content: article.content,
      status: 'draft', // Publish as draft for safety
      date: new Date().toISOString(),
      categories: article.wpCategoryId ? [parseInt(article.wpCategoryId)] : [],
      featured_media: article.coverImage ? 0 : undefined // We'd need to upload media first to get ID, simplified here
    };

    const endpoint = `${baseUrl}/wp-json/wp/v2/posts`;
    console.log(`[WordPress] Publishing directly to ${endpoint}...`);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                ...authData,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`WordPress Publish Failed (${response.status}): ${errorData.message || response.statusText}`);
        }

        return await response.json();
    } catch (error: any) {
        console.error("WP Publish Error:", error);

        if (error instanceof TypeError && error.message.includes('fetch')) {
            ErrorHandler.handleNetworkError(error);
            throw new Error("无法连接到 WordPress 服务器");
        }

        ErrorHandler.handleApiError(error, 'WordPress');
        throw error;
    }
  },

  /**
   * Deletes a post from WordPress (Permanently with force=true)
   */
  async deletePost(postId: number, config: WordPressConfig): Promise<boolean> {
      const authData = this.getAuthHeaders(config);
      const baseUrl = authData['base_url'];
      delete authData['base_url'];

      // Using ?force=true deletes permanently, skipping trash
      const endpoint = `${baseUrl}/wp-json/wp/v2/posts/${postId}?force=true`;

      try {
          const response = await fetch(endpoint, {
              method: 'DELETE',
              headers: {
                  ...authData,
                  'Content-Type': 'application/json'
              }
          });

          if (!response.ok) {
             const errorData = await response.json().catch(() => ({}));
             // 410 or 404 means already deleted
             if (response.status === 410 || response.status === 404) return true;
             throw new Error(`WordPress Delete Failed (${response.status}): ${errorData.message}`);
          }

          return true;
      } catch (error: any) {
          console.error("WP Delete Error:", error);
          throw error;
      }
  },

  /**
   * Uploads media to WordPress Media Library
   */
  async uploadMedia(file: File, config: WordPressConfig): Promise<WPMediaItem> {
      const authData = this.getAuthHeaders(config);
      const baseUrl = authData['base_url'];
      delete authData['base_url'];

      const endpoint = `${baseUrl}/wp-json/wp/v2/media`;

      try {
          // Verify we have a valid file
          if (!file) throw new Error("No file provided");

          const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                  ...authData,
                  'Content-Disposition': `attachment; filename="${file.name}"`,
                  'Content-Type': file.type
              },
              body: file
          });

          if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(`Media Upload Failed (${response.status}): ${errorData.message || response.statusText}`);
          }

          const data = await response.json();

          // Map WP response to WPMediaItem
          return {
              id: String(data.id),
              url: data.source_url,
              title: data.title?.rendered || file.name,
              mimeType: data.mime_type,
              date: data.date,
              dimensions: data.media_details ? `${data.media_details.width}x${data.media_details.height}` : undefined
          };

      } catch (error: any) {
          console.error("WP Media Upload Error:", error);
          throw error;
      }
  }
};