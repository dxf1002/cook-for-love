@echo off
chcp 65001 >nul
title 为爱下厨 - 点菜小程序

echo ========================================
echo   为爱下厨 - 点菜小程序 本地启动
echo ========================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 22+
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] 检查 Node.js 版本...
node -v
echo.

if not exist "node_modules" (
    echo [2/3] 首次启动，正在安装依赖...
    echo 这可能需要几分钟，请耐心等待...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [错误] 依赖安装失败，请检查网络连接后重试
        pause
        exit /b 1
    )
    echo.
    echo 依赖安装完成！
) else (
    echo [2/3] 依赖已安装，跳过 npm install
)

echo.
echo [3/3] 启动开发服务器...
echo   - 前端地址: http://localhost:8080
echo   - 后端地址: http://localhost:3000
echo   - 数据库:   本地 SQLite (data/app.db)
echo.
echo 按 Ctrl+C 停止服务
echo ========================================
echo.

call npm run dev

pause
