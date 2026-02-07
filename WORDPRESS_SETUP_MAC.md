# 🍎 WordPress 本地部署指南 (macOS 版本)

## 📋 前置准备

### 1. 安装 Docker Desktop for Mac

如果还没有安装 Docker Desktop：

1. 访问 [Docker 官网](https://www.docker.com/products/docker-desktop/)
2. 下载 **Docker Desktop for Mac**
3. 打开下载的 `.dmg` 文件
4. 将 Docker 图标拖到应用程序文件夹
5. 打开 **应用程序** 文件夹，双击 **Docker** 启动
6. 等待 Docker 图标出现在菜单栏（状态为 "Docker Desktop is running"）

### 2. 验证 Docker 安装

打开终端（Terminal.app 或 iTerm），运行：

```bash
docker --version
docker-compose --version
```

应该看到版本信息，例如：
```
Docker version 24.0.x
docker-compose version 2.x.x
```

## 🚀 快速启动 WordPress

### 方法 1：使用启动脚本（推荐）

在终端中执行以下命令：

```bash
# 进入项目目录
cd "/Users/shan/Desktop/ContentOS 2"

# 运行启动脚本
./start-wordpress.sh
```

### 方法 2：使用 Docker Compose

```bash
# 进入项目目录
cd "/Users/shan/Desktop/ContentOS 2"

# 启动服务
docker-compose up -d
```

## 📺 启动成功后的访问地址

启动完成后，在浏览器中访问：

| 服务 | 地址 | 用途 |
|------|------|------|
| **WordPress** | http://localhost:8080 | 网站前台和后台 |
| **phpMyAdmin** | http://localhost:8081 | 数据库管理 |

## ⚙️ WordPress 初始设置

### 第一步：完成安装向导

1. 浏览器打开 `http://localhost:8080`
2. 选择语言：**简体中文**
3. 点击"现在就开始"
4. 填写站点信息：

```
站点标题: ContentOS 测试站点
用户名: admin
密码: Admin@123456
邮箱: admin@example.com
```

5. 点击"安装 WordPress"

### 第二步：配置 REST API

登录 WordPress 后台 (`http://localhost:8080/wp-admin`)：

#### A. 生成应用程序密码

1. 左侧菜单：**用户 → 个人资料**
2. 滚动到页面底部
3. 找到 **应用程序密码** 部分
4. 在"新应用程序密码名称"输入：`ContentOS`
5. 点击"添加新应用程序密码"
6. **重要：立即复制显示的密码**（格式：`xxxx xxxx xxxx xxxx xxxx xxxx`）

#### B. 启用固定链接

1. 左侧菜单：**设置 → 固定链接**
2. 选择 **文章名**
3. 点击"保存更改"

### 第三步：在 ContentOS 中配置

打开 ContentOS 应用，进入设置页面，填写：

```
WordPress URL: http://localhost:8080
用户名: admin
应用程序密码: [粘贴刚才复制的密码，保留空格]
作者 ID: 1
```

点击"连接测试"验证配置是否成功。

## 🛠️ 常用命令（在终端中运行）

### 查看运行状态
```bash
cd "/Users/shan/Desktop/ContentOS 2"
docker-compose ps
```

### 查看日志
```bash
# 查看所有日志
docker-compose logs -f

# 只看 WordPress 日志
docker-compose logs -f wordpress

# 只看数据库日志
docker-compose logs -f db
```

### 停止服务
```bash
# 使用脚本
./stop-wordpress.sh

# 或手动停止
docker-compose down
```

### 重启服务
```bash
docker-compose restart
```

### 完全清理（删除所有数据）
```bash
docker-compose down -v
```

## 🔧 故障排查

### 问题 1: "Docker 未运行"

**解决方法**：
1. 打开 Spotlight（⌘ + Space）
2. 输入 "Docker" 并回车
3. 等待 Docker Desktop 启动（菜单栏出现 Docker 图标）
4. 重新运行启动脚本

### 问题 2: 端口 8080 被占用

**检查端口占用**：
```bash
lsof -i :8080
```

**解决方法 A - 杀掉占用进程**：
```bash
# 找到 PID（进程 ID）
lsof -i :8080

# 杀掉进程（将 <PID> 替换为实际的进程 ID）
kill -9 <PID>
```

**解决方法 B - 修改端口**：

编辑 `docker-compose.yml`，修改端口映射：

```yaml
wordpress:
  ports:
    - "8082:80"  # 改为 8082 或其他可用端口

phpmyadmin:
  ports:
    - "8083:80"  # 改为 8083 或其他可用端口
```

### 问题 3: 无法连接到数据库

**解决方法**：
```bash
# 等待 30 秒让数据库完全启动
sleep 30

# 重启 WordPress 容器
docker-compose restart wordpress
```

### 问题 4: "权限被拒绝"

**解决方法**：
```bash
# 给脚本添加执行权限
chmod +x start-wordpress.sh stop-wordpress.sh

# 再次运行
./start-wordpress.sh
```

## 📊 系统要求

- **macOS**: 10.15 或更高版本
- **内存**: 至少 4GB RAM（推荐 8GB）
- **磁盘**: 至少 2GB 可用空间
- **Docker**: 最新版本的 Docker Desktop for Mac

## 🔐 默认凭据

### WordPress 后台
- URL: `http://localhost:8080/wp-admin`
- 用户名: `admin`
- 密码: `Admin@123456`（建议修改）

### 数据库（phpMyAdmin）
- URL: `http://localhost:8081`
- 服务器: `db`
- 用户名: `wordpress`
- 密码: `wordpress`

### MySQL Root
- 用户名: `root`
- 密码: `rootpassword`

## 🎯 快速测试

启动成功后，您可以：

1. ✅ 访问 `http://localhost:8080` 查看 WordPress 首页
2. ✅ 登录后台 `http://localhost:8080/wp-admin`
3. ✅ 创建一篇测试文章
4. ✅ 在 ContentOS 中测试发布功能

## 💾 数据备份

### 备份整个 WordPress
```bash
# 备份数据库
docker exec contentos_mysql mysqldump -u wordpress -pwordpress wordpress > wordpress_backup_$(date +%Y%m%d).sql

# 备份文件
docker run --rm --volumes-from contentos_wordpress -v $(pwd):/backup ubuntu tar czf /backup/wordpress_files_$(date +%Y%m%d).tar.gz /var/www/html
```

### 恢复备份
```bash
# 恢复数据库
docker exec -i contentos_mysql mysql -u wordpress -pwordpress wordpress < wordpress_backup_20250107.sql

# 恢复文件
docker run --rm --volumes-from contentos_wordpress -v $(pwd):/backup ubuntu bash -c "cd /var/www/html && tar xzf /backup/wordpress_files_20250107.tar.gz --strip 1"
```

## 🎨 优化建议

### 1. 安装推荐插件

在 WordPress 后台安装以下插件：

- **Classic Editor**: 经典编辑器（可选）
- **WP REST API Controller**: REST API 管理
- **Code Snippets**: 自定义代码片段

### 2. 配置媒体设置

1. **设置 → 媒体**
2. 调整图片尺寸：
   - 缩略图: 300 × 300
   - 中等尺寸: 800 × 800
   - 大尺寸: 1200 × 1200

### 3. 提升性能

在 `docker-compose.yml` 中添加内存限制：

```yaml
wordpress:
  deploy:
    resources:
      limits:
        memory: 512M
```

## 📱 Mac 快捷方式

创建快捷方式到 Dock：

```bash
# 创建启动脚本的别名
echo 'alias wp-start="cd \"/Users/shan/Desktop/ContentOS 2\" && ./start-wordpress.sh"' >> ~/.zshrc
echo 'alias wp-stop="cd \"/Users/shan/Desktop/ContentOS 2\" && ./stop-wordpress.sh"' >> ~/.zshrc

# 重新加载配置
source ~/.zshrc
```

之后在任何目录都可以运行：
```bash
wp-start  # 启动 WordPress
wp-stop   # 停止 WordPress
```

## 🆘 获取帮助

遇到问题？检查以下内容：

1. ✅ Docker Desktop 是否在运行
2. ✅ 端口 8080 和 8081 是否被占用
3. ✅ 查看容器日志：`docker-compose logs -f`
4. ✅ 重启 Docker Desktop
5. ✅ 检查系统资源（内存、磁盘）

## 📚 相关资源

- [Docker Desktop for Mac 文档](https://docs.docker.com/desktop/mac/)
- [WordPress 官方文档](https://wordpress.org/support/)
- [WordPress REST API](https://developer.wordpress.org/rest-api/)

---

**🎉 祝您使用愉快！有问题随时查看日志或重启服务。**
