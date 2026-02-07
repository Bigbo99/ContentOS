/**
 * 简单的本地代理服务器 (ES Module 版本)
 * 用于绕过 CORS 限制，直接抓取真实热榜数据
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

const PORT = 3002;

const server = http.createServer((req, res) => {
  // 允许跨域
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const requestUrl = new URL(req.url, `http://localhost:${PORT}`);
  const targetUrl = requestUrl.searchParams.get('url');

  if (!targetUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing url parameter' }));
    return;
  }

  console.log(`[Proxy] 📡 Fetching: ${targetUrl}`);

  try {
    const parsedUrl = new URL(targetUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Referer': `${parsedUrl.protocol}//${parsedUrl.hostname}/`
      }
    };

    const proxyReq = protocol.request(options, (proxyRes) => {
      console.log(`[Proxy] ✅ Response: ${proxyRes.statusCode} from ${parsedUrl.hostname}`);

      // 转发响应头
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'] || 'text/html',
        'Access-Control-Allow-Origin': '*'
      });

      // 转发响应体
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
      console.error(`[Proxy] ❌ Error fetching ${targetUrl}:`, error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    });

    proxyReq.end();
  } catch (error) {
    console.error(`[Proxy] ❌ Invalid URL ${targetUrl}:`, error.message);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid URL' }));
  }
});

server.listen(PORT, () => {
  console.log('='.repeat(70));
  console.log(`🚀  本地代理服务器已启动！`);
  console.log(`📍  监听地址: http://localhost:${PORT}`);
  console.log(`📖  使用方法: http://localhost:${PORT}/proxy?url=YOUR_URL`);
  console.log('='.repeat(70));
  console.log('');
  console.log('✨  支持抓取的数据源：');
  console.log(`   🔥 微博热搜: http://localhost:${PORT}/proxy?url=https://s.weibo.com/top/summary`);
  console.log(`   📚 知乎热榜: http://localhost:${PORT}/proxy?url=https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=50`);
  console.log(`   🔍 百度热搜: http://localhost:${PORT}/proxy?url=https://top.baidu.com/board?tab=realtime`);
  console.log('');
  console.log('💡  提示: 保持此终端窗口打开，代理服务器将持续运行');
  console.log('⏹️   停止服务: 按 Ctrl+C');
  console.log('='.repeat(70));
  console.log('');
  console.log('⏳  等待请求中...\n');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n\n👋 代理服务器已停止');
  process.exit(0);
});
