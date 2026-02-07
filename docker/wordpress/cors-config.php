<?php
/**
 * ContentOS CORS Configuration Plugin
 *
 * 这是一个 Must-Use Plugin (mu-plugin)，自动加载
 * 为 ContentOS 前端提供 CORS 跨域访问支持
 *
 * @package ContentOS
 * @version 1.0.0
 */

// 防止直接访问
if (!defined('ABSPATH')) {
    exit;
}

/**
 * 添加 CORS 头部
 */
function contentos_add_cors_headers() {
    // 允许的来源列表
    $allowed_origins = array(
        'http://localhost:3000',      // Vite 开发服务器
        'http://localhost:5173',      // Vite 默认端口
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://localhost:4173',      // Vite 预览服务器
    );

    // 获取请求来源
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

    // 检查来源是否在允许列表中
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
    }

    // 设置其他 CORS 头部
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
    header("Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With, X-WP-Nonce, ngrok-skip-browser-warning");
    header("Access-Control-Expose-Headers: X-WP-Total, X-WP-TotalPages, Link");
    header("Access-Control-Max-Age: 86400"); // 24 小时缓存预检结果
}

/**
 * 处理 OPTIONS 预检请求
 */
function contentos_handle_preflight() {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        contentos_add_cors_headers();
        status_header(200);
        exit();
    }
}

/**
 * 为 REST API 响应添加 CORS 头部
 */
function contentos_rest_cors_headers($response) {
    contentos_add_cors_headers();
    return $response;
}

/**
 * 在 WordPress 初始化时添加 CORS 支持
 */
function contentos_init_cors() {
    // 处理预检请求
    contentos_handle_preflight();

    // 为所有请求添加 CORS 头部
    contentos_add_cors_headers();
}

// 注册钩子
add_action('init', 'contentos_init_cors', 1);
add_filter('rest_pre_serve_request', 'contentos_rest_cors_headers', 10, 1);

/**
 * 确保 REST API 可用
 */
function contentos_ensure_rest_api() {
    // 确保 REST API 未被禁用
    add_filter('rest_enabled', '__return_true');
    add_filter('rest_jsonp_enabled', '__return_true');

    // 确保应用密码功能可用 (WordPress 5.6+)
    add_filter('wp_is_application_passwords_available', '__return_true');
}
add_action('init', 'contentos_ensure_rest_api');

/**
 * 添加自定义 REST API 端点用于健康检查
 */
function contentos_register_health_endpoint() {
    register_rest_route('contentos/v1', '/health', array(
        'methods'  => 'GET',
        'callback' => function() {
            return array(
                'status'    => 'ok',
                'timestamp' => current_time('mysql'),
                'wordpress' => get_bloginfo('version'),
                'php'       => phpversion(),
                'cors'      => 'enabled',
            );
        },
        'permission_callback' => '__return_true',
    ));
}
add_action('rest_api_init', 'contentos_register_health_endpoint');

/**
 * 允许上传更多媒体类型
 */
function contentos_allowed_mime_types($mimes) {
    // 添加 WebP 支持
    $mimes['webp'] = 'image/webp';
    // 添加 SVG 支持（谨慎使用）
    // $mimes['svg'] = 'image/svg+xml';
    return $mimes;
}
add_filter('upload_mimes', 'contentos_allowed_mime_types');

/**
 * 输出调试信息（仅在 WP_DEBUG 开启时）
 */
if (defined('WP_DEBUG') && WP_DEBUG) {
    error_log('[ContentOS CORS] Plugin loaded');
}
