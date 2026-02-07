#!/bin/bash

# ContentOS WordPress 停止脚本
echo "🛑 正在停止 WordPress 本地环境..."

docker-compose down

echo ""
echo "✅ WordPress 环境已停止"
echo ""
echo "💡 提示:"
echo "   • 数据已保存在 Docker 卷中"
echo "   • 再次运行 ./start-wordpress.sh 即可恢复"
echo "   • 完全删除数据: docker-compose down -v"
echo ""
