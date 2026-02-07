<div align="center">
</div>

# ContentOS - AI 内容自动化平台

企业级 AI-to-WordPress 自动化平台，实现从热点发现到内容发布的全流程自动化。

## 功能特性

- 🔥 **趋势雷达** - 多源热点数据抓取与智能过滤
- 🤖 **AI 内容生成** - 基于神经营销学的智能文案生成
- 📝 **多渠道发布** - 支持 WordPress、微信公众号、小红书
- 📊 **SEO 优化** - 实时 SEO 评分与优化建议

## 快速开始

### 前置要求

- Node.js 18+
- Docker Desktop（用于 WordPress）

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

```bash
# Pexels 图片搜索 API Key (https://www.pexels.com/api/)
VITE_PEXELS_API_KEY=your_pexels_api_key_here

# TopHub 热点数据 API Token
VITE_TOPHUB_TOKEN=your_tophub_token_here
```

> **注意**: DeepSeek API Key 在应用内的 **设置** 页面配置。

### 3. 启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:3000 运行。

---

## WordPress Docker 部署

ContentOS 需要 WordPress 后端提供 REST API 支持。我们提供了完整的 Docker 部署方案。

### 架构图

```
┌─────────────────────────────────────────────────────┐
│                Docker Network                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌───────────┐   ┌───────────┐   ┌───────────────┐ │
│  │ WordPress │──▶│  MySQL    │   │  phpMyAdmin   │ │
│  │  :8080    │   │  :3306    │   │    :8081      │ │
│  └───────────┘   └───────────┘   └───────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
         ▲
         │ REST API
         │
┌─────────────────┐
│   ContentOS     │
│  localhost:3000 │
└─────────────────┘
```

### 快速部署

```bash
# 1. 进入 docker 目录
cd docker

# 2. 启动服务（首次运行会自动创建 .env 文件）
./start.sh

# 3. 初始化 WordPress（安装 + 生成应用密码）
./init-wordpress.sh
```

### 访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| WordPress | http://localhost:8080 | WordPress 站点 |
| WordPress 后台 | http://localhost:8080/wp-admin | 管理后台 |
| phpMyAdmin | http://localhost:8081 | 数据库管理 |

### 默认账户

- **WordPress 管理员**
  - 用户名: `admin`
  - 密码: `ContentOS@2024`

- **数据库 (phpMyAdmin)**
  - 用户名: `root`
  - 密码: 见 `.env` 文件

### 配置 ContentOS 连接

1. 打开 ContentOS 应用
2. 进入 **设置** → **CMS 连接**
3. 填入配置：
   - **WordPress URL**: `http://localhost:8080`
   - **用户名**: `admin`
   - **应用密码**: 运行 `init-wordpress.sh` 后显示的密码
4. 点击 **验证连接**

### Docker 命令参考

```bash
# 启动服务
./start.sh

# 停止服务（保留数据）
./stop.sh

# 停止服务并清除所有数据
./stop.sh --clean

# 查看日志
docker compose logs -f wordpress

# 进入 WordPress 容器
docker exec -it contentos-wordpress bash

# 使用 WP-CLI
docker exec contentos-wordpress wp --allow-root <command>
```

### 自定义配置

编辑 `docker/.env` 文件可自定义：

```bash
# 端口配置
WP_PORT=8080
PMA_PORT=8081

# WordPress 配置
WP_URL=http://localhost:8080
WP_TITLE=我的博客
WP_ADMIN_USER=admin
WP_ADMIN_PASSWORD=your_password
WP_ADMIN_EMAIL=your@email.com
WP_LOCALE=zh_CN

# 数据库配置
MYSQL_ROOT_PASSWORD=your_root_password
MYSQL_DATABASE=wordpress
MYSQL_USER=wordpress
MYSQL_PASSWORD=your_db_password
```

### 故障排除

#### WordPress 无法访问

```bash
# 检查容器状态
docker compose ps

# 查看 WordPress 日志
docker compose logs wordpress
```

#### 数据库连接失败

```bash
# 检查 MySQL 状态
docker compose logs mysql

# 等待 MySQL 完全启动后重试
./stop.sh && ./start.sh
```

#### CORS 错误

确保 ContentOS 运行在以下端口之一：
- `localhost:3000`
- `localhost:5173`
- `localhost:4173`
- `127.0.0.1:3000`

如需添加其他来源，编辑 `docker/wordpress/cors-config.php`。

#### 应用密码不工作

1. 确保使用的是**应用密码**而非登录密码
2. 重新生成应用密码：
   ```bash
   docker exec contentos-wordpress wp user application-password delete admin "ContentOS" --allow-root
   docker exec contentos-wordpress wp user application-password create admin "ContentOS" --porcelain --allow-root
   ```

---

## API 集成

### WordPress REST API

ContentOS 使用以下 WordPress REST API 端点：

| 端点 | 方法 | 用途 |
|------|------|------|
| `/wp-json/wp/v2/posts` | POST | 创建文章 |
| `/wp-json/wp/v2/posts/{id}` | DELETE | 删除文章 |
| `/wp-json/wp/v2/media` | POST | 上传媒体 |
| `/wp-json/wp/v2/categories` | GET | 获取分类 |
| `/wp-json/contentos/v1/health` | GET | 健康检查 |

### 健康检查

```bash
curl http://localhost:8080/wp-json/contentos/v1/health
```

响应示例：
```json
{
  "status": "ok",
  "timestamp": "2024-01-01 12:00:00",
  "wordpress": "6.4",
  "php": "8.2.0",
  "cors": "enabled"
}
```

---

## 项目结构

```
ContentOS/
├── App.tsx                  # 主应用入口
├── index.tsx                # React DOM 渲染
├── types.ts                 # TypeScript 类型定义
├── pages/                   # 页面组件
│   ├── TrendDiscovery.tsx   # 趋势雷达
│   ├── ArticleEditor.tsx    # 文章编辑器
│   ├── ContentLibrary.tsx   # 内容文库
│   └── Settings.tsx         # 系统设置
├── services/                # 业务逻辑
│   ├── wordpress-service.ts # WordPress API 集成
│   ├── ai-service.ts        # AI 内容生成
│   └── trend-service.ts     # 趋势数据抓取
├── store/                   # Zustand 状态管理
├── components/              # React 组件
├── utils/                   # 工具函数
└── docker/                  # WordPress Docker 部署
    ├── docker-compose.yml   # Docker 编排配置
    ├── start.sh             # 启动脚本
    ├── stop.sh              # 停止脚本
    ├── init-wordpress.sh    # 初始化脚本
    └── wordpress/           # WordPress 自定义配置
        ├── Dockerfile       # 自定义镜像
        ├── cors-config.php  # CORS 插件
        └── uploads.ini      # PHP 配置
```

---

## 技术栈

- **前端**: React 19, TypeScript, Zustand, Vite
- **AI**: Google Gemini, DeepSeek
- **后端**: WordPress REST API
- **部署**: Docker, MySQL 8.0

---

## 许可证

MIT License
