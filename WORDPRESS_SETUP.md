# 🐳 WordPress 本地部署指南

本指南将帮您使用 Docker 快速部署一个本地 WordPress 网站用于 ContentOS 测试。

## 📋 前置要求

- ✅ 已安装 Docker Desktop ([下载地址](https://www.docker.com/get-started))
- ✅ Docker Desktop 正在运行
- ✅ 至少 2GB 可用磁盘空间

## 🚀 快速启动

### 方法一：使用启动脚本（推荐）

```bash
# 在项目根目录下运行
./start-wordpress.sh
```

### 方法二：使用 Docker Compose

```bash
docker-compose up -d
```

## 🌐 访问地址

启动成功后，您可以访问：

| 服务 | 地址 | 说明 |
|------|------|------|
| **WordPress 网站** | http://localhost:8080 | 主网站入口 |
| **phpMyAdmin** | http://localhost:8081 | 数据库管理工具 |

## 🔧 WordPress 初始配置

### 1. 完成安装向导

首次访问 `http://localhost:8080` 时，按照以下步骤完成安装：

1. **选择语言**：中文（简体）
2. **站点信息**：
   - 站点标题：`ContentOS 测试站点`
   - 用户名：`admin`
   - 密码：`Admin@123456`（或使用更强密码）
   - 邮箱：`admin@localhost.com`
3. 点击"安装 WordPress"

### 2. 配置 REST API

登录 WordPress 后台 (`http://localhost:8080/wp-admin`)：

#### 启用应用程序密码

1. 进入 **用户 → 个人资料**
2. 滚动到底部找到 **应用程序密码** 部分
3. 输入名称：`ContentOS`
4. 点击"添加新应用程序密码"
5. **复制生成的密码**（格式类似：`xxxx xxxx xxxx xxxx xxxx xxxx`）

#### 启用永久链接（重要！）

1. 进入 **设置 → 固定链接**
2. 选择 **文章名** 或 **自定义结构**: `/%postname%/`
3. 点击"保存更改"

### 3. 在 ContentOS 中配置

打开 ContentOS 应用，进入 **设置页面**：

```
WordPress URL: http://localhost:8080
用户名: admin
应用程序密码: [粘贴刚才复制的密码，保留空格]
作者 ID: 1
```

点击"连接测试"验证配置。

## 🗄️ 数据库访问

如需直接管理数据库，访问 phpMyAdmin：

- URL: `http://localhost:8081`
- 服务器: `db`
- 用户名: `wordpress`
- 密码: `wordpress`

## 🛠️ 常用命令

### 查看服务状态
```bash
docker-compose ps
```

### 查看日志
```bash
# 查看所有日志
docker-compose logs -f

# 只查看 WordPress 日志
docker-compose logs -f wordpress

# 只查看数据库日志
docker-compose logs -f db
```

### 重启服务
```bash
docker-compose restart
```

### 停止服务
```bash
# 使用脚本
./stop-wordpress.sh

# 或使用 Docker Compose
docker-compose down
```

### 完全清理（删除所有数据）
```bash
docker-compose down -v
```

### 备份数据库
```bash
docker exec contentos_mysql mysqldump -u wordpress -pwordpress wordpress > backup.sql
```

### 恢复数据库
```bash
docker exec -i contentos_mysql mysql -u wordpress -pwordpress wordpress < backup.sql
```

## 📂 数据持久化

所有数据都存储在 Docker 卷中：

- `db_data`: MySQL 数据库文件
- `wordpress_data`: WordPress 文件（主题、插件、上传文件等）

即使停止容器，数据也会保留。只有运行 `docker-compose down -v` 才会删除数据。

## 🔍 故障排查

### WordPress 无法访问

1. 检查 Docker 是否运行：
   ```bash
   docker info
   ```

2. 检查容器状态：
   ```bash
   docker-compose ps
   ```

3. 查看日志：
   ```bash
   docker-compose logs wordpress
   ```

### 端口冲突

如果端口 8080 或 8081 已被占用，修改 `docker-compose.yml`：

```yaml
wordpress:
  ports:
    - "8082:80"  # 改为 8082 或其他端口

phpmyadmin:
  ports:
    - "8083:80"  # 改为 8083 或其他端口
```

### 数据库连接失败

等待 30 秒让数据库完全启动，然后重启 WordPress：

```bash
docker-compose restart wordpress
```

## 📊 系统资源

Docker 容器资源占用：

- MySQL: ~400MB RAM
- WordPress: ~200MB RAM
- phpMyAdmin: ~100MB RAM
- 总计: ~700MB RAM

## 🔐 安全提示

⚠️ **本配置仅用于本地开发测试**，请勿用于生产环境：

- 使用了简单的密码
- 开启了调试模式
- 未配置 SSL/HTTPS
- 数据库对外暴露

## 🎯 测试 ContentOS 功能

现在您可以测试以下功能：

1. ✅ 文章发布到 WordPress
2. ✅ 分类管理
3. ✅ 媒体上传
4. ✅ REST API 集成
5. ✅ 自动发布流程

## 📞 获取帮助

如遇问题，请检查：

1. Docker Desktop 是否正常运行
2. 端口是否被占用
3. 容器日志中的错误信息
4. WordPress 安装向导是否完成

---

**快速链接**：
- 📖 [WordPress 文档](https://wordpress.org/support/)
- 🐳 [Docker 文档](https://docs.docker.com/)
- 🔌 [WordPress REST API](https://developer.wordpress.org/rest-api/)
