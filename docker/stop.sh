#!/bin/bash

# ContentOS WordPress Docker 停止脚本
# 用法: ./stop.sh [--clean]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   ContentOS WordPress Docker 停止脚本                      ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 检查参数
CLEAN_DATA=false
if [ "$1" == "--clean" ]; then
    CLEAN_DATA=true
    echo -e "${YELLOW}⚠️  警告: 将删除所有数据卷（WordPress 文件和数据库）${NC}"
    read -p "确定要继续吗？[y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}已取消${NC}"
        exit 0
    fi
fi

# 停止服务
echo -e "${YELLOW}停止 Docker 服务...${NC}"
if docker compose down 2>/dev/null || docker-compose down; then
    echo -e "${GREEN}✓ 服务已停止${NC}"
else
    echo -e "${RED}❌ 停止服务失败${NC}"
    exit 1
fi

# 清理数据卷
if [ "$CLEAN_DATA" = true ]; then
    echo -e "${YELLOW}清理数据卷...${NC}"
    docker volume rm contentos-wp-data contentos-db-data 2>/dev/null || true
    echo -e "${GREEN}✓ 数据卷已清理${NC}"
fi

echo ""
echo -e "${GREEN}✓ ContentOS WordPress 服务已停止${NC}"

if [ "$CLEAN_DATA" = false ]; then
    echo -e "${BLUE}提示: 数据卷已保留，下次启动时数据将保持不变${NC}"
    echo -e "${BLUE}      如需清除数据，请运行: ./stop.sh --clean${NC}"
fi
