#!/bin/bash

# ContentOS WordPress Docker 启动脚本
# 用法: ./start.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   ContentOS WordPress Docker 启动脚本                      ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 检查 Docker 是否安装
echo -e "${YELLOW}[1/5] 检查 Docker 环境...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装，请先安装 Docker Desktop${NC}"
    echo "   下载地址: https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker 未运行，请启动 Docker Desktop${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker 环境正常${NC}"

# 检查 docker-compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose 未安装${NC}"
    exit 1
fi

# 检查 .env 文件
echo -e "${YELLOW}[2/5] 检查配置文件...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}   未找到 .env 文件，从模板创建...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ 已创建 .env 文件，请根据需要修改配置${NC}"
else
    echo -e "${GREEN}✓ 配置文件已存在${NC}"
fi

# 加载环境变量
source .env

# 构建镜像
echo -e "${YELLOW}[3/5] 构建 Docker 镜像...${NC}"
if docker compose build --quiet 2>/dev/null || docker-compose build --quiet; then
    echo -e "${GREEN}✓ 镜像构建完成${NC}"
else
    echo -e "${RED}❌ 镜像构建失败${NC}"
    exit 1
fi

# 启动服务
echo -e "${YELLOW}[4/5] 启动 Docker 服务...${NC}"
if docker compose up -d 2>/dev/null || docker-compose up -d; then
    echo -e "${GREEN}✓ 服务启动成功${NC}"
else
    echo -e "${RED}❌ 服务启动失败${NC}"
    exit 1
fi

# 等待 WordPress 就绪
echo -e "${YELLOW}[5/5] 等待 WordPress 启动...${NC}"
echo -n "   "
for i in {1..30}; do
    if curl -s "http://localhost:${WP_PORT:-8080}/wp-admin/install.php" > /dev/null 2>&1 || \
       curl -s "http://localhost:${WP_PORT:-8080}/" > /dev/null 2>&1; then
        echo ""
        echo -e "${GREEN}✓ WordPress 已就绪${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# 显示访问信息
echo ""
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                   🎉 启动成功！                            ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║                                                           ║"
echo "║  WordPress:    http://localhost:${WP_PORT:-8080}                      ║"
echo "║  phpMyAdmin:   http://localhost:${PMA_PORT:-8081}                      ║"
echo "║                                                           ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║  下一步:                                                   ║"
echo "║  1. 运行 ./init-wordpress.sh 初始化 WordPress              ║"
echo "║  2. 在 ContentOS 设置中配置 WordPress 连接                 ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 显示容器状态
echo -e "${BLUE}容器状态:${NC}"
docker compose ps 2>/dev/null || docker-compose ps
