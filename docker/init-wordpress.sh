#!/bin/bash

# ContentOS WordPress 初始化脚本
# 使用 WP-CLI 自动配置 WordPress 并生成应用密码
# 用法: ./init-wordpress.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   ContentOS WordPress 初始化脚本                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 加载环境变量
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ 未找到 .env 文件，请先运行 ./start.sh${NC}"
    exit 1
fi
source .env

# 检查容器是否运行
echo -e "${YELLOW}[1/6] 检查 WordPress 容器...${NC}"
if ! docker ps | grep -q "contentos-wordpress"; then
    echo -e "${RED}❌ WordPress 容器未运行，请先运行 ./start.sh${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 容器运行中${NC}"

# 等待 WordPress 完全就绪
echo -e "${YELLOW}[2/6] 等待 WordPress 数据库连接...${NC}"
for i in {1..30}; do
    if docker exec contentos-wordpress wp db check --allow-root 2>/dev/null; then
        echo -e "${GREEN}✓ 数据库连接正常${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ 数据库连接超时${NC}"
        exit 1
    fi
    echo -n "."
    sleep 2
done

# 检查是否已安装
echo -e "${YELLOW}[3/6] 检查 WordPress 安装状态...${NC}"
if docker exec contentos-wordpress wp core is-installed --allow-root 2>/dev/null; then
    echo -e "${GREEN}✓ WordPress 已安装${NC}"
    ALREADY_INSTALLED=true
else
    echo -e "${YELLOW}  WordPress 尚未安装，开始安装...${NC}"
    ALREADY_INSTALLED=false
fi

# 安装 WordPress
if [ "$ALREADY_INSTALLED" = false ]; then
    echo -e "${YELLOW}[4/6] 安装 WordPress...${NC}"
    docker exec contentos-wordpress wp core install \
        --url="${WP_URL:-http://localhost:8080}" \
        --title="${WP_TITLE:-ContentOS Blog}" \
        --admin_user="${WP_ADMIN_USER:-admin}" \
        --admin_password="${WP_ADMIN_PASSWORD:-ContentOS@2024}" \
        --admin_email="${WP_ADMIN_EMAIL:-admin@example.com}" \
        --locale="${WP_LOCALE:-zh_CN}" \
        --skip-email \
        --allow-root

    echo -e "${GREEN}✓ WordPress 安装完成${NC}"
else
    echo -e "${YELLOW}[4/6] 跳过安装（已安装）${NC}"
fi

# 配置 WordPress
echo -e "${YELLOW}[5/6] 配置 WordPress 设置...${NC}"

# 更新时区
docker exec contentos-wordpress wp option update timezone_string "Asia/Shanghai" --allow-root 2>/dev/null || true

# 更新永久链接结构（对 REST API 友好）
docker exec contentos-wordpress wp rewrite structure '/%postname%/' --allow-root 2>/dev/null || true
docker exec contentos-wordpress wp rewrite flush --allow-root 2>/dev/null || true

# 创建默认分类
echo -e "${CYAN}  创建默认分类...${NC}"
CATEGORIES=("科技资讯:tech" "AI人工智能:ai" "搞钱攻略:money" "职场进阶:career" "生活随笔:life" "玄学命理:metaphysics")

for cat in "${CATEGORIES[@]}"; do
    NAME="${cat%%:*}"
    SLUG="${cat##*:}"
    docker exec contentos-wordpress wp term create category "$NAME" --slug="$SLUG" --allow-root 2>/dev/null || true
done

echo -e "${GREEN}✓ 分类创建完成${NC}"

# 生成应用密码
echo -e "${YELLOW}[6/6] 生成应用密码...${NC}"

# 删除旧的应用密码（如果存在）
docker exec contentos-wordpress wp user application-password delete "${WP_ADMIN_USER:-admin}" "ContentOS" --allow-root 2>/dev/null || true

# 生成新的应用密码
APP_PASSWORD=$(docker exec contentos-wordpress wp user application-password create \
    "${WP_ADMIN_USER:-admin}" \
    "ContentOS" \
    --porcelain \
    --allow-root 2>/dev/null)

if [ -z "$APP_PASSWORD" ]; then
    echo -e "${RED}❌ 生成应用密码失败${NC}"
    echo -e "${YELLOW}请手动在 WordPress 后台生成应用密码:${NC}"
    echo -e "   1. 访问 ${WP_URL:-http://localhost:8080}/wp-admin/users.php"
    echo -e "   2. 点击用户名 → 编辑"
    echo -e "   3. 滚动到底部 → 应用密码"
    echo -e "   4. 输入名称 'ContentOS' → 添加新应用密码"
else
    echo -e "${GREEN}✓ 应用密码已生成${NC}"
fi

# 显示配置信息
echo ""
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║               🎉 WordPress 初始化完成！                    ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║                                                           ║"
echo "║  WordPress 后台:                                          ║"
echo "║  URL:      ${WP_URL:-http://localhost:8080}/wp-admin"
echo "║  用户名:   ${WP_ADMIN_USER:-admin}"
echo "║  密码:     ${WP_ADMIN_PASSWORD:-ContentOS@2024}"
echo "║                                                           ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║  ContentOS 配置信息:                                      ║"
echo "║                                                           ║"
echo "║  WordPress URL:  ${WP_URL:-http://localhost:8080}"
echo "║  用户名:         ${WP_ADMIN_USER:-admin}"
if [ -n "$APP_PASSWORD" ]; then
echo "║  应用密码:       ${APP_PASSWORD}"
fi
echo "║                                                           ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║  REST API 测试:                                           ║"
echo "║  curl ${WP_URL:-http://localhost:8080}/wp-json/contentos/v1/health"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 保存配置到文件
CONFIG_FILE="$SCRIPT_DIR/.contentos-config"
cat > "$CONFIG_FILE" << EOF
# ContentOS WordPress 配置
# 生成时间: $(date)

WP_URL=${WP_URL:-http://localhost:8080}
WP_USER=${WP_ADMIN_USER:-admin}
WP_APP_PASSWORD=${APP_PASSWORD}

# 在 ContentOS 设置页面使用以上信息配置 WordPress 连接
EOF

echo -e "${CYAN}配置信息已保存到: $CONFIG_FILE${NC}"
echo ""
echo -e "${YELLOW}下一步操作:${NC}"
echo -e "  1. 打开 ContentOS 应用"
echo -e "  2. 进入 设置 → CMS 连接"
echo -e "  3. 填入上述 WordPress URL、用户名、应用密码"
echo -e "  4. 点击 '验证连接' 测试"
