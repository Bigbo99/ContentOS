#!/bin/bash

# ContentOS WordPress 本地部署脚本
echo "🚀 正在启动 WordPress 本地环境..."
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: Docker 未安装"
    echo "请访问 https://www.docker.com/get-started 安装 Docker"
    exit 1
fi

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    echo "❌ 错误: Docker 未运行"
    echo "请启动 Docker Desktop"
    exit 1
fi

echo "✅ Docker 已就绪"
echo ""

# 启动 Docker Compose
echo "📦 正在拉取镜像并启动容器..."
docker-compose up -d

# 等待服务启动
echo ""
echo "⏳ 等待服务启动..."
sleep 10

# 检查容器状态
echo ""
echo "📊 容器状态:"
docker-compose ps

echo ""
echo "✅ WordPress 本地环境已启动!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 访问地址:"
echo ""
echo "   🌐 WordPress 网站:"
echo "      http://localhost:8080"
echo ""
echo "   🗄️  phpMyAdmin (数据库管理):"
echo "      http://localhost:8081"
echo "      用户名: wordpress"
echo "      密码: wordpress"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 提示:"
echo "   • 首次访问需要完成 WordPress 安装向导"
echo "   • 建议管理员用户名: admin"
echo "   • 建议管理员密码: Admin@123456"
echo "   • 建议管理员邮箱: admin@localhost.com"
echo ""
echo "🛑 停止服务: ./stop-wordpress.sh"
echo "🔄 重启服务: docker-compose restart"
echo "📋 查看日志: docker-compose logs -f"
echo ""
