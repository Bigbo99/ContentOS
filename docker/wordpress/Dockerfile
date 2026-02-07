# ContentOS WordPress Docker 镜像
# 基于官方 WordPress 镜像，添加 WP-CLI 和优化配置

FROM wordpress:6.4-php8.2-apache

# 设置工作目录
WORKDIR /var/www/html

# 安装系统依赖和 WP-CLI
RUN apt-get update && apt-get install -y \
    curl \
    less \
    mariadb-client \
    && rm -rf /var/lib/apt/lists/* \
    # 安装 WP-CLI
    && curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar \
    && chmod +x wp-cli.phar \
    && mv wp-cli.phar /usr/local/bin/wp

# 创建 mu-plugins 目录（用于 CORS 配置）
RUN mkdir -p /var/www/html/wp-content/mu-plugins

# 配置 Apache 允许 .htaccess 覆盖
RUN a2enmod rewrite headers

# 设置 Apache 配置以支持 REST API 和 CORS
RUN echo '<Directory /var/www/html>\n\
    Options Indexes FollowSymLinks\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>\n\
\n\
# 启用压缩\n\
<IfModule mod_deflate.c>\n\
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript application/json\n\
</IfModule>' > /etc/apache2/conf-available/wordpress.conf \
    && a2enconf wordpress

# 设置文件权限
RUN chown -R www-data:www-data /var/www/html

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# 暴露端口
EXPOSE 80

# 使用官方入口点
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["apache2-foreground"]
